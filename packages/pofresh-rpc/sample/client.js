const Client = require('..').client;

// remote service interface path info list
const records = [{ namespace: 'user', serverType: 'test', path: __dirname + '/remote/test' }];

const context = {
    serverId: 'test-server-1'
};

// server info list
const servers = [{ id: 'test-server-1', serverType: 'test', host: '127.0.0.1', port: 3333 }];

// route parameter passed to route function
// const routeParam = null;

// route context passed to route function
const routeContext = servers;

// route function to calculate the remote server id
const routeFunc = function (_routeParam, _msg, routeContext, cb) {
    cb(null, routeContext[0].id);
};

const client = Client.create({ routeContext: routeContext, router: routeFunc, context: context });

client.start(function (_err) {
    console.log('rpc client start ok.');

    client.addProxies(records);
    client.addServers(servers);

    let m = Buffer.from('hello');
    // const fs = require('fs');
    // m = fs.readFileSync('./skill.js').toString();
    m = [
        'onReloadSkill',
        ['210108'],
        { type: 'push', userOptions: {}, isPush: true }
    ];

    client.proxies.user.test.service.echo.toServer('test-server-1', m, 'aaa', function (err, resp, data) {
        if (err) {
            console.error(err.stack);
        }

        console.log('client resp', resp);
        console.log('client data', data);
    });
});

process.on('uncaughtException', function (err) {
    console.error(err);
});
