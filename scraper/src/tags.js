const fs = require("fs");
const config = require("./config");
const files = require("./files");

// default files to write tag statistics to
const MAPPED_TAGS_DUMP_FILE = "stats/mapped_tags";
const UNKNOWN_TAGS_DUMP_FILE = "stats/unknown_tags";
const TAGS_MAPPING_FILE = "hydrate/tags";

const ignoreTags = new Set([
    "3d", "agile", "ads", "git", "scrum", "api", "architecture",
    "frontend", "backend", "microservices", "modelviewcontroller",
    "oop", "sysadmin", "webservices", "userinterface", "embedded",
    "rest", "design",
]);

// *****

// SO <tag> -> nijobs TechnologyType <name>
const tagsMap = {};

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

function isSubsequence(str1, str2, m, n) {
    if (m === undefined)
        return isSubsequence(str1, str2, str1.length, str2.length);
    if (m === 0) return true;
    if (n === 0) return false;
    if (str1[m - 1] === str2[n - 1])
        return isSubsequence(str1, str2, m - 1, n - 1);
    return isSubsequence(str1, str2, m, n - 1);
}

const SUBSTRING_TEST_MIN_LEN = 4;
const REVERSE_SUBSTRING_TEST_MIN_LEN = 3;
const SUBSEQUENCE_TEST_MIN_LEN = 8;
const REVERSE_SUBSEQUENCE_TEST_MIN_LEN = 7;

// *****

// track the (number of) tags that were matched or not matched
const mappedTracker = new Map();
const unknownTracker = new Map();

function readTagsFile() {
    const text = fs.readFileSync(TAGS_MAPPING_FILE, "utf8");

    const parsedMap = {};

    const add = (name, tags) => tags.forEach((tag) => {
        parsedMap[tag] = name;
    });

    text.split("\n")
        .map((line) => line.split("#")[0].trim())
        .filter((line) => line.length > 0)
        .map((line) => line.split(/:?=+/g).slice(0, 2))
        .filter((columns) => columns.length >= 2)
        .map(([name, tags]) => [name.trim(), tags.trim().split(/\s+/g)])
        .forEach(([name, tags]) => add(name, tags));

    return parsedMap;
}

function loadTags() {
    const parsedMap = readTagsFile();
    for (const tag in parsedMap)
        tagsMap[tag] = parsedMap[tag];
}

function writeReport() {
    const folder = config.OUTPUT_FOLDER;
    const mappedFile = `${folder}/${MAPPED_TAGS_DUMP_FILE}`;
    const unknownFile = `${folder}/${UNKNOWN_TAGS_DUMP_FILE}`;
    const mappedData = mapToUniqString(mappedTracker);
    const unknownData = mapToUniqString(unknownTracker);
    files.makeFolderFor(mappedFile);
    files.makeFolderFor(unknownFile);
    fs.writeFileSync(mappedFile, mappedData);
    fs.writeFileSync(unknownFile, unknownData);
}

function mapTag(sotag) {
    // is the tag listed?
    let tag = sotag;
    if (tagsMap.hasOwnProperty(tag))
        return tagsMap[tag];
    if (ignoreTags.has(tag))
        return null;

    // try with lowercase only.
    tag = tag.toLowerCase();
    if (tagsMap.hasOwnProperty(tag))
        return tagsMap[tag];
    if (ignoreTags.has(tag))
        return null;

    // try replacing spaces and underscores with dashes.
    tag = tag.replace(/ |_/g, "-");
    if (tagsMap.hasOwnProperty(tag))
        return tagsMap[tag];
    if (ignoreTags.has(tag))
        return null;

    // remove versions at the end of the tag (e.g. css3, c++11, java-11).
    tag = tag.replace(/-?\d+$/, "");
    if (tagsMap.hasOwnProperty(tag))
        return tagsMap[tag];
    if (ignoreTags.has(tag))
        return null;

    // remove extensions (.js) and repeat.
    tag = tag.replace(/\.[a-z0-9]+$/, "").replace(/-?\d+$/, "");
    if (tagsMap.hasOwnProperty(tag))
        return tagsMap[tag];
    if (ignoreTags.has(tag))
        return null;

    // remove '.js$' brain damage.
    tag = tag.replace(/\.?js$/, "").replace(/-?\d+$/, "");
    if (tagsMap.hasOwnProperty(tag))
        return tagsMap[tag];
    if (ignoreTags.has(tag))
        return null;

    // we are getting desperate, remove separators altogether.
    tag = tag.replace(/-|\//g, "");
    if (tagsMap.hasOwnProperty(tag))
        return tagsMap[tag];
    if (ignoreTags.has(tag))
        return null;

    // big guns...
    if (tag.length >= SUBSTRING_TEST_MIN_LEN)
        for (const key in tagsMap)
            if (key.includes(tag))
                return tagsMap[key];

    for (const key in tagsMap)
        if (key.length >= REVERSE_SUBSTRING_TEST_MIN_LEN)
            if (tag.includes(key))
                return tagsMap[key];

    if (tag.length >= SUBSEQUENCE_TEST_MIN_LEN)
        for (const key in tagsMap)
            if (isSubsequence(tag, key))
                return tagsMap[key];

    for (const key in tagsMap)
        if (key.length >= REVERSE_SUBSEQUENCE_TEST_MIN_LEN)
            if (isSubsequence(key, tag))
                return tagsMap[key];

    // give up

    if (!unknownTracker.has(tag))
        console.warn(`Could not map StackOverflow Tag:  ${tag}`);

    unknownTracker.set(tag, (unknownTracker.get(tag) || 0) + 1);

    return null;
}

function wrapMapTag(sotag) {
    const tag = mapTag(sotag);
    if (tag) {
        mappedTracker.set(tag, (mappedTracker.get(tag) || 0) + 1);
    }
    return tag;
}

/**
 * Attempt to map StackOverflow job offer tag(s) to nijobs TechnologyType names
 * Returns null if the mapping was not succesful, else the name found
 *
 * @param {String} sotag - StackOverflow tags, zero or more
 * @returns {Object}
 */
function mapTags(sotag) {
    if (!sotag) return null;

    if (typeof sotag === "object") {
        // array of tags
        const nitags = sotag.map(wrapMapTag)
            .filter((el) => el)
            .sort()
            .filter((el, i, a) => el && i === a.indexOf(el));
        return nitags;
    }

    if (typeof sotag !== "string") {
        console.error("Invalid StackOverflow tag:", sotag);
        throw "Invalid Argument";
    }

    return wrapMapTag(sotag);
}

module.exports = { readTagsFile, loadTags, writeReport, mapTags };
