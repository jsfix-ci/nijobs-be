// Various time and random generation functions
const { warn } = require("./progress");
const agoTable = {
    "s": 1,
    "m": 60,
    "h": 3600,
    "d": 86400,
    "w": 86400 * 7,
    "y": 86400 * 365.25,
    "second": 1,
    "minutes": 60,
    "hour": 3600,
    "day": 86400,
    "week": 86400 * 7,
    "month": 86400 * 365.25 / 12,
    "year": 86400 * 365.25,
    "yesterday": 86400,
};

function getAgo(string) {
    for (const key in agoTable)
        if (string.includes(key))
            return agoTable[key];
    return null;
}

function randomInt(min, max) {
    const imin = Math.ceil(min);
    const imax = Math.floor(max);
    return Math.floor(Math.random() * (imax - imin)) + imin;
}

function randomBoolean(p = 0.5) {
    return Math.random() <= p;
}

function randomVacancies() {
    return randomInt(3, 10);
}

function randomPhoneNumber() {
    return "+351 2xxxxxxxx".replace(/x/g, () => randomInt(1, 9));
}

function randomOf(array) {
    return array[randomInt(0, array.length)];
}

function randomAgoDate() {
    const time =  1000 * 86400 * randomInt(5, 45); // ~25 days
    return new Date(Date.now() - time);
}

function fromAgoDate(agoText) {
    // Match things like  "7d ago"  "< 1h ago"  "1w ago"
    if (/\byesterday\b/.test(agoText))
        return new Date(Date.now() - (1000 * agoTable.yesterday));
    const match = /(\d+)\s*([a-zA-Z]+)\s+ago/iu.exec(agoText);
    if (!match) {
        warn(`Failed to parse ago date: '${agoText}'`);
        return randomAgoDate();
    }
    const stamp = getAgo(match[2].toLowerCase().trim());
    if (stamp) {
        const time = +match[1] * 1000 * (stamp || 86400);
        return new Date(Date.now() - time);
    } else {
        warn(`Failed to parse ago date: '${agoText}'`);
        return randomAgoDate();
    }
}

function fewWeeksAfter(start = Date.now()) {
    const time = 1000 * agoTable.w * randomInt(2, 6);
    return new Date(start + time);
}

function fewMonthsAfter(start = Date.now()) {
    const time = 1000 * agoTable.w * randomInt(10, 20);
    return new Date(start + time);
}

function randomJobDuration() {
    const min = randomInt(1, 5);
    const max = randomInt(min + 1, (2 * min) + 2);
    return [min, max];
}

module.exports = Object.freeze({
    randomInt,
    randomBoolean,
    randomVacancies,
    randomPhoneNumber,
    randomOf,
    fromAgoDate,
    fewWeeksAfter,
    fewMonthsAfter,
    randomJobDuration,
});
