// Various string cleanup functions
function identifier(string, sep = "-") {
    if (!string) return "";
    return string.trim().replace(/(?:\s|-|_|\/)+/ug, sep).toLowerCase();
}

function cleanline(string) {
    if (!string) return "";
    return oneline(string).toLowerCase().replace(/[^0-9a-z ]/g, "");
}

function oneline(string) {
    if (!string) return "";
    return string.trim().replace(/\s+/ug, " ");
}

function multiline(string) {
    if (!string) return "";
    return string.split("\n").map(oneline).join("\n")
        .replace(/\n\s+\n/ug, "\n\n")
        .replace(/\b +\b/ug, " ");
}

function english(text) {
    if (!text) return "";
    return text
        .replace(/Sr\.|Sen\./g, "Senior")
        .replace(/Jr\.|Jun\./g, "Junior")
        .replace(/Grad\./g, "Graduate")
        .replace(/front-end/g, "frontend")
        .replace(/back-end/g, "backend")
        .replace(/Front-end/g, "Frontend")
        .replace(/Back-end/g, "Backend");
}

module.exports = {
    identifier,
    cleanline,
    oneline,
    multiline,
    english,
};
