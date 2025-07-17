const Client = require('..').client;

// remote service interface path info list
const records = [{ namespace: 'user', serverType: 'test', path: __dirname + '/remote/test' }];

const context = {
  serverId: 'test-server-1'
};

// server info list
const servers = [{ id: 'test-server-1', serverType: 'test', host: '127.0.0.1', port: 3333 }];

// route parameter passed to route function
const routeParam = null;

// route context passed to route function
const routeContext = servers;

// route function to caculate the remote server id
const routeFunc = function(routeParam, msg, routeContext, cb) {
  cb(null, routeContext[0].id);
};

const client = Client.create({ routeContext: routeContext, router: routeFunc, context: context });

client.start(function(err) {
  console.log('rpc client start ok.');

  client.addProxies(records);
  client.addServers(servers);

  let m = Buffer.from('hello');
  // n = 'bbb';
  const fs = require('fs');
  // m = fs.readFileSync('./skill.js').toString();
  m = [
    'onReloadSkill',
    // [ m ],
    ['210108'],
    { type: 'push', userOptions: {}, isPush: true }
  ];
  // m = ['route', [m], {}, {}];
  // m = require('./test');
  // m = 3.14;
  // m = 'aaa';
  // m = 100325;
  // m = {a: '111', b: 'bbb', c: 'ccc'};
  // m = [1, '2', {a: 'bbb'}, 3.12, m, false];
  // m = false;
  // m = '0';

  client.proxies.user.test.service.echo.toServer('test-server-1', m, 'aaa', function(err, resp, data) {
    // client.proxies.user.test.service.echo(routeParam, m, 'aaa', function (err, resp, data) {
    if (err) {
      console.error(err.stack);
    }

    // setTimeout(function() {
    console.log('client resp', resp);
    console.log('client data', data);
    // console.log(typeof resp)
    // console.log(resp.toString())
    // }, 1000);
  });
});

process.on('uncaughtException', function(err) {
  console.error(err);
});
