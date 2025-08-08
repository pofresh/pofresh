const systemMonitor = require('../lib/systemMonitor');

function test() {
    systemMonitor.getSysInfo((_err, _data) => {});
}

test();
