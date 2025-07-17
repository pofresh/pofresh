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

// route parameter passed to route function
const routeParam = null;

// route context passed to route function
const routeContext = servers;

// route function to caculate the remote server id
const routeFunc = function(routeParam, msg, routeContext, cb) {
  cb(null, routeContext[0].id);
};

const client = Client.create({
  routeContext: routeContext,
  router: routeFunc,
  context: context
});

let start = null;
client.start(function(err) {
  console.log('rpc client start ok.');

  client.addProxies(records);
  client.addServers(servers);

  start = Date.now();
  run();
});

const num_requests = 100000;
let times = 0;
const mock_data_1 = 'hello';
let mock_data_2 = 'hello';

const num_repeat = 200; // 100 200 300 400 800

for (let i = 0; i < num_repeat; i++) {
  mock_data_2 += mock_data_1;
}

const mock_data_3 = {
  a: 'run',
  b: mock_data_2 + Date.now() + '_',
  time: Date.now()
};

const payload = mock_data_3;

// console.log(new Buffer(payload).length / 1024 + 'k');
console.log(Buffer.from(JSON.stringify(payload)).length / 1024 + 'k');

function run() {
  if (times > num_requests) {
    return;
  }

  if (times == num_requests) {
    const now = Date.now();
    const cost = now - start;
    console.log(
      'run %d num requests cost: %d ops/sec',
      num_requests,
      cost,
      (num_requests / (cost / 1000)).toFixed(2)
    );
    times = 0;
    start = now;
    // return;
    return run();
  }

  times++;
  rpcRequest(payload, function() {
    run();
  });
}

function rpcRequest(param, cb) {
  client.proxies.user.test.service.echo(routeParam, param, 123, function(err, resp) {
    if (err) {
      console.error(err.stack);
    }
    // console.log(resp);
    cb();
  });
}
