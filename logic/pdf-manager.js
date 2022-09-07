/**
 * If the 'pdf-parser' module doesn't work, there is another one to be tried out:
 * https://www.npmjs.com/package/pdfreader
 */
import parser from 'pdf-parser';
import { readFileSync } from 'fs';
import puppeteer from 'puppeteer';

export class PDFManager {

    constructor(assetsPath){
        this._assetsPath = assetsPath;
    }

    async begin(){
        console.log("ℹ️ Launching Puppeteer...");
        const options = ['--disable-setuid-sandbox', '--no-sandbox'];
        this.browser = await puppeteer.launch({ headless: true, timeout: 60000, args: options });
    }

    async end(){
        if(!this.browser) return;
        await this.browser.close();
        this.browser = null;
    }

    // helper function to read temporary html file to create pdf document
    async createPDFFromURL(url, htmlRenderer, targetPath){
        let browserLaunchedAutomatically = false;

        if(!this.browser){
            await this.begin();
            browserLaunchedAutomatically = true;
        }
        
        const page = await this.browser.newPage();
        page.setDefaultNavigationTimeout(60000);

        // console.log(`Loading ${url}...`)
        let errorOccurred = false;

        try {
            const result = await page.goto(url, {waitUntil: 'networkidle0'});            
            if (result.status() === 404) {
                console.error('404 returned for ' + url);
                errorOccurred = true;
            }
        } catch (error) {
            console.error(`Failed to navigate to ${url}. ${error}`);
            errorOccurred = true;
        }
    
        if(!errorOccurred){
            const properties = this.getPDFProperties(htmlRenderer);
            properties.path = targetPath;
            // console.log(`Creating PDF ${properties.path}...`)
            await page.pdf(properties);
        }
        page.close();
        if(browserLaunchedAutomatically) await this.end();
        
        return !errorOccurred;
    }

    // HACK: to retrieve correct page numbers the pdf file is created twice the first time to calculate on what page
    // a specific content section ends up and the second time to update the table of contents with that specific number
    async reverseEngineerPageNumbers(contentList, pdfPath){
        /* Let's reverse the headings list as we go through the pages from
        back to front (to avoid matches in the TOC) and it's more likely that the last headings are on later pages */
        let remainingHeadings = contentList.map((data) => {
            return data.id;
        }).reverse();

        if(contentList.length == 0){
            console.warn("😬 Content list doesn't contain any entries.");
        }

        const _self = this;
        
        return new Promise(function(resolve, reject) {        
            parser.pdf2json(pdfPath, function (error, pdf) {
                if(error != null){
                    console.error(error);
                    reject(error);
                }else{
                    let sortedPages = pdf.pages.sort( (a,b) => {
                        return a.pageId - b.pageId;
                    });
        
                    for(let i = sortedPages.length - 1; i >= 0; --i){
                        const page = sortedPages[i];
        
                        for(const heading of remainingHeadings){
                            for(const textElement of page.texts){
                                const normalizedText = _self.normalizeString(textElement.text);
                                
                                if(normalizedText == heading){
                                    const pageNumber = page.pageId + 1;
                                    //console.log(heading + " is on page " + pageNumber + " out of " + pdf.pages.length)
                                    
                                    let contentItem = contentList.find(obj => {
                                        return obj.pageNumber == 0 && obj.id === heading;
                                    })
                                    // Update page number with the new calculated page number
                                    if(contentItem){
                                        contentItem.pageNumber = pageNumber;
                                        remainingHeadings = remainingHeadings.filter(item => item !== heading)
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    for(const heading of remainingHeadings){
                        console.warn(`😬 Heading '${heading}' was not found in document!`)
                    }
                    resolve(contentList);
                }
            });
        });
    }

    //PRIVATE Methods

    // Get pdf conversion options, injects site headers + footers and defines layout
    getPDFProperties(htmlRenderer){
        const datasheet = htmlRenderer.datasheet;
        // read svg logo data
        const specificLogoSVGdata = readFileSync(`${this._assetsPath}/${datasheet.metadata.type}-logo.svg`)    
        const revisionString = datasheet.metadata.hardwareRevision ? ` (${datasheet.metadata.hardwareRevision})`: ''; 

        let options = {
            format: 'A4', 
            path: '',
            margin: {          
                "right": "20mm",
                "left": "20mm",
                "top": "36mm",
                "bottom": "28mm"
            },
            displayHeaderFooter: true,
            printBackground: true
        }

        options.footerTemplate = `
        <div class="footer">
            <div class="pagination"><span class="pageNumber"></span> / <span class="totalPages"></span></div>
            <div class="product-name-footer">${datasheet.metadata.title}<span class="product-variant"> ${datasheet.metadata.variant ?? ''}</span>${revisionString}</div>
            <div class="modified-date">Modified: ${datasheet.modifiedDate}</div>
        </div>                    
        `;

        options.headerTemplate = `
        <style>${htmlRenderer.rawCSS}</style>
        <div class="header">
            <div class="logo-header">${specificLogoSVGdata}</div>
            <div class="header-title">
                ${datasheet.metadata.title}<br />
                <span class="product-variant">${datasheet.metadata.variant ?? ''}</span>
            </div>
        </div>
        `;

        return options
    }

    /**
     * Removes encoded special characters from the text.
     * @param {*} text 
     * @returns 
     */
    normalizeString(text){
        text = text.replace(/\t+/g, " ")
        text = text.replace(/\n+/g, " ")
        // text = text.replace(/[^a-zA-Z0-9. /]/g, "")
        // text = text.replace(/  +/g, " ")
        return text
    }

}

export default { PDFManager }