import express from 'express';
import * as path from 'path';

const SERVER_PORT = 8123

export class WebResourceProvider {

    constructor(){
        // create temporary local web-server to serve images and css data when converting to html and from html to pdf	
        this._app = express()
    }

    addResource(datasheet){
        const sourceFile = datasheet.contentFilePath
        const sourceDirectory = `${path.dirname(sourceFile)}/`;
        this._app.use("/" + datasheet.identifier, express.static(sourceDirectory))  
    }

    resourceURL(datasheet, filename){
        const identifier = datasheet.identifier
        const contentURL = `http://localhost:${SERVER_PORT}`
        return `${contentURL}/${identifier}/${filename}`
    }

    begin(){
        this._serverInstance = this._app.listen(SERVER_PORT)
    }

    end(){
        this._serverInstance.close()
    }
}


export default { WebResourceProvider }