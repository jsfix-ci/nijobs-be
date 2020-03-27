function progress(text, total) {
    let actual = 0, failed = 0;

    const print = () => {
        if (!process.stdout.isTTY) return;
        const nl = actual >= total ? "\n" : "";
        const prog = `${actual}/${total}`;
        const fail = failed > 0 ? `  fail: ${failed}` : "";
        process.stdout.write(`\r${text} (${prog}${fail})${nl}\r`);
    };
    const success = () => {
        ++actual; print(true);
    };
    const fail = () => {
        ++actual; ++failed; print(false);
    };
    const end = () => print(true);
    const any = () => actual > 0;
    const all = () => actual >= total;
    const none = () => actual === 0;
    print();
    return { success, fail, end, any, all, none };
}

function info(text, ...args) {
    if (process.stdout.isTTY) process.stdout.clearLine();
    console.info(text, ...args);
}

function warn(text, ...args) {
    if (process.stdout.isTTY) process.stdout.clearLine();
    console.warn(text, ...args);
}

function error(text, ...args) {
    if (process.stdout.isTTY) process.stdout.clearLine();
    console.error(text, ...args);
}

module.exports = Object.freeze({ info, warn, error, progress });
