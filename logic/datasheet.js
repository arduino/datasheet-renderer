import { existsSync, readFileSync, statSync } from 'fs';
import { load } from 'js-yaml';
import fm from 'front-matter';
import findParentDir from 'find-parent-dir';
import { marked } from 'marked';
import * as path from 'path';

export class Datasheet {

    constructor(contentFilePath){
        this.contentFilePath = contentFilePath;
    }

    set rawData(data){
        this._rawData = data;
    }

    get rawData(){
        if(this._rawData) return this._rawData;

        if(!this.contentFilePath || !existsSync(this.contentFilePath)){
            return null;
        }
        this._rawData = readFileSync(this.contentFilePath, 'utf8').toString();
        return this._rawData;
    }

    // Get the content of the .md datasheet file without the frontmatter
    get markdown(){    
        return fm(this.rawData).body
    }

    get html(){
        return marked(this.markdown)
    }

    get metadata(){
        if(this._metaData) return this._metaData;
        if(!this.rawData) return null;
        try {            
            const content = fm(this.rawData);
            this._metaData = content.attributes;
            return this._metaData;
        } catch (error) {
            console.log("💣 Error occurred while parsing", this.contentFilePath);
            console.log(error);
            return null;
        }
    }

    get identifier(){
        return this.metadata.identifier?.replace(/\s+/g, "-")
    }

    get modifiedDate() {
        try {
            const stats = statSync(this.contentFilePath);
            return this.formatDate(stats.mtime);
        } catch (error) {
            console.log(error);
            return null;
        }    
    }

    /**
     * Returns the hardware revision with dots removed and spaces replaced with dashes.
     */
    get normalizedHardwareRevision() {
        if(!this.metadata.hardwareRevision) return null;
        let revision = this.metadata.hardwareRevision.replace(" ", "-");
        revision = revision.replace(".", "");
        return revision;
    }

    // helper function to get current date-string in desired format for datasheet document 
    formatDate(aDate) {
        let dd = aDate.getDate()
        let mm = aDate.getMonth() + 1
        let yyyy = aDate.getFullYear()
        if (dd < 10) dd = '0' + dd
        if (mm < 10) mm = '0' + mm
        return dd + '/' + mm + '/' + yyyy
    }

    /**
     * Constructs the final build path taking into account the previous documentation flag.
     * @param {String} targetPath A relative path starting from parent directory of the
     * @param {String} datasheetsDirectoryName Name of the directory in which the datasheet markdown file is stored
     * @param {String} previousDocumentationFolder Name of the directoy in which previous revisions of the datasheet shall be stored
     * datasheets which defines where to store the datasheet PDF.
     * @returns 
     */
     constructTargetBuildPath(targetPath, datasheetsDirectoryName = "datasheets", previousDocumentationFolder = null){        
        const sourceFilePath = path.dirname(this.contentFilePath);
        let datasheetsParentDirectory = findParentDir.sync(sourceFilePath, datasheetsDirectoryName);
        
        // Check for legacy foldername
        if (!datasheetsParentDirectory) {
            datasheetsDirectoryName = "datasheet";
            datasheetsParentDirectory = findParentDir.sync(sourceFilePath, 'datasheet');
        }

        if(!datasheetsParentDirectory){
            throw `❌ Datasheet ${sourceFilePath} doesn't have a valid parent directory.`
        }

        let relativeBuildPath = `${datasheetsParentDirectory}${datasheetsDirectoryName}/${targetPath}`;
        
        // Older revisions are stored in a different folder
        if(this.metadata.isPreviousRevision) {
            if(!previousDocumentationFolder){
                throw "❌ 'previousDocumentationFolder' property is not defined"
            }
            relativeBuildPath += "/" + previousDocumentationFolder;
        }
        return relativeBuildPath;
    }
}

export default { Datasheet }