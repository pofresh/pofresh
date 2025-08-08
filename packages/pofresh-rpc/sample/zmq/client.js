const zmq = require('zmq');
const socket = zmq.socket('dealer');
socket.identity = 'test';
socket.connect('tcp://localhost:3331');

run();

socket.on('message', () => {
    run();
});

const numRequests = 20_000;
let start = Date.now();
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
    socket.send(payload);
}
