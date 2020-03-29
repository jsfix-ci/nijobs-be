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
    return oneline(string).toLowerCase().replace(/[^a-z0-9\s_\-/]/g, "");
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

// remove trailing garbage from titles and also (m/w/d)
function tidytitle(string) {
    if (notok(string)) return "";
    return oneline(string)
        .replace(/(?:\s*(?:[!.,;:\-?/]|\([^)]+\))\s*)+$/ug, "")
        .replace(/\s*\((?:[mfwdvxi][/|])*[mfwdvxi][/|]?\)\s*/uig, " ")
        .trim();
}

// clever truncation of strings
function truncator(string, len, splitters) {
    if (notok(string)) return "";
    if (string.length <= len) return string;
    let pargs;
    for (const splitter of splitters) {
        pargs = string.split(splitter);
        if (pargs[0].length <= len) break;
    }
    if (pargs[0].length > len) return string.substr(0, len); // must be german
    let prefix = pargs[0], i = 1;
    while (i < pargs.length && prefix.length + pargs[i].length < len)
        prefix += pargs[i++];
    return prefix;
}

function onelineTruncated(string, len) {
    return oneline(truncator(string, len,
        [/(\s*[.!?]\s*)+/ug, /([.!?\-/]?)/ug]));
}

// truncate a string only to the first N paragraphs to fit length limits
function multilineTruncated(string, len) {
    return multiline(truncator(string, len,
        [/( *\n *)/ug, /( *[\n.!?]+ *)/ug, /(\s+)/ug]));
}

// okay...
function english(text) {
    if (!text) return "";
    return text
        .replace(/Sr\.|Sen\./ug, "Senior")
        .replace(/Jr\.|Jun\./ug, "Junior")
        .replace(/Grad\./ug, "Graduate")
        .replace(/front[-\s]end/ug, "frontend")
        .replace(/back[-\s]end/ug, "backend")
        .replace(/Front[-\s]end/ug, "Frontend")
        .replace(/Back[-\s]end/ug, "Backend");
}

module.exports = Object.freeze({
    safetrim,
    rmquery,
    endofpath,
    domainname,
    simpleline,
    oneline,
    multiline,
    tidytitle,
    onelineTruncated,
    multilineTruncated,
    english,
});
