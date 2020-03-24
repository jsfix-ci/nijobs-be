// Various string cleanup functions
function identifier(string, sep = "-") {
    if (!string) return "";
    return string.trim().replace(/\s+/g, sep);
}

function oneline(string) {
    if (!string) return "";
    return string.trim().replace(/\s+/g, " ");
}

function multiline(string) {
    if (!string) return "";
    return string.split("\n").map(oneline).join("\n")
        .replace(/\n\s+\n/g, "\n\n")
        .replace(/\b +\b/g, " ");
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
    oneline,
    multiline,
    english,
};
