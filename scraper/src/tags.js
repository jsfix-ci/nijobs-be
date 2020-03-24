// Deal with StackOverflow tags, and map them to nijobs TechnologyType
const fs = require("fs");
const {
    makeFolderFor,
    mapToUniqString,
    parseMultimapFile,
} = require("./files");

const TAGS_MAPPING_FILE = "hydrate/tags";

const ignoreTags = new Set([
    "3d", "agile", "ads", "git", "scrum", "api", "architecture",
    "frontend", "backend", "microservices", "modelviewcontroller",
    "oop", "sysadmin", "webservices", "userinterface", "embedded",
    "rest", "design",
]);

// SO <tag> -> nijobs TechnologyType <name>
const tagsMap = loadTags();

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

// track the (number of) tags that were matched or not matched
const rawTracker = new Map();
const normalTracker = new Map();
const mappedTracker = new Map();
const unknownTracker = new Map();

function loadTags() {
    return parseMultimapFile(TAGS_MAPPING_FILE);
}

function writeOneReport(filename, trackerMap) {
    if (trackerMap.size === 0) return; // don't write reports for empty tracker
    const file = `output/stats/${filename}`;
    const dataText = mapToUniqString(trackerMap);
    makeFolderFor(file);
    fs.writeFileSync(file, dataText);
}

function writeReport() {
    writeOneReport("raw_tags", rawTracker);
    writeOneReport("normal_tags", normalTracker);
    writeOneReport("mapped_tags", mappedTracker);
    writeOneReport("unknown_tags", unknownTracker);
}

function normalizeTag(rawTag) {
    rawTracker.set(rawTag, (rawTracker.get(rawTag) || 0) + 1);

    // is the tag listed?
    let tag = rawTag.trim();
    if (tagsMap.hasOwnProperty(tag))
        return tag;

    // try with lowercase only.
    tag = tag.toLowerCase();
    if (tagsMap.hasOwnProperty(tag))
        return tag;

    // try replacing spaces and underscores with dashes.
    tag = tag.replace(/\s+|_/g, "-");
    if (tagsMap.hasOwnProperty(tag))
        return tag;

    // remove versions at the end of the tag (e.g. css3, c++11, java-11).
    tag = tag.replace(/-?\d+$/, "");
    if (tagsMap.hasOwnProperty(tag))
        return tag;

    // remove extensions (.js) and repeat.
    tag = tag.replace(/\.[a-z0-9]+$/, "").replace(/-?\d+$/, "");
    if (tagsMap.hasOwnProperty(tag))
        return tag;

    // remove '.js$' brain damage.
    tag = tag.replace(/\.?js$/, "").replace(/-?\d+$/, "");
    if (tagsMap.hasOwnProperty(tag))
        return tag;

    // we are getting desperate, remove separators altogether.
    tag = tag.replace(/-|\//g, "");
    if (tagsMap.hasOwnProperty(tag))
        return tag;

    // take it as is then
    return tag;
}

function trackNormalizeTag(rawTag) {
    const tag = normalizeTag(rawTag);
    if (tag)
        normalTracker.set(tag, (normalTracker.get(tag) || 0) + 1);
    return tag;
}

function normalizeTags(rawTag) {
    if (!rawTag) return null;

    if (typeof rawTag === "object") {
        // array of tags
        return rawTag.map(trackNormalizeTag)
            .filter((el) => el)
            .sort()
            .filter((el, i, a) => el && i === a.indexOf(el));
    }

    if (typeof rawTag !== "string") {
        console.error("Invalid StackOverflow tag:", rawTag);
        throw "Invalid Argument";
    }

    return trackNormalizeTag(rawTag);
}

function mapTag(rawTag) {
    // the tag should already be normalized
    const tag = normalizeTag(rawTag);
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
        console.warn(`Could not map StackOverflow tag:  ${tag}`);

    unknownTracker.set(tag, (unknownTracker.get(tag) || 0) + 1);

    return null;
}

function trackMapTag(sotag) {
    const tag = mapTag(sotag);
    if (tag)
        mappedTracker.set(tag, (mappedTracker.get(tag) || 0) + 1);
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
        return sotag.map(trackMapTag)
            .filter((el) => el)
            .sort()
            .filter((el, i, a) => el && i === a.indexOf(el));
    }

    if (typeof sotag !== "string") {
        console.error("Invalid StackOverflow tag:", sotag);
        throw "Invalid Argument";
    }

    return trackMapTag(sotag);
}

module.exports = { writeReport, mapTags, normalizeTags };
