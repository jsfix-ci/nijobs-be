// Deal with StackOverflow developer roles and map them to nijobs FieldType
const fs = require("fs");
const {
    makeFolderFor,
    mapToUniqString,
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
    const unknownFile = "output/stats/unknown_roles";
    const unknownData = mapToUniqString(unknownTracker);
    makeFolderFor(unknownFile);
    fs.writeFileSync(unknownFile, unknownData);
}

function mapRole(role) {
    if (rolesMap.hasOwnProperty(role))
        return role;

    if (!unknownTracker.has(role))
        console.warn(`Could not map StackOverflow role:  ${role}`);

    unknownTracker.set(role, (unknownTracker.get(role) || 0) + 1);

    return null;
}

function mapRoles(sorole) {
    if (!sorole) return null;

    if (typeof sorole === "object") {
        // array of sorole
        return sorole.map(mapRole)
            .filter((el) => el)
            .sort()
            .filter((el, i, a) => el && i === a.indexOf(el));
    }

    if (typeof sorole !== "string") {
        console.error("Invalid StackOverflow role:", sorole);
        throw "Invalid Argument";
    }

    return mapRole(sorole);
}

function guessFields({
    title,
    role,
    tags,
    description,
}) {
    const normalize = (string) => (string || "").trim().replace(/\s+/, " ")
        .toLowerCase().replace(/[^0-9a-z ]/g, "");

    const norm = {
        title: normalize(title),
        role: normalize(role),
        tags: tags.map(normalize),
        description: normalize(description),
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

module.exports = { writeReport, mapRoles, guessFields };
