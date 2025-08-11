import { describe, expect, it } from 'vitest';
import RpcLogFilter from '../../../lib/filters/rpc/rpcLog.js';

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
                expect(mockData.opts.__start_time__).toBeDefined();
                done();
            });
        });
    });
});
