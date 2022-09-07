import jsdom from 'jsdom';
import { writeFileSync, existsSync, readFileSync } from 'fs';

export class HTMLRenderer {
    constructor(datasheet, styleSheetsPath){
        this._datasheet = datasheet;
        this._styleSheetsPath = styleSheetsPath;
    }

    get datasheet(){
        return this._datasheet;
    }

    get dom(){
        if(this._dom) return this._dom;
        const htmlContent = this._datasheet.html
        this._dom = new jsdom.JSDOM(htmlContent)
        return this._dom;
    }

    get rawCSS(){
        return this.getRawCSSForType(this._datasheet.metadata.type)
    }

    addCSS(rawCss){
        let style = this.dom.window.document.createElement("style")
        style.appendChild(this.dom.window.document.createTextNode(rawCss))
        this.dom.window.document.head.appendChild(style)        
    }

    addSubtitle(subtitle, label, identifier){
        let subtitleElement = this.dom.window.document.createElement("div")    
        subtitleElement.innerHTML = `${subtitle}<br />${label}: ${identifier}`
        subtitleElement.classList.add("subtitle")
        this.dom.window.document.body.prepend(subtitleElement)
    }

    enumerateHeadings(){
        let tableOfContentsMap = []
        // count heading elements to create proper table of contents
        let contentIndex = { H2:0, H3:0, H4:0, H5:0, H6:0 }
    
        // add content list section after the "contents" title
        let contentTitle = this.dom.window.document.getElementById("contents")
        let tableOfContentsDiv = this.dom.window.document.createElement("div")
        tableOfContentsDiv.setAttribute("id", "table-of-contents")
        this.addNodeAfter(contentTitle, tableOfContentsDiv)
    
        // select all heading elements
        this.dom.window.document.querySelectorAll("h2, h3, h4, h5, h6").forEach(heading => {
            contentIndex[heading.nodeName]++
            heading.textContent = ' ' + heading.textContent
    
            // add numbering to the table of content entry, start with the inner number -> eg. 1.2.3 Sensors (start with .3)
            // NOTE: there is no "break" in this switch statement, this is because if an element of a certain level is found, all higher order elements have to be added as well 
            switch(heading.nodeName) {
                case "H6":
                    heading.textContent = '.' + contentIndex.H6 + heading.textContent
                case "H5":
                    heading.textContent = '.' + contentIndex.H5 + heading.textContent
                case "H4":
                    heading.textContent = '.' + contentIndex.H4 + heading.textContent
                case "H3":
                    heading.textContent = '.' + contentIndex.H3 + heading.textContent
                case "H2":
                    heading.textContent = contentIndex.H2 + heading.textContent
            }
    
            // reset the counter for sub-elements
            // NOTE: there is no "break" in this switch statement, because all sub-elements counters have to be resetted
            switch(heading.nodeName) {
                case "H2":
                    contentIndex.H3 = 0
                case "H3":
                    contentIndex.H4 = 0
                case "H4":
                    contentIndex.H5 = 0
                case "H5":
                    contentIndex.H6 = 0
            }
    
            // add the new entry to the table of content
            const tocItem = this.addElementToTableOfContents(tableOfContentsDiv, heading)
            tableOfContentsMap.push({
                id: heading.textContent,
                pageNumber: 0,
                item: tocItem
            })
        })
        return tableOfContentsMap;
    }

    // Add page number to table of content elements
    updatePageNumberInTableOfContents(tableOfContents) {
        tableOfContents.forEach(element => {
            let pageNumberElement = this.dom.window.document.createElement('div')
            pageNumberElement.setAttribute("class", "page-number");
            pageNumberElement.innerHTML = element.pageNumber == 0 ? "" : element.pageNumber
            element.item.appendChild(pageNumberElement)
            element.item.nodeValue = element.item.nodeValue
        })
    }

    build(){
        this.addIllustrationCaptions();
        this.injectHeadingIDs();
        this.formatFeatureList();        
        this.addCSS(this.rawCSS);
    }

    write(targetPath){
        writeFileSync(targetPath, this.dom.serialize())
    }


    // PRIVATE Methods

