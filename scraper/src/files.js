// Functions for writing, reading, and parsing JSON and YAML files
const fs = require("fs");
const mkdirp = require("mkdirp");
const glob = require("glob");
const YAML = require("yaml");

const { WRITE_YAML_ALSO } = require("./config");

function extensionJSON(file) {
    if (/\.yaml/i.test(file)) return file.replace(/\.yaml$/i, ".json");
    if (/\.json$/i.test(file)) return file;
    return `${file}.json`;
}

function extensionYAML(file) {
    if (/\.json$/i.test(file)) return file.replace(/\.json$/i, ".yaml");
    if (/\.yaml$/i.test(file)) return file;
    return `${file}.yaml`;
}

function writeJSON(file, data) {
    const jsonFile = extensionJSON(file);
    const json = JSON.stringify(data);
    makeFolderFor(jsonFile);
    fs.writeFileSync(jsonFile, json);
}

function readJSON(file) {
    const jsonFile = extensionJSON(file);
    const jsonString = fs.readFileSync(jsonFile, "utf8");
    return JSON.parse(jsonString);
}

function writeYAML(file, data) {
    const yamlFile = extensionYAML(file);
    const yaml = YAML.stringify(data);
    makeFolderFor(yamlFile);
    fs.writeFileSync(yamlFile, yaml);
}

function readYAML(file) {
    const yamlFile = extensionYAML(file);
    const yamlString = fs.readFileSync(yamlFile, "utf8");
    return YAML.parse(yamlString);
}

function readBlob(file) {
    if (/\.json$/i.test(file)) {
        return readJSON(file);
    } else if (/\.yaml$/i.test(file)) {
        return readYAML(file);
    } else {
        throw `'${file}' argument to readBlob() needs an extension`;
    }
}

function writeJSONandYAML(file, data) {
    writeJSON(file, data);
    if (!WRITE_YAML_ALSO) return;
    writeYAML(file, data);
}

function parseMultimapFile(file) {
    const text = fs.readFileSync(file, "utf8");

    const parsedMap = {};

    const add = (name, values) => values.forEach((tag) => {
        parsedMap[tag] = name;
    });

    text.split("\n")
        .map((line) => line.split("#")[0].trim())
        .filter((line) => line.length > 0)
        .map((line) => line.split(/:?=+/g).slice(0, 2))
        .filter((columns) => columns.length >= 2)
        .map(([name, values]) => [name.trim(), values.trim().split(/\s+/g)])
        .forEach(([name, values]) => add(name, values));

    return parsedMap;
}

function parseMapFile(file) {
    const text = fs.readFileSync(file, "utf8");

    const parsedMap = {};

    const add = (name, values) => {
        parsedMap[name] = [...(parsedMap[name] || []), ...values];
    };

    text.split("\n")
        .map((line) => line.split("#")[0].trim())
        .filter((line) => line.length > 0)
        .map((line) => line.split(/:?=+/g).slice(0, 2))
        .filter((columns) => columns.length >= 2)
        .map(([name, values]) => [name.trim(),
            values.trim().split(/\s+/g).map((value) => value.replace("_", " "))])
        .forEach(([name, values]) => add(name, values));

    return parsedMap;
}

function makeFolderFor(file) {
    const folder = file.substring(0, file.lastIndexOf("/"));
    if (!folder || folder.length === 0) return;
    mkdirp.sync(folder);
}

function fileToYAML(inputFile, outputFile) {
    writeYAML(outputFile, readJSON(inputFile));
}

function fileToJSON(inputFile, outputFile) {
    writeJSON(outputFile, readYAML(inputFile));
}

function mergeFiles(pattern, outputFile, key = "id") {
    const files = glob.sync(pattern);
    const merged = {};
    files.forEach((file) => {
        const blob = readBlob(file);
        merged[blob[key]] = blob;
    });
    writeJSONandYAML(outputFile, merged);
}

/** generate output like 'sort | uniq -c' */
function mapToUniqString(map) {
    return Array.from(map)
        .sort(([v1, c1], [v2, c2]) => {
            if (c1 !== c2) return c1 - c2;
            return v1 < v2 ? -1 : 1;
        })
        .map(([value, count]) => [value, `${count}`.padStart(7)])
        .map(([value, count]) => `${count} ${value}`)
        .join("\n");
}

module.exports = {
    writeJSON,
    readJSON,
    writeYAML,
    readYAML,
    readBlob,
    writeJSONandYAML,
    mapToUniqString,
    parseMultimapFile,
    parseMapFile,
    makeFolderFor,
    fileToYAML,
    fileToJSON,
    mergeFiles,
};
