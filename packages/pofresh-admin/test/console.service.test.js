import { describe, it, expect, beforeAll } from 'vitest';
const flow = require('flow');
const ConsoleService = require('..');
const logger = require('pofresh-logger');

const WAIT_TIME = 100;

const masterHost = '127.0.0.1';
const masterPort = 3333;

describe('console service', function () {
    beforeAll(function () {
        logger.configure({
            appenders: {
                console: {
                    type: 'console'
                }
            },
            categories: {
                default: {
                    appenders: ['console'],
                    level: 'all'
                }
            },
            replaceConsole: true,
            rawMessage: false,
            lineDebug: true
        });
    });

    it('should forward message from master to the monitorHandler method of the module ' +
        'of the right monitor, and get the response by masterAgent.request', async function () {
        const monitorConfig1 = {
            id: 'connector-server-1',
            type: 'connector',
            moduleId: 'testModuleId1'
        };

        const monitorConfig2 = {
            id: 'area-server-1',
            type: 'area',
            moduleId: 'testModuleId2'
        };

        const msg1 = { msg: 'message to monitor1' };
        const msg2 = { msg: 'message to monitor2' };

        let req1Count = 0;
        let req2Count = 0;
        let resp1Count = 0;
        let resp2Count = 0;

        const masterConsole = ConsoleService.createMasterConsole({
            port: masterPort
        });

        const monitorConsole1 = ConsoleService.createMonitorConsole({
            host: masterHost,
            port: masterPort,
            id: monitorConfig1.id,
            type: monitorConfig1.type,
            info: { host: '127.0.0.1' }
        });

        monitorConsole1.register(monitorConfig1.moduleId, {
            monitorHandler(agent, msg, cb) {
                req1Count++;
                expect(msg).toBeDefined();
                expect(msg).toEqual(msg1);
                cb(null, msg);
            }
        });

        const monitorConsole2 = ConsoleService.createMonitorConsole({
            host: masterHost,
            port: masterPort,
            id: monitorConfig2.id,
            type: monitorConfig2.type,
            info: { host: '127.0.0.1' }
        });

        monitorConsole2.register(monitorConfig2.moduleId, {
            monitorHandler: function (_agent, msg, _cb) {
                req2Count++;
                expect(msg).toBeDefined();
                expect(msg).toEqual(msg2);
                _cb(null, msg);
            }
        });

        flow.exec(
            function () {
                masterConsole.start(this);
            },
            function (err) {
                expect(err).toBeFalsy();
                monitorConsole1.start(this);
            },
            function (err) {
                expect(err).toBeFalsy();
                monitorConsole2.start(this);
            },
            function (err) {
                expect(err).toBeFalsy();
                masterConsole.agent.request(monitorConsole1.id, monitorConfig1.moduleId, msg1, function (err, resp) {
                    resp1Count++;
                    expect(err).toBeFalsy();
                    expect(resp).toBeDefined();
                    expect(resp).toEqual(msg1);
                });

                masterConsole.agent.request(monitorConsole2.id, monitorConfig2.moduleId, msg2, function (err, resp) {
                    resp2Count++;
                    expect(err).toBeFalsy();
                    expect(resp).toBeDefined();
                    expect(resp).toEqual(msg2);
                });
            }
        ); // end of flow.exec

        await new Promise(resolve => {
            setTimeout(function () {
                expect(req1Count).toBe(1);
                expect(req2Count).toBe(1);
                expect(resp1Count).toBe(1);
                expect(resp2Count).toBe(1);

                monitorConsole1.stop();
                monitorConsole2.stop();
                masterConsole.stop();
                resolve();
            }, WAIT_TIME);
        });
    });

    it('should forward message from monitor to the masterHandler of the right module ' +
        'of the master by monitor.notify', async function () {
        const monitorId = 'connector-server-1';
        const monitorType = 'connector';
        const moduleId = 'testModuleId';
        const orgMsg = { msg: 'message to master' };

        let reqCount = 0;

        const masterConsole = ConsoleService.createMasterConsole({
            port: masterPort
        });

        masterConsole.register(moduleId, {
            masterHandler: function (_agent, msg, _cb) {
                reqCount++;
                expect(msg).toBeDefined();
                expect(msg).toEqual(orgMsg);
            }
        });

        const monitorConsole = ConsoleService.createMonitorConsole({
            host: masterHost,
            port: masterPort,
            id: monitorId,
            type: monitorType,
            info: { host: '127.0.0.1' }
        });

        flow.exec(
            function () {
                masterConsole.start(this);
            },
            function (err) {
                expect(err).toBeFalsy();
                monitorConsole.start(this);
            },
            function (err) {
                expect(err).toBeFalsy();
                monitorConsole.agent.notify(moduleId, orgMsg);
            }
        ); // end of flow.exec

        await new Promise(resolve => {
            setTimeout(function () {
                expect(reqCount).toBe(1);

                monitorConsole.stop();
                masterConsole.stop();
                resolve();
            }, WAIT_TIME);
        });
    });

    it('should fail if the module is disable', async function () {
        const monitorId = 'connector-server-1';
        const monitorType = 'connector';
        const moduleId = 'testModuleId';
        const orgMsg = { msg: 'message to someone' };

        const masterConsole = ConsoleService.createMasterConsole({
            port: masterPort
        });

        masterConsole.register(moduleId, {
            masterHandler: function (_agent, _msg, _cb) {
                // should not come here
                expect(true).toBe(false);
            }
        });

        const monitorConsole = ConsoleService.createMonitorConsole({
            host: masterHost,
            port: masterPort,
            id: monitorId,
            type: monitorType,
            info: { host: '127.0.0.1' }
        });

        monitorConsole.register(moduleId, {
            monitorHandler: function (_agent, _msg, _cb) {
                // should not come here
                expect(true).toBe(false);
            }
        });

        flow.exec(
            function () {
                masterConsole.start(this);
            },
            function (err) {
                expect(err).toBeFalsy();
                masterConsole.disable(moduleId);
                monitorConsole.start(this);
            },
            function (err) {
                expect(err).toBeFalsy();
                monitorConsole.disable(moduleId);
                monitorConsole.agent.notify(moduleId, orgMsg);
                masterConsole.agent.notifyById(monitorId, moduleId, orgMsg);
            }
        ); // end of flow.exec

        await new Promise(resolve => {
            setTimeout(function () {
                monitorConsole.stop();
                masterConsole.stop();
                resolve();
            }, WAIT_TIME);
        });
    });

    it('should fail if the monitor not exists', async function () {
        const monitorId = 'connector-server-1';
        const moduleId = 'testModuleId';
        const orgMsg = { msg: 'message to someone' };

        const masterConsole = ConsoleService.createMasterConsole({
            port: masterPort
        });

        flow.exec(
            function () {
                masterConsole.start(this);
            },
            function (err) {
                expect(err).toBeFalsy();
                masterConsole.agent.request(monitorId, moduleId, orgMsg, function (err, resp) {
                    expect(err).toBeDefined();
                    expect(resp).toBeUndefined();
                });
            }
        ); // end of flow.exec

        await new Promise(resolve => {
            setTimeout(function () {
                masterConsole.stop();
                resolve();
            }, WAIT_TIME);
        });
    });

    it('should invoke masterHandler periodically in pull mode', async function () {
        const moduleId = 'testModuleId';
        const intervalSec = 1;
        let invokeCount = 0;
        const turn = 2;

        const masterConsole = ConsoleService.createMasterConsole({
            port: masterPort
        });

        masterConsole.register(moduleId, {
            type: 'pull',
            interval: intervalSec,
            masterHandler: function (_agent, _msg, _cb) {
                invokeCount++;
            }
        });

        masterConsole.start();

        await new Promise(resolve => {
            setTimeout(
                function () {
                    expect(invokeCount).toBe(turn);
                    masterConsole.stop();
                    resolve();
                },
                intervalSec * (turn - 0.5) * 1000
            );
        });
    });

    it('should invoke monitorHandler periodically in push mode', async function () {
        const monitorId = 'connector-server-1';
        const monitorType = 'connector';
        const moduleId = 'testModuleId';
        const intervalSec = 1;
        let invokeCount = 0;
        const turn = 2;

        const masterConsole = ConsoleService.createMasterConsole({
            port: masterPort
        });

        const monitorConsole = ConsoleService.createMonitorConsole({
            host: masterHost,
            port: masterPort,
            id: monitorId,
            type: monitorType,
            info: { host: '127.0.0.1' }
        });

        monitorConsole.register(moduleId, {
            type: 'push',
            interval: intervalSec,
            monitorHandler: function (_agent, _msg, _cb) {
                invokeCount++;
            }
        });

        flow.exec(
            function () {
                masterConsole.start(this);
            },
            function (err) {
                expect(err).toBeFalsy();
                monitorConsole.start(this);
            },
            function (err) {
                expect(err).toBeFalsy();
            }
        );

        await new Promise(resolve => {
            setTimeout(
                function () {
                    expect(invokeCount).toBe(turn);
                    monitorConsole.stop();
                    masterConsole.stop();
                    resolve();
                },
                intervalSec * (turn - 0.5) * 1000
            );
        });
    });
});
