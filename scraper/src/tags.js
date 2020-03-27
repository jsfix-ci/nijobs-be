// Deal with StackOverflow tags, and map them to nijobs TechnologyType
const {
    writeUniqString,
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
const unknownTracker = new Map();

function loadTags() {
    return parseMultimapFile(TAGS_MAPPING_FILE);
}

function writeReport() {
    writeUniqString("out/stats/unknown_tags", unknownTracker);
}

function normalizeTag(rawTag) {
    const tag = rawTag.trim().toLowerCase()
        .replace(/\s+|_/u, "-")
        .replace(/-?\d+$/u, "")
        .replace(/\.[a-z0-9]{1,4}$/iu, "").replace(/-?\d+$/u, "")
        .replace(/-|\//u, "");
    return tag;
}

function normalizeTags(rawTag) {
    if (!rawTag) return null;
    if (typeof rawTag === "object")
        return rawTag.map(normalizeTag).sort()
            .filter((el, i, a) => el && i === a.indexOf(el));
    return normalizeTag(rawTag);
}

function mapTag(rawTag) {
    // the tag should already be normalized
    const tag = normalizeTag(rawTag);
    if ({}.hasOwnProperty.call(tagsMap, tag))
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
    unknownTracker.set(tag, (unknownTracker.get(tag) || 0) + 1);

    return null;
}

function mapTags(tag) {
    if (!tag) return null;
    if (typeof tag === "object")
        return tag.map(mapTag).filter((el) => el).sort()
            .filter((el, i, a) => el && i === a.indexOf(el));
    return mapTag(tag);
}

module.exports = Object.freeze({ writeReport, mapTags, normalizeTags });
