// Deal with StackOverflow developer roles and map them to nijobs FieldType
const { simpleline } = require("./strings");
const { warn } = require("./progress");
const {
    writeUniqString,
    parseMapFile,
} = require("./files");

const GUESS_ROLES_MAPPING_FILE = "hydrate/roles";

// SO <role> -> nijobs FieldType <name>
const rolesMap = {
    "BackendDeveloper": "BACKEND_DEVELOPER",
    "DatabaseAdministrator": "DATABASE_ADMIN",
    "Designer": "DESIGNER",
    "DesktopDeveloper": "DESKTOP_DEVELOPER",
    "DevOpsDeveloper": "DEVOPS",
    "EmbeddedDeveloper": "EMBEDDED_DEVELOPER",
    "FrontendDeveloper": "FRONTEND_DEVELOPER",
    "FullStackDeveloper": "FULL_STACK_DEVELOPER",
    "GameDeveloper": "GAME_DEVELOPER",
    "MobileDeveloper": "MOBILE_DEVELOPER",
    "QATestDeveloper": "QUALITY_ASSURANCE",
    "SystemAdministrator": "SYSADMIN",
    "ProductManager": "OTHER",
    "DataScientist": "OTHER",
};

const guessMap = loadRoleGuesses();

const unknownTracker = new Map();

function loadRoleGuesses() {
    return parseMapFile(GUESS_ROLES_MAPPING_FILE);
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
        title: simpleline(title),
        role: simpleline(role),
        tags: tags.map(simpleline),
        description: simpleline(description),
    };

    // _very_ simple, dumb guess for now, which returns only one field
    for (const text of Object.values(norm)) {
        if (!text) continue;
        for (const field in guessMap) {
            const keywords = guessMap[field];
            for (const keyword in keywords)
                if (text.includes(keyword))
                    return [field];
        }
    }

    return ["OTHER"];
}

module.exports = Object.freeze({ writeReport, mapRoles, guessFields });
