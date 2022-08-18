import fileHelper from '../lib/file-helper.cjs';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { unlinkSync, realpathSync, existsSync } from 'fs';
import * as path from 'path';
import { HTMLRenderer } from './html-renderer.js';
import { PDFManager } from './pdf-manager.js';
import { WebResourceProvider } from './webresouce-provider.js';
import { Datasheet } from './datasheet.js';

export class DatasheetRenderer {
    constructor(configFilePath, datasheetsSourcePath = null){
        this.webResourceProvider = new WebResourceProvider();
        this.pdfManager = new PDFManager();
        this.config = load(readFileSync(configFilePath, 'utf8'));
        this.datasheetsSourcePath = datasheetsSourcePath ?? this.config.defaultSourcePath;
    }

    get datasheets(){
        if(this._datasheets) return this._datasheets;
        let datasheetFiles = fileHelper.findAllFiles(this.datasheetsSourcePath, this.config.datasheetFile, this.config.excludePatterns);
        let datasheets = datasheetFiles.map((path) => {
            return new Datasheet(path);
        });
        datasheets = datasheets.filter((datasheet) => {
            const isDraft = datasheet.metadata?.isDraft;
            if(isDraft){
                console.log(`ℹ️ Skipping datasheet draft ${datasheet.contentFilePath}`);            
            }
            return !isDraft;
        });
        this._datasheets = datasheets;
        return this._datasheets;
    }


    /**
     * Generates PDF files from the supplied markdown files
     * @param {*} targetPath The path where the PDF files will be saved
     * @returns A list of objects containing the rendered datasheets. 
     * The object has the properties "datasheet" and "pdfPath".
     */
    async generatePDFsFromMarkdownFiles(targetPath = null){
        let targetBuildPath = targetPath ?? this.config.relativeBuildPath;

        for(let datasheet of this.datasheets){
            this.webResourceProvider.addResource(datasheet);
        }

        this.webResourceProvider.begin();
        await this.pdfManager.begin();
        let tasks = [];
        
        for(let datasheet of this.datasheets){
            console.log(`ℹ️ Generating datasheet for ${datasheet.contentFilePath} ...`);
            tasks.push(this.generatePDFFromMarkdown(datasheet, targetBuildPath).catch( error => {
                console.error(error);
                return null;
            }));
        }
        return Promise.all(tasks).then(async (results) => {
            const renderedDatasheets = results.filter((result) => result != null);
            this.webResourceProvider.end();
            await this.pdfManager.end();
            return renderedDatasheets;
        });
    }

    // main function that coordinates the creation of a datasheet pdf from the .md datasheet source file
    async generatePDFFromMarkdown(datasheet, relativeTargetPath){
        
        let contentListMap = []    
        const identifier = datasheet.identifier
        const { hardwareRevision} = datasheet.metadata
        
        const relativeBuildPath = datasheet.constructTargetBuildPath(relativeTargetPath);    
        console.log("Rendering into build path " + relativeBuildPath)
        fileHelper.createDirectoryIfNecessary(relativeBuildPath)
        
        const htmlRenderer = new HTMLRenderer(datasheet);
        contentListMap = htmlRenderer.enumerateHeadings()
        if(identifier) htmlRenderer.addSubtitle(this.config.subtitle, this.config.identifierPrefix, identifier);
        
        const htmlFilename = `${(Math.random() + 1).toString(36).substring(7)}-datasheet.html`;    
        const datasheetHTMLTargetPath = `${realpathSync(path.dirname(datasheet.contentFilePath))}/${htmlFilename}`
        htmlRenderer.build()
        
        try {
            htmlRenderer.write(datasheetHTMLTargetPath)    
        } catch (error) {
            throw `❌ Couldn't write HTML file ${datasheetHTMLTargetPath}. ${error}`;
        }
        // console.debug("Completed MD to HTML \t--> \tstep 1 of 4")
        
        const identifierWithRevision = hardwareRevision ? `${identifier}-${datasheet.normalizedHardwareRevision.toLowerCase()}` : identifier;
        const datasheetPDFName = identifierWithRevision + this.config.datasheetSuffix
        const pdfTargetPath = path.resolve(`${relativeBuildPath}/${datasheetPDFName}`)

        const htmlFileURL = this.webResourceProvider.resourceURL(datasheet, htmlFilename)
        // console.debug("Prepare PDF \t\t--> \tstep 2 of 4")
        await this.pdfManager.createPDFFromURL(htmlFileURL, htmlRenderer, pdfTargetPath)

        // re-import the created pdf file to calculate page-numbers for table of content 
        // console.debug("Calculate page numbers \t--> \tstep 3 of 4")
        contentListMap = await this.pdfManager.reverseEngineerPageNumbers(contentListMap, pdfTargetPath)	
        htmlRenderer.updatePageNumberInTableOfContents(contentListMap)
        htmlRenderer.write(datasheetHTMLTargetPath)	

        // console.debug("Finalize PDF \t\t--> \tstep 4 of 4")
        // create new final pdf document from updated html file with page-numbers
        await this.pdfManager.createPDFFromURL(htmlFileURL, htmlRenderer, pdfTargetPath)
        

        if(existsSync(pdfTargetPath)){
            console.log("👌 Datasheet saved at: " + pdfTargetPath)
        } else {
            throw "❌ Datasheet couldn't be created at: " + pdfTargetPath
        }
        
        unlinkSync(datasheetHTMLTargetPath)
        return { "datasheet": datasheet, "pdfPath": pdfTargetPath }
    }
}