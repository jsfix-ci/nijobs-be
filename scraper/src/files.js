const fs = require("fs");
const mkdirp = require("mkdirp");
const glob = require("glob");
const YAML = require("yaml");

/**
 * @param {String} file
 */
function makeFolderFor(file) {
    const folder = file.substring(0, file.lastIndexOf("/"));
    if (!folder || folder.length === 0) return;
    mkdirp.sync(folder);
}

function fileToYAML(inputFile, outputFile) {
    const jsonString = fs.readFileSync(inputFile);
    const json = JSON.parse(jsonString);
    const yamlString = YAML.stringify(json);
    makeFolderFor(outputFile);
    fs.writeFileSync(outputFile, yamlString);
}

function fileToJSON(inputFile, outputFile) {
    const yamlString = fs.readFileSync(inputFile);
    const json = YAML.parse(yamlString);
    const jsonString = JSON.stringify(json);
    makeFolderFor(outputFile);
    fs.writeFileSync(outputFile, jsonString);
}

function writeJSONandYAML(file, data) {
    const json = JSON.stringify(data);
    const yaml = YAML.stringify(data);
    makeFolderFor(file);
    fs.writeFileSync(`${file}.json`, json);
    fs.writeFileSync(`${file}.yaml`, yaml);
}

/**
 * Basically just aggregate all the JSON and YAML files into two huge files
 */
function persist(inputFolder, outputFolder) {
    if (glob.hasMagic(inputFolder)) {
        console.error("[PERSIST] Glob patterns in input folder: ", inputFolder);
        return false;
    }
    glob(`${inputFolder}/pages/*/offers.json`, (err, files) => {
        let offers = {};
        files.forEach((file) => {
            const jsonString = fs.readFileSync(file);
            const fileOffers = JSON.parse(jsonString);
            offers = { ...offers, ...fileOffers };
        });
        writeJSONandYAML(`${outputFolder}/offers`, offers);
    });
    return true;
}

module.exports = {
    makeFolderFor,
    fileToYAML,
    fileToJSON,
    writeJSONandYAML,
    persist,
};
