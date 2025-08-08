const Server = require('..').server;

// remote service path info list
const paths = [{ namespace: 'user', path: `${__dirname}/remote/test` }];

const port = 3333;

const server = Server.create({ paths, port });

server.on('error', _error => {});
server.on('closed', () => {});

server.start();

process.on('uncaughtException', _err => {});
