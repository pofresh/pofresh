import { describe, expect, it } from 'vitest';

const flow = require('flow');
const Master = require('../lib/master/masterAgent');
const Monitor = require('../lib/monitor/monitorAgent');

const WAIT_TIME = 200;

const masterHost = '127.0.0.1';
const masterPort = 3333;

describe('agent', () => {
    const authServer = (_msg, _env, cb) => {
        cb('ok');
    };

    const masterConsole = {
        authServer
    };

    it('should forward the message from master to the right monitor and get the response by reuqest', async () => {
        const monitorId1 = 'connector-server-1';
        const monitorId2 = 'area-server-1';
        const monitorType1 = 'connector';
        const monitorType2 = 'area';
        const moduleId1 = 'testModuleId1';
        const moduleId2 = 'testModuleId2';
        const msg1 = { msg: 'message to monitor1' };
        const msg2 = { msg: 'message to monitor2' };

        let req1Count = 0;
        let req2Count = 0;
        let resp1Count = 0;
        let resp2Count = 0;

        const monitorConsole1 = {
            authServer,
            execute(receivedModuleId, _method, msg, _cb) {
                req1Count++;
                expect(receivedModuleId).toBe(moduleId1);
                _cb(null, msg);
            }
        };

        const monitorConsole2 = {
            authServer,
            execute(receivedModuleId, _method, msg, _cb) {
                req2Count++;
                expect(receivedModuleId).toBe(moduleId2);
                _cb(null, msg);
            }
        };

        const master = new Master(masterConsole);
        const monitor1 = new Monitor(monitorConsole1, {
            id: monitorId1,
            type: monitorType1,
            info: {
                host: '127.0.0.1'
            }
        });
        const monitor2 = new Monitor(monitorConsole2, {
            id: monitorId2,
            type: monitorType2,
            info: {
                host: '127.0.0.1'
            }
        });

        master.listen(masterPort);
        flow.exec(
            function () {
                monitor1.connect(masterPort, masterHost, this);
            },
            function (err) {
                expect(err).toBeFalsy();
                monitor2.connect(masterPort, masterHost, this);
            },
            err => {
                expect(err).toBeFalsy();
                master.request(monitorId1, moduleId1, msg1, (err, resp) => {
                    resp1Count++;
                    expect(err).toBeFalsy();
                    expect(resp).toBeDefined();
                    expect(resp).toEqual(msg1);
                });

                master.request(monitorId2, moduleId2, msg2, (err, resp) => {
                    resp2Count++;
                    expect(err).toBeFalsy();
                    expect(resp).toBeDefined();
                    expect(resp).toEqual(msg2);
                });
            }
        );

        await new Promise(resolve => {
            setTimeout(() => {
                expect(req1Count).toBe(1);
                expect(req2Count).toBe(1);
                expect(resp1Count).toBe(1);
                expect(resp2Count).toBe(1);
                monitor1.close();
                monitor2.close();
                master.close();
                resolve();
            }, WAIT_TIME);
        });
    });

    it('should return error to master if monitor cb with a error by reuqest', async () => {
        const monitorId = 'connector-server-1';
        const monitorType = 'connector';
        const moduleId = 'testModuleId';
        const msg = { msg: 'message to monitor' };
        const errMsg = 'some error message from monitor';

        let reqCount = 0;
        let respCount = 0;

        const monitorConsole = {
            authServer,
            execute(receivedModuleId, _method, _msg, _cb) {
                reqCount++;
                expect(receivedModuleId).toBe(moduleId);
                _cb(new Error(errMsg));
            }
        };

        const master = new Master(masterConsole);
        const monitor = new Monitor(monitorConsole, {
            id: monitorId,
            type: monitorType,
            info: {
                host: '127.0.0.1'
            }
        });

        master.listen(masterPort);

        flow.exec(
            function () {
                monitor.connect(masterPort, masterHost, this);
            },
            err => {
                expect(err).toBeFalsy();
                master.request(monitorId, moduleId, msg, (err, resp) => {
                    respCount++;
                    expect(err).toBeDefined();
                    expect(err.message).toBe(errMsg);
                    expect(resp).toBeUndefined();
                });
            }
        );

        await new Promise(resolve => {
            setTimeout(() => {
                expect(reqCount).toBe(1);
                expect(respCount).toBe(1);
                monitor.close();
                master.close();
                resolve();
            }, WAIT_TIME);
        });
    });

    it('should forward the message from master to the right monitor by notifyById', async () => {
        const monitorId1 = 'connector-server-1';
        const monitorId2 = 'area-server-1';
        const monitorType1 = 'connector';
        const monitorType2 = 'area';
        const moduleId1 = 'testModuleId1';
        const moduleId2 = 'testModuleId2';
        const msg1 = { msg: 'message to monitor1' };
        const msg2 = { msg: 'message to monitor2' };

        let req1Count = 0;
        let req2Count = 0;

        const monitorConsole1 = {
            authServer,
            execute(receivedModuleId, _method, receivedMsg, _cb) {
                req1Count++;
                expect(receivedModuleId).toBe(moduleId1);
                expect(receivedMsg).toEqual(msg1);
            }
        };

        const monitorConsole2 = {
            authServer,
            execute(receivedModuleId, _method, receivedMsg, _cb) {
                req2Count++;
                expect(receivedModuleId).toBe(moduleId2);
                expect(receivedMsg).toEqual(msg2);
            }
        };

        const master = new Master(masterConsole);
        const monitor1 = new Monitor(monitorConsole1, {
            id: monitorId1,
            type: monitorType1,
            info: { host: '127.0.0.1' }
        });
        const monitor2 = new Monitor(monitorConsole2, {
            id: monitorId2,
            type: monitorType2,
            info: { host: '127.0.0.1' }
        });

        master.listen(masterPort);

        flow.exec(
            function () {
                monitor1.connect(masterPort, masterHost, this);
            },
            function (err) {
                expect(err).toBeFalsy();
                monitor2.connect(masterPort, masterHost, this);
            },
            err => {
                expect(err).toBeFalsy();
                master.notifyById(monitorId1, moduleId1, msg1);
                master.notifyById(monitorId2, moduleId2, msg2);
            }
        );

        await new Promise(resolve => {
            setTimeout(() => {
                expect(req1Count).toBe(1);
                expect(req2Count).toBe(1);

                monitor1.close();
                monitor2.close();
                master.close();

                resolve();
            }, WAIT_TIME);
        });
    });

    it('should forward the message to the right type monitors by notifyByType', async () => {
        const monitorId1 = 'connector-server-1';
        const monitorId2 = 'connector-server-2';
        const monitorId3 = 'area-server-1';
        const monitorType1 = 'connector';
        const monitorType2 = 'area';
        const moduleId1 = 'testModuleId1';
        const moduleId2 = 'testModuleId2';
        const msg1 = { msg: 'message to monitorType1' };
        const msg2 = { msg: 'message to monitorType2' };

        let req1Count = 0;
        let req2Count = 0;
        let req3Count = 0;
        let reqType1Count = 0;
        let reqType2Count = 0;

        const monitorConsole1 = {
            authServer,
            execute(receivedModuleId, _method, receivedMsg, _cb) {
                req1Count++;
                reqType1Count++;
                expect(receivedModuleId).toBe(moduleId1);
                expect(receivedMsg).toEqual(msg1);
            }
        };

        const monitorConsole2 = {
            authServer,
            execute(receivedModuleId, _method, receivedMsg, _cb) {
                req2Count++;
                reqType1Count++;
                expect(receivedModuleId).toBe(moduleId1);
                expect(receivedMsg).toEqual(msg1);
            }
        };

        const monitorConsole3 = {
            authServer,
            execute(receivedModuleId, _method, receivedMsg, _cb) {
                req3Count++;
                reqType2Count++;
                expect(receivedModuleId).toBe(moduleId2);
                expect(receivedMsg).toEqual(msg2);
            }
        };

        const master = new Master(masterConsole);
        const monitor1 = new Monitor(monitorConsole1, {
            id: monitorId1,
            type: monitorType1,
            info: { host: '127.0.0.1' }
        });
        const monitor2 = new Monitor(monitorConsole2, {
            id: monitorId2,
            type: monitorType1,
            info: { host: '127.0.0.1' }
        });
        const monitor3 = new Monitor(monitorConsole3, {
            id: monitorId3,
            type: monitorType2,
            info: { host: '127.0.0.1' }
        });

        master.listen(masterPort);
        flow.exec(
            function () {
                monitor1.connect(masterPort, masterHost, this);
            },
            function (err) {
                expect(err).toBeFalsy();
                monitor2.connect(masterPort, masterHost, this);
            },
            function (err) {
                expect(err).toBeFalsy();
                monitor3.connect(masterPort, masterHost, this);
            },
            err => {
                expect(err).toBeFalsy();
                master.notifyByType(monitorType1, moduleId1, msg1);
                master.notifyByType(monitorType2, moduleId2, msg2);
            }
        );

        await new Promise(resolve => {
            setTimeout(() => {
                expect(req1Count).toBe(1);
                expect(req2Count).toBe(1);
                expect(req3Count).toBe(1);
                expect(reqType1Count).toBe(2);
                expect(reqType2Count).toBe(1);

                monitor1.close();
                monitor2.close();
                monitor3.close();
                master.close();

                resolve();
            }, WAIT_TIME);
        });
    });

    it('should forward the message to all monitors by notifyAll', async () => {
        const monitorId1 = 'connector-server-1';
        const monitorId2 = 'area-server-1';
        const monitorType1 = 'connector';
        const monitorType2 = 'area';
        const orgModuleId = 'testModuleId';
        const orgMsg = { msg: 'message to all monitor' };

        let req1Count = 0;
        let req2Count = 0;

        const monitorConsole1 = {
            authServer,
            execute(receivedModuleId, _method, receivedMsg, _cb) {
                req1Count++;
                expect(receivedModuleId).toBe(orgModuleId);
                expect(receivedMsg).toEqual(orgMsg);
            }
        };

        const monitorConsole2 = {
            authServer,
            execute(receivedModuleId, _method, receivedMsg, _cb) {
                req2Count++;
                expect(receivedModuleId).toBe(orgModuleId);
                expect(receivedMsg).toEqual(orgMsg);
            }
        };

        const master = new Master(masterConsole);
        const monitor1 = new Monitor(monitorConsole1, {
            id: monitorId1,
            type: monitorType1,
            info: { host: '127.0.0.1' }
        });
        const monitor2 = new Monitor(monitorConsole2, {
            id: monitorId2,
            type: monitorType2,
            info: { host: '127.0.0.1' }
        });

        master.listen(masterPort);
        flow.exec(
            function () {
                monitor1.connect(masterPort, masterHost, this);
            },
            function (err) {
                expect(err).toBeFalsy();
                monitor2.connect(masterPort, masterHost, this);
            },
            err => {
                expect(err).toBeFalsy();
                master.notifyAll(orgModuleId, orgMsg);
            }
        );

        await new Promise(resolve => {
            setTimeout(() => {
                expect(req1Count).toBe(1);
                expect(req2Count).toBe(1);

                monitor1.close();
                monitor2.close();
                master.close();

                resolve();
            }, WAIT_TIME);
        });
    });

    it('should push the message from monitor to master by notify', async () => {
        const monitorId = 'connector-server-1';
        const monitorType = 'connector';
        const orgModuleId = 'testModuleId';
        const orgMsg = { msg: 'message to master' };

        let reqCount = 0;

        const masterConsole = {
            authServer,
            execute(moduleId, _method, msg, _cb) {
                reqCount++;
                expect(orgModuleId).toBe(moduleId);
                expect(msg).toEqual(orgMsg);
            }
        };

        const monitorConsole = {
            authServer
        };

        const master = new Master(masterConsole);
        const monitor = new Monitor(monitorConsole, {
            id: monitorId,
            type: monitorType,
            info: { host: '127.0.0.1' }
        });

        master.listen(masterPort);
        flow.exec(
            function () {
                monitor.connect(masterPort, masterHost, this);
            },
            err => {
                expect(err).toBeFalsy();
                monitor.notify(orgModuleId, orgMsg);
            }
        );

        await new Promise(resolve => {
            setTimeout(() => {
                expect(reqCount).toBe(1);

                monitor.close();
                master.close();

                resolve();
            }, WAIT_TIME);
        });
    });
});
