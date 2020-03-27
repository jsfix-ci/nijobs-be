// Various string cleanup functions

const notok = (string) => !string || typeof string !== "string";

// call .trim() but succeed even if it ain't a string
function safetrim(string) {
    if (notok(string)) return "";
    return string.trim();
}

// remove the query from a url (after the first '?')
function rmquery(string) {
    if (notok(string)) return "";
    return string.trim().split("?")[0];
}

// get the last path element of a uri
function endofpath(string) {
    if (notok(string)) return "";
    return rmquery(string).split("/").pop();
}

// turn an id into its likely domain name
function domainname(string, sep = "") {
    if (notok(string)) return "";
    return string.trim().toLowerCase().replace(/[^a-z0-9]+/ug, sep);
}

// remove garbage from a one line string
function simpleline(string) {
    if (notok(string)) return "";
    return oneline(string).toLowerCase().replace(/[^a-z0-9\s_/-]/g, "");
}

// remove whitespace noise from oneline html string
function oneline(string) {
    if (notok(string)) return "";
    return string.trim().replace(/\s+/ug, " ");
}

// remove whitespace noise from multiline html string
function multiline(string) {
    if (notok(string)) return "";
    return string.trim().split("\n").map(oneline).join("\n")
        .replace(/\n\s+\n/ug, "\n\n")
        .replace(/[ \t]+/ug, " ");
}

// okay...
function english(text) {
    if (!text) return "";
    return text
        .replace(/Sr\.|Sen\./ug, "Senior")
        .replace(/Jr\.|Jun\./ug, "Junior")
        .replace(/Grad\./ug, "Graduate")
        .replace(/front-end/ug, "frontend")
        .replace(/back-end/ug, "backend")
        .replace(/Front-end/ug, "Frontend")
        .replace(/Back-end/ug, "Backend");
}

module.exports = Object.freeze({
    safetrim,
    rmquery,
    endofpath,
    domainname,
    simpleline,
    oneline,
    multiline,
    english,
});
