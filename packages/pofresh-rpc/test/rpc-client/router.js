const lib = process.env.POFRESH_RPC_COV ? 'lib-cov' : 'lib';
const route = require('../../' + lib + '/rpc-client/router').df;

const WAIT_TIME = 20;
describe('router', () => {
    const servers = {
        logic: [
            { id: 'logic-server-1', host: 'localhost', port: 3333 },
            { id: 'logic-server-2', host: 'localhost', port: 4444 }
        ],
        area: [{ id: 'area-servere-1', host: 'localhost', port: 5555 }],

        getServersByType(serverType) {
            return this[serverType];
        }
    };

    const msg = {
        serverType: 'logic',
        service: 'rpcRemote',
        method: 'someMethod',
        args: []
    };

    const session = {
        uid: 'changchang005@gmail.com'
    };

    describe('#route', () => {
        it('should return the same result for the same user if the mapping info not changed', done => {
            let firstRoute, secondRoute;

            route(session, msg, servers, (err, sid) => {
                expect(sid);
                firstRoute = sid;
            });

            route(session, msg, servers, (err, sid) => {
                expect(sid);
                secondRoute = sid;
            });

            setTimeout(() => {
                expect(firstRoute).toBe(secondRoute);
                done();
            }, WAIT_TIME);
        });

        it('should return an error if try to route to an invalid server type', done => {
            const invalidMsg = {
                serverType: 'invalid-type',
                service: 'rpcRemote',
                method: 'someMethod',
                args: []
            };

            route(session, invalidMsg, servers, (err, _sid) => {
                expect(err);
                done();
            });
        });

        it('should be ok when session or session.uid is null', done => {
            let okCount = 0;
            route(null, msg, servers, (err, sid) => {
                expect(sid).toBeDefined();
                okCount++;
            });

            const session = {
                uid: null
            };

            route(session, msg, servers, (err, sid) => {
                expect(sid).toBeDefined();
                okCount++;
            });

            setTimeout(() => {
                expect(okCount).toBe(2);
                done();
            }, WAIT_TIME);
        });
    });
});
