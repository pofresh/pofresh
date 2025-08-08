const Server = require('..').server;

// remote service path info list
const paths = [{ namespace: 'user', path: __dirname + '/remote/test' }];

const port = 3333;

const server = Server.create({ paths, port });

server.on('error', error => console.error('error', error));
server.on('closed', () => console.info('closed'));

server.start();
console.log('rpc server started.');

process.on('uncaughtException', err => {
    console.error(err);
});
