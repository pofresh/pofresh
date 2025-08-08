const zmq = require('zmq');
const socket = zmq.socket('router');

socket.bind('tcp://*:3331', _err => {
    socket.on('message', (_clientId, pkg) => {
        socket.send(pkg);
    });
});
