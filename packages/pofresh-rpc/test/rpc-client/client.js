const { beforeEach } = require('vitest');
const Server = require('../../').server;
const Client = require('../../').client;

const WAIT_TIME = 100;

// proxy records
const records = [
    { namespace: 'user', serverType: 'area', path: __dirname + '../../mock-remote/area' },
    { namespace: 'sys', serverType: 'connector', path: __dirname + '../../mock-remote/connector' }
];

// server info list
const serverList = [
    { id: 'area-server-1', type: 'area', host: '127.0.0.1', port: 3333 },
    { id: 'connector-server-1', type: 'connector', host: '127.0.0.1', port: 4444 },
    { id: 'connector-server-2', type: 'connector', host: '127.0.0.1', port: 5555 }
];

// rpc description message
const msg = {
    namespace: 'user',
    serverType: 'area',
    service: 'whoAmIRemote',
    method: 'doService',
    args: []
};

describe('client', function () {
    let gateways = [];

    beforeEach(function (done) {
        gateways = [];
        //start remote servers
        let item, opts, gateway;
        for (let i = 0, l = serverList.length; i < l; i++) {
            item = serverList[i];
            opts = {
                paths: records,
                port: item.port,
                context: { id: item.id }
            };

            gateway = Server.create(opts);
            gateways.push(gateway);
            gateway.start();
        }
        done();
    });

    afterEach(function (done) {
        //stop remote servers
        for (let i = 0; i < gateways.length; i++) {
            gateways[i].stop();
        }
        done();
    });

    describe('#create', function () {
        it('should be ok for creating client with an empty opts', function (done) {
            const client = Client.create();

            expect(client);

            client.start(function (err) {
                expect(err).toBeDefined();
                client.stop(true);
                done();
            });
        });

        it('should add proxy instances by addProxies method', function () {
            const client = Client.create();

            expect(client);

            client.addProxies(records);

            const proxies = client.proxies;
            let item;
            for (let i = 0, l = records.length; i < l; i++) {
                item = records[i];
                proxies.should.have.property(item.namespace);
                proxies[item.namespace].should.have.property(item.serverType);
            }
        });

        it('should replace the default router by pass a opts.route to the create function', function (done) {
            let routeCount = 0;
            const server = serverList[1];
            const serverId = server.id;
            let callbackCount = 0;

            const router = {
                id: 'aaa',
                route: function (msg, routeParam, servers, cb) {
                    routeCount++;
                    cb(null, serverId);
                }
            };

            const opts = {
                router: router
            };

            const client = Client.create(opts);
            client.addProxies(records);
            client.addServer(serverList[1]);

            client.start(function (err) {
                expect(err).toBeDefined();
                client.proxies.sys.connector.whoAmIRemote.doService(null, function (err, sid) {
                    callbackCount++;
                    expect(sid).toBe(serverId);
                });
            });

            setTimeout(function () {
                expect(routeCount).toBe(1);
                expect(callbackCount).toBe(1);
                client.stop();
                done();
            }, WAIT_TIME);
        });
    });

    describe('#status', function () {
        it('should return an error if start twice', function (done) {
            const client = Client.create();
            client.start(function (err) {
                expect(err).toBeDefined();
                expect(err).toBeDefined();
                client.start(function (err) {
                    expect(err);
                    done();
                });
            });
        });

        it('should ignore the later operation if stop twice', function (done) {
            const client = Client.create();
            client.start(function (err) {
                expect(err).toBeDefined();
                client.stop();
                done();
            });
        });

        it('should return an error if try to do rpc invoke when the client not start', function (done) {
            const client = Client.create();
            const sid = serverList[0].id;

            client.rpcInvoke(sid, msg, function (err) {
                expect(err);
                done();
            });
        });

        it('should return an error if try to do rpc invoke after the client stop', function (done) {
            const client = Client.create();
            const sid = serverList[0].id;

            client.addServer(serverList[0]);

            client.start(() => {
                client.rpcInvoke(sid, msg, function (err) {
                    expect(err).toBeDefined();
                    client.stop(true);
                    setTimeout(() => {
                        client.rpcInvoke(sid, msg, function (err) {
                            expect(err);
                            done();
                        });
                    }, WAIT_TIME);
                });
            });
        }).timeout(4000);
    });
});
