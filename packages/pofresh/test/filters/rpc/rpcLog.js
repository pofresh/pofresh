const should = require('should');
const RpcLogFilter = require('../../../lib/filters/rpc/rpcLog');

const mockData = {
    serverId: 'connector-server-1',
    msg: 'hello',
    opts: {}
};

describe('#rpcLogFilter', () => {
    it('should do after filter by before filter', done => {
        const rpcLogFilter = RpcLogFilter();
        rpcLogFilter.before(mockData.serverId, mockData.msg, mockData.opts, (_serverId, _msg, _opts) => {
            rpcLogFilter.after(mockData.serverId, mockData.msg, mockData.opts, () => {
                should.exist(mockData.opts.__start_time__);
                done();
            });
        });
    });
});
