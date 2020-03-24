// Various time and random generation functions
const agoTable = { s: 1, m: 60, h: 3600, d: 86400, w: 604800, y: 31536000000 };

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
    return array[randomInt(0, array.length - 1)];
}

function fromAgoDate(agoText) {
    // Match things like  "7d ago"  "< 1h ago"  "1w ago"
    const match = /\b(\d+)([a-zA-Z]) +ago/.exec(agoText);
    let time;
    if (match) {
        time = +match[1] * 1000 * (agoTable[match[2].toLowerCase()] || 86400);
    } else {
        time =  1000 * 86400 * randomInt(5, 45); // ~25 days
    }
    return new Date(Date.now() - time);
}

function fewWeeksAfter(start = Date.now()) {
    const time = 1000 * agoTable.w * randomInt(2, 5);
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

module.exports = {
    randomInt,
    randomBoolean,
    randomVacancies,
    randomPhoneNumber,
    randomOf,
    fromAgoDate,
    fewWeeksAfter,
    fewMonthsAfter,
    randomJobDuration,
};
