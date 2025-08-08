const processMonitor = require('../lib/processMonitor');

function test() {
    const param = {
        pid: 4838,
        serverId: 'auth-server-1'
    };
    processMonitor.getPsInfo(param, (err, _data) => {
        if (err) {
            return;
        }
    });
}
test();
