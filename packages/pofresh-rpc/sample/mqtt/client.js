const net = require('net'),
    mqttCon = require('mqtt-connection'),
    stream = net.createConnection(1883, 'localhost'),
    conn = mqttCon(stream);
let start = null;

conn.connect(
    {
        clientId: 'test'
    },
    () => {
        start = Date.now();
        run();
    }
);

conn.on('puback', () => {
    run();
});

conn.on('pingresp', () => {
    run();
});

const numRequests = 20_000;
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
    // conn.pingreq();
    conn.publish(
        {
            topic: 'topic',
            payload,
            qos: 1,
            messageId: times
        },
        () => {
            // run();
        }
    );
}
