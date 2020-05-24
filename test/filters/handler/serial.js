const should = require('should');
const serialFilter = require('../../../lib/filters/handler/serial');
const FilterService = require('../../../lib/common/service/filterService');

const mockSession = {
    key: "123"
};

const WAIT_TIME = 100;
describe("#serialFilter", function () {
    it("should do before filter ok", function (done) {
        let service = new FilterService();
        let filter = serialFilter();
        service.before(filter);

        service.beforeFilter(null, mockSession, function () {
            should.exist(mockSession);

            should.exist(mockSession.__serialTask__);
            done();
        });
    });

    it("should do after filter by doing before filter ok", function (done) {
        let service = new FilterService();
        let filter = serialFilter();
        let _session;
        service.before(filter);
        service.after(filter);

        service.beforeFilter(null, mockSession, function () {
            console.log('beforeFilter', mockSession);
            should.exist(mockSession);
            should.exist(mockSession.__serialTask__);
            _session = mockSession;
        });


        service.afterFilter(null, null, mockSession, null, function () {
            console.log('afterFilter=>', mockSession, _session);
            should.exist(mockSession);
            // should.strictEqual(mockSession, _session);
        });

        setTimeout(done, WAIT_TIME);
    });
});
