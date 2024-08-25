const should = require('should');
const RpcLogFilter = require('../../../lib/filters/rpc/rpcLog');

const mockData = {
    serverId: "connector-server-1",
    msg: "hello",
    opts: {}
};

describe('#rpcLogFilter', function () {
    it("should do after filter by before filter", function (done) {
        const rpcLogFilter = RpcLogFilter();
        rpcLogFilter.before(mockData.serverId, mockData.msg, mockData.opts, function (serverId, msg, opts) {
            rpcLogFilter.after(mockData.serverId, mockData.msg, mockData.opts, function () {
                should.exist(mockData.opts.__start_time__);
                done();
            });
        });
    });
});
