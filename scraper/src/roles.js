// Deal with StackOverflow developer roles and map them to nijobs FieldType
const { simpleline } = require("./strings");
const { warn } = require("./progress");
const {
    writeUniqString,
    parseMapFile,
} = require("./files");

const FIELDS_MAP_FILE = "hydrate/fields";
const ROLES_MAP_FILE = "hydrate/roles";

// SO <role> -> nijobs FieldType <name>

const guessMap = loadFields();
const rolesMap = loadRoles();

const unknownTracker = new Map();

function loadFields() {
    const map = parseMapFile(FIELDS_MAP_FILE, /\s*[,;]+\s*/);
    for (const field in map)
        map[field].map((keyword) => new RegExp(keyword, "uig"));
    return map;
}

function loadRoles() {
    return parseMapFile(ROLES_MAP_FILE, /\s*[,;]+\s*/);
}

function writeReport() {
    writeUniqString("out/stats/unknown_roles", unknownTracker);
}

function mapRole(role) {
    if ({}.hasOwnProperty.call(rolesMap, role))
        return role;

    if (!unknownTracker.has(role))
        warn(`Could not map StackOverflow role:  ${role}`);

    unknownTracker.set(role, (unknownTracker.get(role) || 0) + 1);

    return null;
}

function mapRoles(role) {
    if (!role) return null;
    if (typeof role === "object")
        return role.map(mapRole).filter((el) => el).sort()
            .filter((el, i, a) => el && i === a.indexOf(el));
    return mapRole(role);
}

function guessFields({
    title,
    role,
    tags,
    description,
}) {
    const norm = {
        title: [simpleline(title), 15],
        role: [simpleline(role), 20],
        tags: [tags.map(simpleline).join(" "), 8],
        description: [simpleline(description), 2],
    };

    const scores = {};

    // _very_ simple, dumb guess for now, which returns only one field
    for (const [text, weight] of Object.values(norm)) {
        if (!text) continue;
        for (const field in guessMap) {
            const keywords = guessMap[field];
            for (const keyword of keywords) {
                const matches = text.match(keyword);
                if (matches) {
                    if (!scores[field]) scores[field] = 0;
                    scores[field] += matches.length * weight;
                }
            }
        }
    }

    return Object.entries(scores).sort(([f1, s1], [f2, s2]) => {
        if (s1 !== s2) return s2 - s1;
        return f1 < f2 ? -1 : 1;
    }).map(([f]) => f);
}

module.exports = Object.freeze({ writeReport, mapRoles, guessFields });
