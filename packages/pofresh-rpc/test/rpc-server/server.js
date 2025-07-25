const Server = require('../../').server;
const should = require('should');

const WAIT_TIME = 100;

const paths = [
    { namespace: 'user', path: __dirname + '/../mock-remote/area' },
    { namespace: 'sys', path: __dirname + '/../mock-remote/connector' }
];

const port = 3333;

describe('server', function () {
    describe('#create', function () {
        it('should create gateway by providing port and paths parameters', function (done) {
            const opts = {
                paths: paths,
                port: port
            };

            let errorCount = 0;
            let closeCount = 0;
            const gateway = Server.create(opts);

            expect(gateway);
            gateway.on('error', err => {
                errorCount++;
            });
            gateway.on('closed', () => {
                closeCount++;
            });

            gateway.start();
            gateway.stop();

            setTimeout(() => {
                errorCount.should.be.exactly(0);
                closeCount.should.be.exactly(1);
                done();
            }, WAIT_TIME);
        });

        it('should change the default acceptor by pass the acceptorFactory to the create function', function (done) {
            const oport = 3333;
            let constructCount = 0,
                listenCount = 0,
                closeCount = 0;

            class MockAcceptor {
                constructor(opts, cb) {
                    constructCount++;
                }

                listen(port) {
                    oport.should.be.exactly(port);
                    listenCount++;
                }

                close() {
                    closeCount++;
                }

                on() {}

                emit() {}
            }

            const acceptorFactory = {
                create: function (opts, cb) {
                    return new MockAcceptor(null, cb);
                }
            };

            const opts = {
                paths: paths,
                port: oport,
                acceptorFactory: acceptorFactory
            };

            const gateway = Server.create(opts);

            expect(gateway);

            gateway.start();
            gateway.stop();

            setTimeout(() => {
                constructCount.should.be.exactly(1);
                listenCount.should.be.exactly(1);
                closeCount.should.be.exactly(1);
                done();
            }, WAIT_TIME);
        });
    });
});
