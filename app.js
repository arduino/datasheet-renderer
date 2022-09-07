#!/usr/bin/env node

import { DatasheetRenderer } from './logic/datasheet-renderer.js';

(async function main() {
    const args = process.argv.slice(2)
    const configFilePath = args[0];
    const datasheetsSourcePath = args[1];
    const styleSheetsPath = args[2];
    const renderer = new DatasheetRenderer(configFilePath, datasheetsSourcePath, styleSheetsPath);
    
    const generatedDatasheets = (await renderer.generatePDFsFromMarkdownFiles()).length;
    const allDatasheetsGenerated = generatedDatasheets == renderer.datasheets.length;
    const failedDatasheets = renderer.datasheets.length - generatedDatasheets;
    
    if(generatedDatasheets > 0)
        console.log("✅ %s Datasheets generated.", generatedDatasheets);
    if(failedDatasheets > 0)
        console.log("❌ %s Datasheets couldn't be generated.", failedDatasheets);
    process.exit(allDatasheetsGenerated ? 0 : -1);
})()