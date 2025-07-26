const Client = require('..').client;

// remote service interface path info list
const records = [
    {
        namespace: 'user',
        serverType: 'test',
        path: __dirname + '/remote/test'
    }
];

const context = {
    serverId: 'test-server-1'
};

// server info list
const servers = [
    {
        id: 'test-server-1',
        serverType: 'test',
        host: '127.0.0.1',
        port: 3333
    }
];

// route context passed to route function
const routeContext = servers;

// route function to caculate the remote server id
const routeFunc = function (_routeParam, _msg, routeContext, cb) {
    cb(null, routeContext[0].id);
};

const client = Client.create({
    routeContext: routeContext,
    router: routeFunc,
    context: context
});

let start = null;
client.start(function (_err) {
    console.log('rpc client start ok.');

    client.addProxies(records);
    client.addServers(servers);

    start = Date.now();
    run();
});

const numRequests = 100000;
let times = 0;
const mockData1 = 'hello';
let mockData2 = 'hello';

const numRepeat = 200; // 100 200 300 400 800

for (let i = 0; i < numRepeat; i++) {
    mockData2 += mockData1;
}

const mockData3 = {
    a: 'run',
    b: mockData2 + Date.now() + '_',
    time: Date.now()
};

const payload = mockData3;

// console.log(new Buffer(payload).length / 1024 + 'k');
console.log(Buffer.from(JSON.stringify(payload)).length / 1024 + 'k');

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
        // return;
        return run();
    }

    times++;
    rpcRequest(payload, function () {
        run();
    });
}

function rpcRequest(param, cb) {
    client.proxies.user.test.service.echo(null, param, 123, function (_err, _resp) {
        if (_err) {
            console.error(_err.stack);
        }
        // console.log(resp);
        cb();
    });
}
