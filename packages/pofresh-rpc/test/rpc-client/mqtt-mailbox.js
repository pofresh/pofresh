const lib = process.env.POFRESH_RPC_COV ? 'lib-cov' : 'lib';
const should = require('should');
const Mailbox = require('../../' + lib + '/rpc-client/mailboxes/mqtt-mailbox');
const Server = require('../../').server;
const Tracer = require('../../lib/util/tracer');

const WAIT_TIME = 100;

const paths = [
    {
        namespace: 'user',
        serverType: 'area',
        path: __dirname + '../../mock-remote/area'
    },
    {
        namespace: 'sys',
        serverType: 'connector',
        path: __dirname + '../../mock-remote/connector'
    }
];

const port = 3333;

const server = {
    id: 'area-server-1',
    host: '127.0.0.1',
    port
};

const msg = {
    namespace: 'user',
    serverType: 'area',
    service: 'addOneRemote',
    method: 'doService',
    args: [1]
};

const tracer = new Tracer(console, false);

describe('mqtt mailbox test', () => {
    let gateway;

    beforeEach(done => {
        //start remote server
        const opts = {
            acceptorFactory: Server.MqttAcceptor,
            paths,
            port,
            // bufferMsg: true,
            interval: 30
        };

        gateway = Server.create(opts);
        gateway.start();
        done();
    });

    afterEach(done => {
        //stop remote server
        gateway.stop();
        done();
        setTimeout(() => process.exit(), WAIT_TIME);
    });

    describe('#create', () => {
        it('should be ok for creating a mailbox and connect to the right remote server', done => {
            const mailbox = Mailbox.create(server);
            expect(mailbox);
            mailbox.connect(tracer, err => {
                should.not.exist(err);
                mailbox.close();
                done();
            });
        });

        it('should return an error if connect fail', done => {
            const server = {
                id: 'area-server-1',
                host: '127.0.0.1',
                port: -1000 //invalid port
            };

            const mailbox = Mailbox.create(server);
            expect(mailbox);
            mailbox.connect(tracer, err => {
                expect(err);
                done();
            });
        }).timeout(5000);
    });

    describe('#send', () => {
        it('should send request to remote server and get the response from callback function', done => {
            const mailbox = Mailbox.create(server);
            mailbox.connect(tracer, _err => {
                expect(_err).toBeUndefined();
                mailbox.send(tracer, msg, null, (_tracer, err, res) => {
                    expect(res).toBeDefined();
                    expect(res[1]).toBe(msg.args[0] + 1);
                    mailbox.close();
                    done();
                });
            });
        });

        it('should distinguish different services and keep the right request/response relationship', done => {
            const value = 1;
            const msg1 = {
                namespace: 'user',
                serverType: 'area',
                service: 'addOneRemote',
                method: 'doService',
                args: [value]
            };
            const msg2 = {
                namespace: 'user',
                serverType: 'area',
                service: 'addOneRemote',
                method: 'doAddTwo',
                args: [value]
            };
            const msg3 = {
                namespace: 'user',
                serverType: 'area',
                service: 'addThreeRemote',
                method: 'doService',
                args: [value]
            };
            let callbackCount = 0;

            const mailbox = Mailbox.create(server);
            mailbox.connect(tracer, err => {
                should.not.exist(err);

                mailbox.send(tracer, msg1, null, (tracer, err, res) => {
                    expect(res).toBeDefined();
                    expect(res[1]).toBe(value + 1);
                    callbackCount++;
                });

                mailbox.send(tracer, msg2, null, (tracer, err, res) => {
                    expect(res).toBeDefined();
                    expect(res[1]).toBe(value + 2);
                    callbackCount++;
                });

                mailbox.send(tracer, msg3, null, (tracer, err, res) => {
                    expect(res).toBeDefined();
                    expect(res[1]).toBe(value + 3);
                    callbackCount++;
                });
            });

            setTimeout(() => {
                expect(callbackCount).toBe(3);
                if (mailbox) {
                    mailbox.close();
                }
                done();
            }, WAIT_TIME);
        });

        // eslint-disable-next-line max-len
        it('should distinguish different services and keep the right request/response relationship when use message cache mode', done => {
            const value = 1;
            const msg1 = {
                namespace: 'user',
                serverType: 'area',
                service: 'addOneRemote',
                method: 'doService',
                args: [value]
            };
            const msg2 = {
                namespace: 'user',
                serverType: 'area',
                service: 'addOneRemote',
                method: 'doAddTwo',
                args: [value]
            };
            const msg3 = {
                namespace: 'user',
                serverType: 'area',
                service: 'addThreeRemote',
                method: 'doService',
                args: [value]
            };
            let callbackCount = 0;

            const mailbox = Mailbox.create(server, { bufferMsg: true });
            mailbox.connect(tracer, err => {
                should.not.exist(err);

                mailbox.send(tracer, msg1, null, (tracer, err, res) => {
                    expect(res);
                    expect(res[1]).toBe(value + 1);
                    callbackCount++;
                });

                mailbox.send(tracer, msg2, null, (tracer, err, res) => {
                    expect(res);
                    expect(res[1]).toBe(value + 2);
                    callbackCount++;
                });

                mailbox.send(tracer, msg3, null, (tracer, err, res) => {
                    expect(res);
                    expect(res[1]).toBe(value + 3);
                    callbackCount++;
                });
            });

            setTimeout(() => {
                expect(callbackCount).toBe(3);
                if (mailbox) {
                    mailbox.close();
                }
                done();
            }, WAIT_TIME * 10);
        });

        // eslint-disable-next-line max-len
        it('should distinguish different services and keep the right request/response relationship if the client uses message cache mode but server not', done => {
            //start a new remote server without message cache mode
            const opts = {
                paths,
                port: 3051
            };

            const gateway = Server.create(opts);
            gateway.start();

            const value = 1;
            const msg1 = {
                namespace: 'user',
                serverType: 'area',
                service: 'addOneRemote',
                method: 'doService',
                args: [value]
            };
            const msg2 = {
                namespace: 'user',
                serverType: 'area',
                service: 'addOneRemote',
                method: 'doAddTwo',
                args: [value]
            };
            const msg3 = {
                namespace: 'user',
                serverType: 'area',
                service: 'addThreeRemote',
                method: 'doService',
                args: [value]
            };
            let callbackCount = 0;

            const mailbox = Mailbox.create(server, { bufferMsg: true });
            mailbox.connect(tracer, err => {
                should.not.exist(err);

                mailbox.send(tracer, msg1, null, (tracer, err, res) => {
                    expect(res);
                    expect(res[1]).toBe(value + 1);
                    callbackCount++;
                });

                mailbox.send(tracer, msg2, null, (tracer, err, res) => {
                    expect(res);
                    expect(res[1]).toBe(value + 2);
                    callbackCount++;
                });

                mailbox.send(tracer, msg3, null, (tracer, err, res) => {
                    expect(res);
                    expect(res[1]).toBe(value + 3);
                    callbackCount++;
                });
            });

            setTimeout(() => {
                expect(callbackCount).toBe(3);
                if (mailbox) {
                    mailbox.close();
                }
                gateway.stop();
                done();
            }, WAIT_TIME * 10);
        });
    });

    describe('#close', () => {
        it('should emit a close event when mailbox close', done => {
            let closeEventCount = 0;
            const mailbox = Mailbox.create(server);
            mailbox.connect(tracer, err => {
                should.not.exist(err);
                mailbox.on('close', () => {
                    closeEventCount++;
                });
                mailbox.close();
            });

            setTimeout(() => {
                expect(closeEventCount).toBe(1);
                done();
            }, WAIT_TIME);
        });

        it('should return an error when try to send message by a closed mailbox', done => {
            const mailbox = Mailbox.create(server);
            mailbox.connect(tracer, err => {
                should.not.exist(err);
                mailbox.close();
                mailbox.send(tracer, msg, null, (tracer, err) => {
                    expect(err);
                    done();
                });
            });
        });
    });
});
