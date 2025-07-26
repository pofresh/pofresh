const zmq = require('zmq');
const socket = zmq.socket('dealer');
socket.identity = 'test';
socket.connect('tcp://localhost:3331');

run();

socket.on('message', function () {
    run();
});

const numRequests = 20000;
let start = Date.now();
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
    socket.send(payload);
}
