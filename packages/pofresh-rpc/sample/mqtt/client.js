const net = require('net'),
    mqttCon = require('mqtt-connection'),
    stream = net.createConnection(1883, 'localhost'),
    conn = mqttCon(stream);
let start = null;

conn.connect(
    {
        clientId: 'test'
    },
    function () {
        console.log('client connected');
        start = Date.now();
        run();
    }
);

conn.on('puback', function () {
    run();
});

conn.on('pingresp', function () {
    run();
});

const numRequests = 20000;
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
    // conn.pingreq();
    conn.publish(
        {
            topic: 'topic',
            payload: payload,
            qos: 1,
            messageId: times
        },
        function () {
            // run();
        }
    );
}
