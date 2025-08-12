import { describe, expect, it } from 'vitest';
import FilterService from '../../lib/common/service/filterService.js';

const WAIT_TIME = 50;

const mockFilter1 = {
    before(_msg, session, cb) {
        session.beforeCount1++;
        cb();
    },

    after(_err, _msg, session, _resp, cb) {
        session.afterCount1++;
        cb();
    }
};

const mockFilter2 = {
    before(_msg, session, cb) {
        session.beforeCount2++;
        cb();
    },

    after(_err, _msg, session, _resp, cb) {
        session.afterCount2++;
        cb();
    }
};

const blackholdFilter = {
    before() {},
    after() {}
};

const MockSession = function () {
    this.beforeCount1 = 0;
    this.afterCount1 = 0;
    this.beforeCount2 = 0;
    this.afterCount2 = 0;
};

describe('filter service test', () => {
    describe('#filter', () => {
        it('should register before filter by calling before method and fire filter chain by calling beforeFilter', async () => {
            const session = new MockSession();
            const service = new FilterService();
            service.before(mockFilter1);
            service.before(mockFilter2);
            
            await new Promise(resolve => {
                service.beforeFilter(null, session, () => {
                    expect(session).toBeDefined();
                    expect(session.beforeCount1).toBe(1);
                    expect(session.beforeCount2).toBe(1);
                    expect(session.afterCount1).toBe(0);
                    expect(session.afterCount2).toBe(0);
                    resolve();
                });
            });
        });

        it('should register after filter by calling after method and fire filter chain by calling afterFilter', async () => {
            const session = new MockSession();
            const service = new FilterService();
            service.after(mockFilter1);
            service.after(mockFilter2);
            
            await new Promise(resolve => {
                service.afterFilter(null, null, session, null, () => {
                    expect(session).toBeDefined();
                    expect(session.beforeCount1).toBe(0);
                    expect(session.beforeCount2).toBe(0);
                    expect(session.afterCount1).toBe(1);
                    expect(session.afterCount2).toBe(1);
                    resolve();
                });
            });
        });

        it('should be ok if filter is a function', done => {
            const session = { beforeCount: 0, afterCount: 0 };
            const service = new FilterService();
            let beforeCount = 0,
                afterCount = 0;

            service.before((_msg, session, cb) => {
                session.beforeCount++;
                cb();
            });
            service.after((_err, _msg, session, _resp, cb) => {
                session.afterCount++;
                cb();
            });
            service.beforeFilter(null, session, () => {
                beforeCount++;
            });
            service.afterFilter(null, null, session, null, () => {
                afterCount++;
            });

            setTimeout(() => {
                expect(session.beforeCount).toBe(1);
                expect(session.afterCount).toBe(1);
                expect(beforeCount).toBe(1);
                expect(afterCount).toBe(1);

                done();
            }, WAIT_TIME);
        });

        it('should not invoke the callback if filter not invoke callback', done => {
            const session = new MockSession();
            const service = new FilterService();
            let beforeCount = 0,
                afterCount = 0;

            service.before(blackholdFilter);
            service.after(blackholdFilter);
            service.beforeFilter(null, session, () => {
                beforeCount++;
            });
            service.afterFilter(null, null, session, null, () => {
                afterCount++;
            });

            setTimeout(() => {
                expect(session.beforeCount1).toBe(0);
                expect(session.beforeCount2).toBe(0);
                expect(session.afterCount1).toBe(0);
                expect(session.afterCount2).toBe(0);
                expect(beforeCount).toBe(0);
                expect(afterCount).toBe(0);

                done();
            }, WAIT_TIME);
        });

        it('should pass the err and resp parameters to callback and ignore the filters behind if them specified in before filter', async () => {
            const session = new MockSession();
            const service = new FilterService();
            const error = 'some error message';
            const response = { key: 'some value' };
            const respFilter = {
                before(_msg, _session, cb) {
                    cb(error, response);
                }
            };

            service.before(mockFilter1);
            service.before(respFilter);
            service.before(mockFilter2);
            
            await new Promise(resolve => {
                service.beforeFilter(null, session, (err, resp) => {
                    expect(err).toBeDefined();
                    expect(err).toBe(error);
                    expect(resp).toBeDefined();
                    expect(resp).toBe(response);

                    expect(session.beforeCount1).toBe(1);
                    expect(session.beforeCount2).toBe(0);
                    expect(session.afterCount1).toBe(0);
                    expect(session.afterCount2).toBe(0);

                    resolve();
                });
            });
        });
    });
});
