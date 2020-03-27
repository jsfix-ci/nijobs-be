// Functions for writing, reading, and parsing JSON and YAML files
const fs = require("fs");
const mkdirp = require("mkdirp");
const glob = require("glob");
const YAML = require("yaml");

const { error } = require("./progress");
const { WRITE_YAML_ALSO } = require("./config");

// *** read and write with extension checking and format conversion

function extension(file, ext) {
    if (/\.[a-z0-9]+$/i.test(file))
        return file.replace(/\.[a-z0-9]+$/i, ext);
    return `${file}${ext}`;
}

function makeFolderFor(file) {
    const folder = file.substring(0, file.lastIndexOf("/"));
    if (!folder || folder.length === 0) return;
    mkdirp.sync(folder);
}

function writeJSON(file, data) {
    const jsonFile = extension(file, ".json");
    const json = JSON.stringify(data);
    makeFolderFor(jsonFile);
    fs.writeFileSync(jsonFile, json);
}

function readJSON(file) {
    const jsonFile = extension(file, ".json");
    const jsonString = fs.readFileSync(jsonFile, "utf8");
    return JSON.parse(jsonString);
}

function writeYAML(file, data) {
    const yamlFile = extension(file, ".yaml");
    const yaml = YAML.stringify(data);
    makeFolderFor(yamlFile);
    fs.writeFileSync(yamlFile, yaml);
}

function readYAML(file) {
    const yamlFile = extension(file, ".yaml");
    const yamlString = fs.readFileSync(yamlFile, "utf8");
    return YAML.parse(yamlString);
}

function writeHTML(file, data) {
    const htmlFile = extension(file, ".html");
    makeFolderFor(htmlFile);
    fs.writeFileSync(htmlFile, data);
}

function readHTML(file) {
    const htmlFile = extension(file, ".html");
    return fs.readFileSync(htmlFile, "utf8");
}

function readBlob(file) {
    if (/\.json$/i.test(file)) {
        return readJSON(file);
    }
    if (/\.yaml$/i.test(file)) {
        return readYAML(file);
    }
    throw `'${file}' argument to readBlob() needs a json or yaml extension`;
}

function writeJSONandYAML(file, data) {
    writeJSON(file, data);
    if (!WRITE_YAML_ALSO) return;
    writeYAML(file, data);
}

// *** parse structured files

function parseMultimapFile(file) {
    const text = fs.readFileSync(file, "utf8");

    const parsedMap = {};

    const add = (name, values) => values.forEach((tag) => {
        parsedMap[tag] = name;
    });

    text.split("\n")
        .filter((line) => !/^\s*#/.test(line) && line.length > 0)
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
        .filter((line) => !/^\s*#/.test(line) && line.length > 0)
        .map((line) => line.split(/:?=+/g).slice(0, 2))
        .filter((columns) => columns.length >= 2)
        .map(([name, values]) => [name.trim(),
            values.trim().split(/\s+/g).map((value) => value.replace("_", " "))])
        .forEach(([name, values]) => add(name, values));

    return parsedMap;
}

// *** merge

function mergeFiles(pattern, outputFile, key = "id") {
    const merged = {};
    glob.sync(pattern).forEach((file) => {
        const blob = readBlob(file);
        merged[blob[key]] = blob;
    });
    writeJSONandYAML(outputFile, merged);
}

function removeFile(file) {
    try {
        fs.unlinkSync(file);
    } catch (err) {
        error(err);
    }
}

function removeFiles(files) {
    files.forEach(removeFile);
}

/** generate output like 'sort | uniq -c' */
function mapToUniqString(map) {
    return Array.from(map)
        .sort(([v1, c1], [v2, c2]) => {
            if (c1 !== c2) return c2 - c1;
            return v1 < v2 ? -1 : 1;
        })
        .map(([value, count]) => [value, `${count}`.padStart(7)])
        .map(([value, count]) => `${count} ${value}`)
        .join("\n");
}

function writeUniqString(file, map) {
    const data = mapToUniqString(map);
    makeFolderFor(file);
    fs.writeFileSync(file, data);
}

module.exports = Object.freeze({
    makeFolderFor,
    writeJSON,
    readJSON,
    writeYAML,
    readYAML,
    writeHTML,
    readHTML,
    readBlob,
    writeJSONandYAML,
    parseMultimapFile,
    parseMapFile,
    mergeFiles,
    removeFile,
    removeFiles,
    mapToUniqString,
    writeUniqString,
});