    getRawCSSForType(type){
        let cssContent = ""
        
        for(let stylesheet of this.getStylesheetsForType(type)){
            if(!existsSync(stylesheet)){
                throw `💣 No stylesheet for type '${type}' found. Make sure you're using one of the supported types.`;
            }
            let data = readFileSync(stylesheet, 'utf8')
            cssContent += data + "\n";
        }
        return cssContent;
    }

    // helper function to get the css file path
    getStylesheetsForType(type){
        return [`${this._styleSheetsPath}/common-style.css`, `${this._styleSheetsPath}/${type}-style.css`]
    }

    /**
     * This function can be used to use web fonts instead of locally sourced fonts.
     * @param {*} dom 
     */
    injectFonts(){
        const head = this.dom.window.document.head;
        let fontsAPI = this.dom.window.document.createElement("link");
        let fontsAPIGstatic = this.dom.window.document.createElement("link");
        let fontReference = this.dom.window.document.createElement("link");

        fontsAPI.setAttribute("rel", "preconnect")
        fontsAPIGstatic.setAttribute("rel", "preconnect")
        fontsAPIGstatic.setAttribute("crossorigin", "crossorigin")
        fontsAPI.setAttribute("href", "https://fonts.googleapis.com")
        fontsAPIGstatic.setAttribute("href", "https://fonts.gstatic.com")
        fontReference.setAttribute("href", "https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,700;1,400&family=Roboto+Mono:ital,wght@0,400;0,700;1,400&display=swap")
        fontReference.setAttribute("rel", "stylesheet")
        
        head.appendChild(fontsAPI)
        head.appendChild(fontsAPIGstatic)
        head.appendChild(fontReference)
    }

    // Helper function to add new html element after a specific node 
    addNodeAfter(rootElement, newElement){
        rootElement.parentNode.insertBefore(newElement, rootElement.nextSibling)
    }

    getIDFromHeading(heading){
        return heading.toLowerCase().replace(/[^\w]+/g, '-')
    }

    addElementToTableOfContents(tableOfContentsDiv, heading){
        const tocItem = this.dom.window.document.createElement('div')    
        const tocItemText = this.dom.window.document.createTextNode(heading.textContent)
        const tocItemLink = this.dom.window.document.createElement('a');
        tocItemLink.setAttribute("href", `#${this.getIDFromHeading(heading.textContent)}`)
        tocItemLink.appendChild(tocItemText);
        
        // an item within the table of content is created, the page number can't be calculated yet and is therefore set to 0 
        tocItem.classList.add('list-' + heading.nodeName.toLowerCase())
        tocItem.appendChild(tocItemLink)
        tableOfContentsDiv.appendChild(tocItem)
        return tocItem;
    }

    /**
     * Adds an id attribute to all headings so they can be referenced in links.
     */
    injectHeadingIDs(){
        for(let element of this.dom.window.document.querySelectorAll("h2, h3, h4, h5, h6")){
            const elementID = this.getIDFromHeading(element.textContent)
            element.setAttribute("id", elementID);
        }
    }

    /**
     * FIXME: When tables are used for the feature list, this breaks
     * Adds an ID to the first UL found in the document that is referenced in the sytlesheet using #feature-list
     */
    formatFeatureList(){    
        // the first ul-element in the datasheet content is the root-list of the features section (this list can have sub-lists)
        let outerList = this.dom.window.document.querySelector("ul")
        outerList.setAttribute("id", "feature-list")
    }

    /**
     * Add descriptions underneath illustrations using div tags. 
     * The generated tags contain the CSS class 'img-description'.
     */
    addIllustrationCaptions(){
        // iterate through all img elements
        this.dom.window.document.querySelectorAll("img").forEach(element => {
            // when converting md to html the description for imgs is saved in the alt-text of the element
            const descriptionString = element.alt
    
            // add description element underneath the img element if description is available
            if (descriptionString && descriptionString.length > 0) {
                let descriptionElement = this.dom.window.document.createElement("div")
                descriptionElement.innerHTML = descriptionString
                descriptionElement.classList.add('img-description')
                this.addNodeAfter(element, descriptionElement)
            } 
        })
    }

}

export default { HTMLRenderer }