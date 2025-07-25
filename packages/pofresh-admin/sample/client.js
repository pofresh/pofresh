const Client = require('../lib/protocol/socketio/sioClient');

const client = new Client({});
client.on('error', err => console.error(err));

client.connect('127.0.0.1', 3005, err => {
    console.log(err);
});
