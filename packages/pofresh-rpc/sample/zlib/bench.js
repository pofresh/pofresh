const zlibjs = require('browserify-zlib');

const num = 20000;
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
  const cost = now - start;
  console.log('run %d num requests cost: %d ops/sec', num, cost, (num / (cost / 1000)).toFixed(2));
  run();
}

run();
