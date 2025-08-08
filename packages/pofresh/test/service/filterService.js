const should = require('should');
const FilterService = require('../../lib/common/service/filterService');

const WAIT_TIME = 50;

const mockFilter1 = {
    before(msg, session, cb) {
        session.beforeCount1++;
        cb();
    },

    after(err, msg, session, resp, cb) {
        session.afterCount1++;
        cb();
    }
};

const mockFilter2 = {
    before(msg, session, cb) {
        session.beforeCount2++;
        cb();
    },

    after(err, msg, session, resp, cb) {
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
        it('should register before filter by calling before method and fire filter chain by calling beforeFilter', done => {
            const session = new MockSession();
            const service = new FilterService();
            service.before(mockFilter1);
            service.before(mockFilter2);
            service.beforeFilter(null, session, () => {
                should.exist(session);
                session.beforeCount1.should.equal(1);
                session.beforeCount2.should.equal(1);
                session.afterCount1.should.equal(0);
                session.afterCount2.should.equal(0);
                done();
            });
        });

        it('should register after filter by calling after method and fire filter chain by calling afterFilter', done => {
            const session = new MockSession();
            const service = new FilterService();
            service.after(mockFilter1);
            service.after(mockFilter2);
            service.afterFilter(null, null, session, null, () => {
                should.exist(session);
                session.beforeCount1.should.equal(0);
                session.beforeCount2.should.equal(0);
                session.afterCount1.should.equal(1);
                session.afterCount2.should.equal(1);
                done();
            });
        });

        it('should be ok if filter is a function', done => {
            const session = { beforeCount: 0, afterCount: 0 };
            const service = new FilterService();
            let beforeCount = 0,
                afterCount = 0;

            service.before((msg, session, cb) => {
                session.beforeCount++;
                cb();
            });
            service.after((err, msg, session, resp, cb) => {
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
                session.beforeCount.should.equal(1);
                session.afterCount.should.equal(1);
                beforeCount.should.equal(1);
                afterCount.should.equal(1);

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
                session.beforeCount1.should.equal(0);
                session.beforeCount2.should.equal(0);
                session.afterCount1.should.equal(0);
                session.afterCount2.should.equal(0);
                beforeCount.should.equal(0);
                afterCount.should.equal(0);

                done();
            }, WAIT_TIME);
        });

        it('should pass the err and resp parameters to callback and ignore the filters behind if them specified in before filter', done => {
            const session = new MockSession();
            const service = new FilterService();
            const error = 'some error message';
            const response = { key: 'some value' };
            const respFilter = {
                before(msg, session, cb) {
                    cb(error, response);
                }
            };

            service.before(mockFilter1);
            service.before(respFilter);
            service.before(mockFilter2);
            service.beforeFilter(null, session, (err, resp) => {
                should.exist(err);
                err.should.equal(error);
                should.exist(resp);
                resp.should.equal(response);

                session.beforeCount1.should.equal(1);
                session.beforeCount2.should.equal(0);
                session.afterCount1.should.equal(0);
                session.afterCount2.should.equal(0);

                done();
            });
        });
    });
});
