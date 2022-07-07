import fileHelper from '../lib/file-helper.cjs'
import { generatePDFsFromMarkdownFiles } from "./datasheet-generator.js";
import { Datasheet } from './logic/datasheet.js';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';

(async function main() {
    const config = load(readFileSync("./config.json", 'utf8'));
    let args = process.argv.slice(2)
    let datasheetsSourcePath = args[0] ?? config.defaultSourcePath;
    let datasheetsTargetPath = config.relativeBuildPath;
    let datasheetFiles = fileHelper.findAllFiles(datasheetsSourcePath, config.datasheetFile, config.excludePatterns);
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
    
    const generatedDatasheets = await generatePDFsFromMarkdownFiles(datasheets, datasheetsTargetPath);
    const allDatasheetsGenerated = generatedDatasheets == datasheets.length;
    const failedDatasheets = datasheets.length - generatedDatasheets;
    
    if(generatedDatasheets > 0)
        console.log("✅ %s Datasheets generated.", generatedDatasheets);
    if(failedDatasheets > 0)
        console.log("❌ %s Datasheets couldn't be generated.", failedDatasheets);
    process.exit(allDatasheetsGenerated ? 0 : -1);
})()