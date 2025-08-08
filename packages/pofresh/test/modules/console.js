const should = require('should');
const consoleModule = require('../../lib/modules/console');

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
            const module = new consoleModule(opts);
            const agent1 = {
                type: 'area'
            };
            const msg1 = { signal: 'stop' };
            module.monitorHandler(agent1, msg1);
            flag.should.eql(true);

            const msg2 = { signal: 'list' };
            const agent2 = {
                type: 'chat',
                id: 'chat-server-1'
            };
            module.monitorHandler(agent2, msg2, obj => {
                obj.serverId.should.eql('chat-server-1');
                obj.body.serverType.should.eql('chat');
            });

            const msg3 = { signal: 'addCron' };
            module.monitorHandler(agent2, msg3, null);
            rs.length.should.eql(1);

            const msg4 = { signal: 'removeCron' };
            module.monitorHandler(agent2, msg4, null);
            rs.length.should.eql(1);

            const msg5 = { signal: 'blacklist', blacklist: ['127.0.0.1'] };
            module.monitorHandler(agent1, msg5, null);
            opts.app.components.__connector__.blacklist.length.should.eql(1);
        });
    });

    describe('#clientHandler', () => {
        let _exit;
        let _setTimeout;
        let exitCount = 0;

        before(done => {
            _exit = process.exit;
            _setTimeout = setTimeout;
            done();
        });

        after(done => {
            process.exit = _exit;
            setTimeout = _setTimeout;
            done();
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
                            return __dirname + '/../../index.js';
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
        const module = new consoleModule(opts);
        it('should execute kill command', done => {
            const msg = { signal: 'kill' };
            process.exit = () => {
                exitCount++;
            };
            setTimeout = (cb, timeout) => {
                if (timeout > 3000) {
                    timeout = 3000;
                }
                _setTimeout(cb, timeout);
            };

            const agent1 = {
                request(recordId, moduleId, msg, cb) {
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
                should.not.exist(err);
                should.exist(result.code);
            });

            const agent2 = {
                request(recordId, moduleId, msg, cb) {
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
                should.not.exist(err);
                should.exist(result.code);
                result.code.should.eql('remained');
                done();
            });
        }).timeout(5000);

        it('should execute stop command', done => {
            const msg1 = { signal: 'stop', ids: ['chat-server-1'] };
            const msg2 = { signal: 'stop', ids: [] };
            const agent = {
                notifyById(serverId, moduleId, msg) {},
                notifyAll(moduleId, msg) {}
            };
            module.clientHandler(agent, msg1, (err, result) => {
                result.status.should.eql('part');
            });

            module.clientHandler(agent, msg2, (err, result) => {
                result.status.should.eql('all');
                done();
            });
        }).timeout(5000);

        it('should execute list command', () => {
            const msg = { signal: 'list' };
            const agent = {
                request(recordId, moduleId, msg, cb) {
                    cb({ serverId: 'chat-server-1', body: { server: {} } });
                },
                idMap: {
                    'chat-server-1': {
                        type: 'chat',
                        id: 'chat-server-1'
                    }
                }
            };
            module.clientHandler(agent, msg, (err, result) => {
                should.exist(result.msg);
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
                should.not.exist(err);
                result.length.should.eql(0);
            });
            module.clientHandler(agent, msg2, (err, result) => {
                result.status.should.eql('ok');
            });
        });

        it('should execute blacklist command', () => {
            const msg1 = { signal: 'blacklist', args: ['127.0.0.1'] };
            const msg2 = { signal: 'blacklist', args: ['abc'] };
            const agent = {
                notifyAll(moduleId, msg) {}
            };
            module.clientHandler(agent, msg1, (err, result) => {
                result.status.should.eql('ok');
            });
            module.clientHandler(agent, msg2, (err, result) => {
                should.exist(err);
            });
        });

        it('should execute restart command', () => {
            const msg1 = { signal: 'restart', ids: ['chat-server-1'] };
            const msg2 = { signal: 'restart', type: 'chat', ids: [] };
            const agent = {
                request(recordId, moduleId, msg, cb) {
                    cb(null);
                }
            };
            module.clientHandler(agent, msg1, (err, result) => {
                should.exist(err);
            });
            module.clientHandler(agent, msg2, (err, result) => {
                should.exist(err);
            });
        });
    });
});
