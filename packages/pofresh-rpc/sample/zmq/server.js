const zmq = require('zmq');
const socket = zmq.socket('router');

socket.bind('tcp://*:3331', err => {
    socket.on('message', (clientId, pkg) => {
        console.log(clientId);
        console.log(pkg);
        socket.send(pkg);
    });
});
