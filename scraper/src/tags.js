"use strict";

const fs = require("fs");

// if the tag is unintelligible, accept it or return null?
const ACCEPT_UNKNOWN_TAG = false;

// default files to write tag statistics to
const FOUND_TAGS_FILE = "found_tags.txt";
const UNKNOWN_TAGS_FILE = "unknown_tags.txt";

// min length for the subsequence test - high, or else too many false positives
const SUBSEQUENCE_TEST_MIN_LEN = 8;
const SUBSTRING_TEST_MIN_LEN = 4;
const REVERSE_SUBSEQUENCE_TEST_MIN_LEN = 7;
const REVERSE_SUBSTRING_TEST_MIN_LEN = 3;

const map = {
    "ada": "Ada",
    "aws": "AWS",
    "amazon": "AWS",
    "android": "Android",
    "angular": "Angular",
    "ansible": "Ansible",
    "ant": "Java",
    "apache": "Apache",
    "arm": "ARM",
    "artificialintelligence": "Artificial Intelligence",
    "ai": "Artificial Intelligence",
    "asp.net": "ASP .NET",
    "asp.netcore": "ASP .NET Core",
    "aurelia": "Aurelia",
    "azure": "Azure",
    "azuredevops": "Azure",
    "backend": "Backend",
    "bash": "Shell",
    "bitcoin": "Blockchain",
    "bigdata": "BigData",
    "blockchain": "Blockchain",
    "c": "C",
    "c#": "C#",
    "c++": "C++",
    "cpp": "C++",
    "cassandra": "Cassandra",
    "clojure": "Clojure",
    "continuous": "CI/CD",
    "ci": "CI/CD",
    "cicd": "CI/CD",
    "circleci": "CI/CD",
    "couchdb": "CouchDB",
    "css": "CSS",
    "cuda": "OpenGL",
    "d": "D",
    "dart": "Dart",
    "datascience": "Data Science",
    "deeplearning": "Deep Learning",
    "devops": "DevOps",
    "django": "Django",
    "docker": "Docker",
    "dockercompose": "Docker",
    "dotnet": ".NET",
    "dotnetcore": ".NET Core",
    "drupal": "Drupal",
    "ecmascript": "JavaScript",
    "elasticsearch": "Elasticsearch",
    "electron": "Electron",
    "elixir": "Elixir",
    "erlang": "Erlang",
    "ember": "EmberJS",
    "express": "Express",
    "f#": "F#",
    "firebase": "Google Cloud Platform",
    "flask": "Flask",
    "flutter": "Flutter",
    "fortran": "Fortran",
    "go": "Go",
    "golang": "Go",
    "googlecloud": "Google Cloud Platform",
    "gradle": "Java",
    "graphql": "GraphQL",
    "groovy": "Groovy",
    "gtk": "GTK+",
    "gtk+": "GTK+",
    "hadoop": "Hadoop",
    "haskell": "Haskell",
    "hibernate": "Hibernate",
    "html": "HTML",
    "ios": "iOS",
    "java": "Java",
    "javaee": "Java",
    "javascript": "JavaScript",
    "jenkins": "CI/CD",
    "jquery": "jQuery",
    "jvm": "Java",
    "julia": "Julia",
    "keras": "Keras",
    "kibana": "Elasticsearch",
    "kotlin": "Kotlin",
    "kubernetes": "Kubernetes",
    "laravel": "Laravel",
    "linux": "Linux",
    "logstash": "Elasticsearch",
    "machinelearning": "Artificial Intelligence",
    "ml": "Artificial Intelligence",
    "macos": "macOS",
    "maven": "Java",
    "meteor": "Meteor",
    "mobile": "Mobile",
    "mongodb": "MongoDB",
    "mysql": "MySQL",
    ".net": ".NET",
    ".netcore": ".NET Core",
    ".netentityframework": ".NET Entity Framework",
    "nextjs": "Next.js",
    "node": "NodeJS",
    "nosql": "NoSQL",
    "objectivec": "Objective-C",
    "openai": "OpenAI",
    "opencl": "OpenCL",
    "opencv": "OpenCV",
    "opengl": "OpenGL",
    "oracle": "Oracle Database",
    "perl": "Shell",
    "phoenix": "Phoenix",
    "php": "PHP",
    "polymer": "Polymer",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "prolog": "Prolog",
    "python": "Python",
    "pytorch": "PyTorch",
    "qa": "Quality Assurance",
    "qt": "Qt",
    "qualityassurance": "Quality Assurance",
    "r": "R",
    "rabbitmq": "RabbitMQ",
    "react": "React",
    "reactredux": "React",
    "reactnative": "React Native",
    "redis": "Redis",
    "redux": "React", // lol
    "ruby": "Ruby",
    "rubyonrails": "Ruby", // lol
    "rust": "Rust",
    "sass": "CSS",
    "scala": "Scala",
    "scheme": "Scheme", // <3
    "security": "Security",
    "selenium": "Selenium",
    "shell": "Shell",
    "spring": "Spring",
    "springboot": "Spring Boot",
    "sql": "SQL",
    "sqlserver": "SQL Server",
    "svelte": "Svelte",
    "swift": "Swift",
    "swing": "Swing",
    "swingx": "Swing",
    "symfony": "Symfony",
    "tensorflow": "Tensorflow",
    "travisci": "CI/CD",
    "typescript": "TypeScript",
    "unity": "Unity",
    "unrealengine": "Unreal Engine",
    "virtualbox": "VirtualBox",
    "vmware": "VMWare",
    "vue": "Vue.js",
    "xamarin": "Xamarin",
    "windows": "Windows",
    "wordpress": "WordPress",
};

