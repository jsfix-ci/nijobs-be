function parsePages(pageString) {
    // if we send trash page numbers to stackoverflow it won't complain.
    // usually it just answers back with page #1. We don't want to
    // deal with duplicate jobs or other such stupid nonsense.
    if (pageString === "") return [];
    const pages = pageString.split(/,|;/g);
    for (const page in pages) {
        if (/(?:\d+(?:-\d+)?)+/g.test(page)) continue;
        return false;
    }
    return pages
        .map((page) => {
            if (/^\d+-\d+$/.test(page)) {
                const [min, max] = page.split("-");
                const arr  = [];
                for (let i = +min; i <= +max; ++i) arr.push(i);
                return arr;
            } else {
                return +page;
            }
        }).reduce((acc, value) => acc.concat(value), []);
}

function keyBy(arr, key = "id", overwrite = "throw") {
    const obj = {};
    arr.forEach((elem) => {
        if (!{}.hasOwnProperty.call(elem, key)) return;
        if ({}.hasOwnProperty.call(obj, elem[key])) {
            if (overwrite === "throw")
                throw `Two objects found with the same ${key}: ${elem[key]}`;
            if (!overwrite) return;
        }
        obj[elem[key]] = elem;
    });
    return obj;
}

function sortById({ id: id1 }, { id: id2 }) {
    if (id1 === id2) return 0;
    return id1 < id2 ? -1 : 1;
}

function removeNulls(el) {
    return !!el;
}

function uniq(el, i, arr) {
    const prev = i > 0 ? i - 1 : 0;
    return i === arr.indexOf(el, prev);
}

function removeNullsUniq(el, i, arr) {
    return removeNulls(el) && uniq(el, i, arr);
}

module.exports = Object.freeze({
    parsePages,
    keyBy,
    sortById,
    removeNulls,
    uniq,
    removeNullsUniq,
});
