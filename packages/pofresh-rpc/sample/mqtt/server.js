const net = require('net'),
    mqttCon = require('mqtt-connection'),
    server = new net.Server();
// const num = 300;
// const len = num * num;
// const i = 1;

// const start = 0;
server.on('connection', stream => {
    const conn = mqttCon(stream);

    conn.on('connect', () => {
        console.log('connected');
    });

    conn.on('publish', packet => {
        // console.log(packet);
        conn.puback({
            messageId: packet.messageId
        });
    });

    conn.on('pingreq', () => {
        conn.pingresp();
    });

    conn.on('error', err => console.log(err));
    // conn is your MQTT connection!
});

server.listen(1883);
console.log('server started.');