const ignore = new Set([
    "3d", "agile", "ads", "git", "scrum", "api", "architecture",
    "frontend", "backend", "microservices", "modelviewcontroller",
    "oop", "sysadmin", "webservices", "userinterface", "embedded",
    "rest", "design",
]);

// *****

const found = new Map();
const unknown = new Map();

/**
 * Write a report of tags found/unknown (so far) to a file
 */
function writeReport() {
    const foundData = Array.from(found)
        .sort(([v1, c1], [v2, c2]) => {
            if (c1 !== c2) return c1 - c2;
            return v1 < v2 ? -1 : 1;
        })
        .map(([value, count]) => `\t${count} ${value}`)
        .join("\n");
    const missingData = Array.from(unknown)
        .sort(([v1, c1], [v2, c2]) => {
            if (c1 !== c2) return c1 - c2;
            return v1 < v2 ? -1 : 1;
        })
        .map(([value, count]) => `\t${count} ${value}`)
        .join("\n");

    fs.writeFileSync(FOUND_TAGS_FILE, foundData);
    fs.writeFileSync(UNKNOWN_TAGS_FILE, missingData);
}

process.on("SIGINT", writeReport);
process.on("beforeExit", writeReport);

function getTags() {
    return Object.keys(map);
}

function isSubsequence(str1, str2, m, n) {
    if (m === undefined)
        return isSubsequence(str1, str2, str1.length, str2.length);
    if (m === 0) return true;
    if (n === 0) return false;

    // If last characters of two strings are matching
    if (str1[m - 1] === str2[n - 1])
        return isSubsequence(str1, str2, m - 1, n - 1);

    // If last characters are not matching
    return isSubsequence(str1, str2, m, n - 1);
}

/**
 * Map one or more StackOverflow job offer tags to a set of nijobs tags.
 *
 * @param {String|String[]} sotag - Zero or more StackOverflow tags
 * @returns {String|String[]} Zero or more nijobs Technology tags
 */
function mapTags(sotag) {
    if (typeof sotag === "object") {
        const nitags = sotag.map(mapTags)
            .filter((el) => el)
            .sort()
            .filter((el, i, a) => el && i === a.indexOf(el));
        for (const tag of nitags)
            found.set(tag, (found.get(tag) || 0) + 1);
        return nitags;
    }

    if (typeof sotag !== "string") {
        console.error("Invalid StackOverflow tag", sotag);
        throw "Invalid Argument";
    }

    // is the tag listed?
    let tag = sotag;
    if (map.hasOwnProperty(tag))
        return map[tag];
    else if (ignore.has(tag))
        return null;

    // try with lowercase only.
    tag = tag.toLowerCase();
    if (map.hasOwnProperty(tag))
        return map[tag];
    else if (ignore.has(tag))
        return null;

    // try replacing spaces and underscores with dashes.
    tag = tag.replace(/ |_/g, "-");
    if (map.hasOwnProperty(tag))
        return map[tag];
    else if (ignore.has(tag))
        return null;

    // remove versions at the end of the tag (e.g. css3, c++11, java-11).
    tag = tag.replace(/-?\d+$/, "");
    if (map.hasOwnProperty(tag))
        return map[tag];
    else if (ignore.has(tag))
        return null;

    // remove extensions (.js) and repeat.
    tag = tag.replace(/\.[a-z0-9]+$/, "").replace(/-?\d+$/, "");
    if (map.hasOwnProperty(tag))
        return map[tag];
    else if (ignore.has(tag))
        return null;

    // remove '.js$' brain damage.
    tag = tag.replace(/\.?js$/, "").replace(/-?\d+$/, "");
    if (map.hasOwnProperty(tag))
        return map[tag];
    else if (ignore.has(tag))
        return null;

    // we are getting desperate, remove separators altogether.
    tag = tag.replace(/-|\//g, "");
    if (map.hasOwnProperty(tag))
        return map[tag];
    else if (ignore.has(tag))
        return null;

    // fuck. try the substring test.
    if (tag.length >= SUBSTRING_TEST_MIN_LEN)
        for (const key in map)
            if (key.includes(tag))
                return map[key];

    // now in reverse.
    for (const key in map)
        if (key.length >= REVERSE_SUBSTRING_TEST_MIN_LEN)
            if (tag.includes(key))
                return map[key];

    // now we're fucking mad, pull out the big guns. do the subsequence test.
    if (tag.length >= SUBSEQUENCE_TEST_MIN_LEN)
        for (const key in map)
            if (isSubsequence(tag, key))
                return map[key];

    // now in reverse.
    for (const key in map)
        if (key.length >= REVERSE_SUBSEQUENCE_TEST_MIN_LEN)
            if (isSubsequence(key, tag))
                return map[key];

    // piece of shit tag probably
    if (!unknown.has(tag)) {
        console.warn(`Could not map StackOverflow Tag:  ${tag}`);
        unknown.set(tag, 0);
    }
    unknown.set(tag, unknown.get(tag) + 1);

    return ACCEPT_UNKNOWN_TAG ? tag : null;
}

module.exports = { getTags, mapTags, writeReport };
