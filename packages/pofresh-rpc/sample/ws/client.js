const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3331');

ws.on('open', function open() {
    start = Date.now();
    run();
});

ws.on('message', (_data, _flags) => {
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
        const _cost = now - start;
        times = 0;
        start = now;
        return run();
    }

    times++;

    const payload = 'hello';
    ws.send(payload);
}
