const Client = require('../lib/protocol/socketio/sioClient');

const client = new Client({});
client.on('error', _err => {});

client.connect('127.0.0.1', 3005, _err => {});
