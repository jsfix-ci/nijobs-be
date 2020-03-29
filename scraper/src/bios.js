const fs = require("fs");

const { oneline } = require("./strings");
const { shuffleArray } = require("./utils");
const { randomOf } = require("./random");

const bios = loadBios();

function loadBios() {
    const biosString = fs.readFileSync("hydrate/bios", "utf8");
    return shuffleArray(biosString.split("\n").map(oneline))
        .filter((line) => line && line.length > 0);
}

function getRandomBio() {
    return randomOf(bios);
}

module.exports = { getRandomBio };
