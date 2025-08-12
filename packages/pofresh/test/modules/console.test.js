import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import consoleModule from '../../lib/modules/console.js';

describe('console module test', () => {
    describe('#monitorHandler', () => {
        it('should execute the corresponding command with different signals', () => {
            let flag;
            let rs;
            const opts = {
                app: {
                    components: {
                        __connector__: {
                            blacklist: []
                        }
                    },
                    stop(value) {
                        flag = value;
                    },
                    addCrons(array) {
                        rs = array;
                    },
                    removeCrons(array) {
                        rs = array;
                    },
                    isFrontend() {
                        return true;
                    }
                }
            };
            const module = consoleModule(opts);
            const agent1 = {
                type: 'area'
            };
            const msg1 = { signal: 'stop' };
            module.monitorHandler(agent1, msg1);
            expect(flag).toEqual(true);

            const msg2 = { signal: 'list' };
            const agent2 = {
                type: 'chat',
                id: 'chat-server-1'
            };
            module.monitorHandler(agent2, msg2, obj => {
                expect(obj.serverId).toEqual('chat-server-1');
                expect(obj.body.serverType).toEqual('chat');
            });

            const msg3 = { signal: 'addCron' };
            module.monitorHandler(agent2, msg3, null);
            expect(rs.length).toEqual(1);

            const msg4 = { signal: 'removeCron' };
            module.monitorHandler(agent2, msg4, null);
            expect(rs.length).toEqual(1);

            const msg5 = { signal: 'blacklist', blacklist: ['127.0.0.1'] };
            module.monitorHandler(agent1, msg5, null);
            expect(opts.app.components.__connector__.blacklist.length).toEqual(1);
        });
    });

    describe('#clientHandler', () => {
        let _exit;
        let _setTimeout;
        let _exitCount = 0;

        beforeAll(() => {
            _exit = process.exit;
            _setTimeout = setTimeout;
        });

        afterAll(() => {
            process.exit = _exit;
            setTimeout = _setTimeout;
        });

        const opts = {
            app: {
                clusterSeq: {},
                stop(value) {
                    return value;
                },
                getServerById() {
                    return {
                        host: '127.0.0.1'
                    };
                },
                getServers() {
                    return {
                        'chat-server-1': {}
                    };
                },
                get(value) {
                    switch (value) {
                        case 'main':
                            return `${__dirname}/../../index.js`;
                        case 'env':
                            return 'dev';
                    }
                },
                set(value) {
                    return value;
                },
                getServersByType() {
                    return [{ id: 'chat-server-1' }];
                }
            }
        };
        const module = consoleModule(opts);
        it('should execute kill command', () => {
            return new Promise(resolve => {
                const msg = { signal: 'kill' };
                process.exit = () => {
                    _exitCount++;
                };
                const originalSetTimeout = setTimeout;
                global.setTimeout = (cb, timeout) => {
                    if (timeout > 3000) {
                        timeout = 3000;
                    }
                    originalSetTimeout(cb, timeout);
                };

                const agent1 = {
                    request(_recordId, _moduleId, _msg, cb) {
                        cb('chat-server-1');
                    },
                    idMap: {
                        'chat-server-1': {
                            type: 'chat',
                            id: 'chat-server-1'
                        }
                    }
                };
                module.clientHandler(agent1, msg, (err, result) => {
                    expect(err).toBeNull();
                    expect(result.code).toBeDefined();
                });

                const agent2 = {
                    request(_recordId, _moduleId, _msg, cb) {
                        cb(null);
                    },
                    idMap: {
                        'chat-server-1': {
                            type: 'chat',
                            id: 'chat-server-1'
                        }
                    }
                };
                module.clientHandler(agent2, msg, (err, result) => {
                    expect(err).toBeNull();
                    expect(result.code).toBeDefined();
                    expect(result.code).toEqual('remained');
                    resolve();
                });
            });
        });

        it('should execute stop command', () => {
            return new Promise(resolve => {
                const msg1 = { signal: 'stop', ids: ['chat-server-1'] };
                const msg2 = { signal: 'stop', ids: [] };
                const agent = {
                    notifyById(_serverId, _moduleId, _msg) {
                        // Mock implementation
                    },
                    notifyAll(_moduleId, _msg) {
                        // Mock implementation
                    }
                };
                module.clientHandler(agent, msg1, (_err, result) => {
                    expect(result.status).toEqual('part');
                });

                module.clientHandler(agent, msg2, (_err, result) => {
                    expect(result.status).toEqual('all');
                    resolve();
                });
            });
        });

        it('should execute list command', () => {
            const msg = { signal: 'list' };
            const agent = {
                request(_recordId, _moduleId, _msg, cb) {
                    cb({ serverId: 'chat-server-1', body: { server: {} } });
                },
                idMap: {
                    'chat-server-1': {
                        type: 'chat',
                        id: 'chat-server-1'
                    }
                }
            };
            module.clientHandler(agent, msg, (_err, result) => {
                expect(result.msg).toBeDefined();
            });
        });

        it('should execute add command', () => {
            const msg1 = {
                signal: 'add',
                args: ['host=127.0.0.1', 'port=88888', 'clusterCount=2']
            };
            const msg2 = {
                signal: 'add',
                args: ['host=127.0.0.1', 'port=88888', 'id=chat-server-1', 'serverType=chat']
            };
            const agent = {};
            module.clientHandler(agent, msg1, (err, result) => {
                expect(err).toBeNull();
                expect(result.length).toEqual(0);
            });
            module.clientHandler(agent, msg2, (_err, result) => {
                expect(result.status).toEqual('ok');
            });
        });

        it('should execute blacklist command', () => {
            const msg1 = { signal: 'blacklist', args: ['127.0.0.1'] };
            const msg2 = { signal: 'blacklist', args: ['abc'] };
            const agent = {
                notifyAll(_moduleId, _msg) {
                    // Mock implementation
                }
            };
            module.clientHandler(agent, msg1, (_err, result) => {
                expect(result.status).toEqual('ok');
            });
            module.clientHandler(agent, msg2, (err, _result) => {
                expect(err).toBeDefined();
            });
        });

        it('should execute restart command', () => {
            const msg1 = { signal: 'restart', ids: ['chat-server-1'] };
            const msg2 = { signal: 'restart', type: 'chat', ids: [] };
            const agent = {
                request(_recordId, _moduleId, _msg, cb) {
                    cb(null);
                }
            };
            module.clientHandler(agent, msg1, (err, _result) => {
                expect(err).toBeDefined();
            });
            module.clientHandler(agent, msg2, (err, _result) => {
                expect(err).toBeDefined();
            });
        });
    });
});
