const should = require('should');
const HandlerService = require('../../lib/common/service/handlerService');

const mockApp = {
    serverType: 'connector',

    get(key) {
        return this[key];
    }
};

const mockSession = {
    exportSession() {
        return this;
    }
};

const mockMsg = { key: 'some request message' };
const mockRouteRecord = {
    serverType: 'connector',
    handler: 'testHandler',
    method: 'testMethod'
};

describe('handler service test', () => {
    describe('handle', () => {
        it('should dispatch the request to the handler if the route match current server type', done => {
            let invoke1Count = 0,
                invoke2Count = 0;
            // mock datas
            const mockHandlers = {
                testHandler: {
                    testMethod(msg, _session, next) {
                        invoke1Count++;
                        msg.should.eql(mockMsg);
                        next();
                    }
                },
                test2Handler: {
                    testMethod(_msg, _session, next) {
                        invoke2Count++;
                        next();
                    }
                }
            };

            const mockOpts = {};

            const service = new HandlerService(mockApp, mockOpts);
            service.handlerMap = { connector: mockHandlers };

            service.handle(mockRouteRecord, mockMsg, mockSession, () => {
                invoke1Count.should.equal(1);
                invoke2Count.should.equal(0);
                done();
            });
        });

        it('should return an error if can not find the appropriate handler locally', done => {
            const mockHandlers = {};
            const mockOpts = {};
            const service = new HandlerService(mockApp, mockOpts);
            service.handlerMap = { connector: mockHandlers };

            service.handle(mockRouteRecord, mockMsg, mockSession, err => {
                should.exist(err);
                done();
            });
        });
    });
});
