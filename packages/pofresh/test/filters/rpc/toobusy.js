const should = require('should');
const ToobusyFilter = require('../../../lib/filters/rpc/toobusy');

const mockData = {
    serverId: 'connector-server-1',
    msg: 'hello',
    opts: {}
};

describe('#toobusyFilter', () => {
    it('should no callback for toobusy', done => {
        const toobusyFilter = ToobusyFilter(10, 100);
        function load() {
            let callbackInvoked = true;
            toobusyFilter.before(mockData.serverId, mockData.msg, mockData.opts, err => {
                if (err) callbackInvoked = false;
            });

            if (!callbackInvoked) {
                console.log(' logic of toobusy enterd, done!');
                return done();
            }
            const start = new Date();
            while (new Date() - start < 250) {
                for (let i = 0; i < 1e5; ) i++;
            }
            setTimeout(load, 0);
        }

        load();
    }).timeout(5000);
});
