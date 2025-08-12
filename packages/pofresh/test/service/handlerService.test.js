import { describe, expect, it } from 'vitest';
import HandlerService from '../../lib/common/service/handlerService.js';

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
        it('should dispatch the request to the handler if the route match current server type', async () => {
            let invoke1Count = 0,
                invoke2Count = 0;
            // mock datas
            const mockHandlers = {
                testHandler: {
                    testMethod(msg, _session, next) {
                        invoke1Count++;
                        expect(msg).toEqual(mockMsg);
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

            await new Promise((resolve, _reject) => {
                service.handle(mockRouteRecord, mockMsg, mockSession, () => {
                    expect(invoke1Count).toBe(1);
                    expect(invoke2Count).toBe(0);
                    resolve();
                });
            });
        });

        it('should return an error if can not find the appropriate handler locally', async () => {
            const mockHandlers = {};
            const mockOpts = {};
            const service = new HandlerService(mockApp, mockOpts);
            service.handlerMap = { connector: mockHandlers };

            await new Promise((resolve, _reject) => {
                service.handle(mockRouteRecord, mockMsg, mockSession, err => {
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });
    });
});
