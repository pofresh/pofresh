const should = require('should');
const timeoutFilter = require('../../../lib/filters/handler/timeout');
const FilterService = require('../../../lib/common/service/filterService');
const mockSession = {
    key: '123'
};

const WAIT_TIME = 100;
describe('#serialFilter', () => {
    it('should do before filter ok', done => {
        const service = new FilterService();
        const filter = timeoutFilter();
        service.before(filter);

        service.beforeFilter({}, mockSession, () => {
            should.exist(mockSession);

            should.exist(mockSession.__timeout__);
            done();
        });
    });

    it('should do after filter by doing before filter ok', done => {
        const service = new FilterService();
        const filter = timeoutFilter();
        let _session;
        service.before(filter);

        service.beforeFilter(null, mockSession, () => {
            should.exist(mockSession);
            should.exist(mockSession.__timeout__);
            _session = mockSession;
        });

        service.after(filter);

        service.afterFilter(null, null, mockSession, null, () => {
            should.exist(mockSession);
            should.strictEqual(mockSession, _session);
        });

        setTimeout(done, WAIT_TIME);
    });
});
