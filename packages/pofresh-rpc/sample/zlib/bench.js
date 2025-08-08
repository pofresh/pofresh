const zlibjs = require('browserify-zlib');

const num = 20_000;
let start = null;

const message = {
    key: 'hello'
};

start = Date.now();

function run() {
    for (let i = 0; i < num; i++) {
        zlibjs.gunzipSync(zlibjs.gzipSync(JSON.stringify(message)));
    }

    const now = Date.now();
    const _cost = now - start;
    run();
}

run();
