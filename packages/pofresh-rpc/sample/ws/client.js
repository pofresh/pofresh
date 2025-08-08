const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3331');

ws.on('open', function open() {
    start = Date.now();
    run();
});

ws.on('message', (data, _flags) => {
    // flags.binary will be set if a binary data is received.
    // flags.masked will be set if the data was masked.
    run();
});

const numRequests = 20_000;
let start = null;
let times = 0;

function run() {
    if (times > numRequests) {
        return;
    }

    if (times === numRequests) {
        const now = Date.now();
        const cost = now - start;
        console.log(
            'run %d num requests cost: %d ops/sec',
            numRequests,
            cost,
            (numRequests / (cost / 1000)).toFixed(2)
        );
        times = 0;
        start = now;
        return run();
    }

    times++;

    const payload = 'hello';
    ws.send(payload);
}
