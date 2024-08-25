const processMonitor = require('../lib/processMonitor');

function test() {
    const param = {
        pid: 4838,
        serverId: 'auth-server-1'
    };
    processMonitor.getPsInfo(param, function (err, data) {
        if (!!err) {
            console.log(err);
            return;
        }
        console.log('process information is :', data);
    });
};
test();
