# Datasheet-Infrastructure

This tool allows for creating datasheet-PDFs from a markdown file.

## Installation
- Install Node.js and npm from [here](https://nodejs.org/en/). Node.js is a Javascript runtime and npm is the package 
- Dependencies are installed automatically the first time the script runs.
- Install updated dependencies via `npm install` in case the build fails
- On Windows it's recommended to install Visual Studio Code that comes with a power shell

## Compile the datasheet
This is relevant if wanting to compile the datasheets on your local machine. For the deployment to the website it's not necessary to commit PDFs, they are generated automatically during build time.
From the root folder of the repository run one of the following commands:

Creates a single datasheet for a product:
`./generate-datasheets.sh content/hardware/04.pro/path-to-your-product`

Creates datasheets for all products in content/hardware:
`./generate-datasheets.sh`

## Content Instructions
- Add an empty line after pictures for optimal spacing (especially for pictures with descriptions)
- No custom h1 headlines (are not considered in numbering) -> the only h1 elements are the sections #Description, #Target areas & #Features that will be part of the front page as well as the #Contents section that is filled with content automatically
- The featured picture (for the title page) must be first the picture in the datasheet.md file and must be named “featured”, it can be of any of the supported filetypes (svg, png, jpg) eg. `![](assets/featured.jpg)`
- No custom title in the content shall be added such as “# Product datasheet”, the title will be automatically generated in the header by the attribute set in the frontmatter metadata.
- Accepted datasheet types (styles) are only “mkr” and “pro”. Set the type in the frontmatter field.
- The sections `#Description, #Target areas & #Features` will be part of the front page
- Create the `# Contents` section. This section is special, **no content should be added in this section**, it will be created **automatically**

### Pictures & picture descriptions
- jpg, png, svg are the recommended file formats
- Picture without a description element underneath: `![](assets/featured.jpg)`
- Picture with a description element underneath: `![This is a insightful description](assets/test.svg)`

### Handling table elements
Not a must in terms of the correct compilation of a MD datasheet, but still recommended for readability purposes, is using a **markdown table prettifier** such as the [darkriszty.markdown-table-prettify](https://marketplace.visualstudio.com/items?itemName=darkriszty.markdown-table-prettify) extension for Visual Studio Code or using *visual* markdown editors such as [Typora](https://typora.io/).