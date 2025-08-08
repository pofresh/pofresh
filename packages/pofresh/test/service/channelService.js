const should = require('should');
const pofresh = require('../../');
const ChannelService = require('../../lib/common/service/channelService');

const channelName = 'test_channel';
const mockBase = `${process.cwd()}/test`;
const mockApp = { serverId: 'test-server-1' };

describe('channel manager test', () => {
    describe('#createChannel', () => {
        it('should create and return a channel with the specified name', () => {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            should.exist(channel);
            channelName.should.equal(channel.name);
        });

        it('should return the same channel if the name has already existed', () => {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            should.exist(channel);
            channelName.should.equal(channel.name);
            const channel2 = channelService.createChannel(channelName);
            channel.should.equal(channel2);
        });
    });

    describe('#destroyChannel', () => {
        it('should delete the channel instance', () => {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            should.exist(channel);
            channelName.should.equal(channel.name);
            channelService.destroyChannel(channelName);
            const channel2 = channelService.createChannel(channelName);
            channel.should.not.equal(channel2);
        });
    });

    describe('#getChannel', () => {
        it('should return the channel with the specified name if it exists', () => {
            const channelService = new ChannelService(mockApp);
            channelService.createChannel(channelName);
            const channel = channelService.getChannel(channelName);
            should.exist(channel);
            channelName.should.equal(channel.name);
        });

        it('should return undefined if the channel dose not exist', () => {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.getChannel(channelName);
            should.not.exist(channel);
        });

        it('should create and return a new channel if create parameter is set', () => {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.getChannel(channelName, true);
            should.exist(channel);
            channelName.should.equal(channel.name);
        });
    });

    describe('#pushMessageByUids', () => {
        it('should push message to the right frontend server', () => {
            return new Promise(resolve => {
            const sid1 = 'sid1',
                sid2 = 'sid2';
            const uid1 = 'uid1',
                uid2 = 'uid2',
                uid3 = 'uid3';
            const orgRoute = 'test.route.string';
            const mockUids = [
                { sid: sid1, uid: uid1 },
                { sid: sid2, uid: uid2 },
                { sid: sid2, uid: uid3 }
            ];
            const mockMsg = { key: 'some remote message' };
            const uidMap = {};
            for (const mockUid of mockUids) {
                if (Object.hasOwn(mockUid, 'uid')) {
                    uidMap[mockUid.uid] = mockUid;
                }
            }

            let invokeCount = 0;

            const mockRpcInvoke = (sid, rmsg, cb) => {
                invokeCount++;
                const args = rmsg.args;
                const _route = args[0];
                const msg = args[1];
                const uids = args[2];
                mockMsg.should.eql(msg);

                for (const uid of uids) {
                    const r2 = uidMap[uid];
                    r2.sid.should.equal(sid);
                }

                cb();
            };

            const app = pofresh.createApp({ base: mockBase });
            app.rpcInvoke = mockRpcInvoke;
            const channelService = new ChannelService(app);

            channelService.pushMessageByUids(orgRoute, mockMsg, mockUids, () => {
                invokeCount.should.equal(2);
                resolve();
            });
            });
        });

        it('should return an err if uids is empty', () => {
            return new Promise(resolve => {
            const mockMsg = { key: 'some remote message' };
            const app = pofresh.createApp({ base: mockBase });
            const channelService = new ChannelService(app);

            channelService.pushMessageByUids(mockMsg, null, err => {
                should.exist(err);
                err.message.should.equal('uids should not be empty');
                resolve();
            });
            });
        });

        it('should return err if all message fail to push', () => {
            return new Promise(_resolve => {
            const sid1 = 'sid1',
                sid2 = 'sid2';
            const uid1 = 'uid1',
                uid2 = 'uid2',
                uid3 = 'uid3';
            const mockUids = [
                { sid: sid1, uid: uid1 },
                { sid: sid2, uid: uid2 },
                { sid: sid2, uid: uid3 }
            ];
            const mockMsg = { key: 'some remote message' };
            const uidMap = {};
            for (const i in mockUids) {
                uidMap[mockUids[i].uid] = mockUids[i];
            }

            let invokeCount = 0;

            const mockRpcInvoke = (_sid, _rmsg, cb) => {
                invokeCount++;
                cb(new Error('[TestMockError] mock rpc error'));
            };

            const app = pofresh.createApp({ base: mockBase });
            app.rpcInvoke = mockRpcInvoke;
            const channelService = new ChannelService(app);

            channelService.pushMessageByUids(mockMsg, mockUids, err => {
                invokeCount.should.equal(2);
                should.exist(err);
                err.message.should.equal('all uids push message fail');
                done();
            });
        });

        it('should return fail uid list if fail to push messge to some of the uids', done => {
            const sid1 = 'sid1',
                sid2 = 'sid2';
            const uid1 = 'uid1',
                uid2 = 'uid2',
                uid3 = 'uid3';
            const mockUids = [
                { sid: sid1, uid: uid1 },
                { sid: sid2, uid: uid2 },
                { sid: sid2, uid: uid3 }
            ];
            const mockMsg = { key: 'some remote message' };
            const uidMap = {};
            for (const i in mockUids) {
                uidMap[mockUids[i].uid] = mockUids[i];
            }

            let invokeCount = 0;

            const mockRpcInvoke = (_sid, rmsg, cb) => {
                invokeCount++;
                if (rmsg.args[2].indexOf(uid1) >= 0) {
                    cb(null, [uid1]);
                } else if (rmsg.args[2].indexOf(uid3) >= 0) {
                    cb(null, [uid3]);
                } else {
                    cb();
                }
            };

            const app = pofresh.createApp({ base: mockBase });
            app.rpcInvoke = mockRpcInvoke;
            const channelService = new ChannelService(app);

            channelService.pushMessageByUids(mockMsg, mockUids, (err, fails) => {
                invokeCount.should.equal(2);
                should.not.exist(err);
                should.exist(fails);
                fails.length.should.equal(2);
                fails.should.containEql(uid1);
                fails.should.containEql(uid3);
                done();
            });
        });
    });

    describe('#broadcast', () => {
        it('should push message to all specified frontend servers', done => {
            const mockServers = [
                { id: 'connector-1', serverType: 'connector', other: 'xxx1' },
                { id: 'connector-2', serverType: 'connector', other: 'xxx2' },
                { id: 'area-1', serverType: 'area', other: 'yyy1' },
                { id: 'gate-1', serverType: 'gate', other: 'zzz1' },
                { id: 'gate-2', serverType: 'gate', other: 'xxx1' },
                { id: 'gate-3', serverType: 'gate', other: 'yyy1' }
            ];
            const connectorIds = ['connector-1', 'connector-2'];
            const mockSType = 'connector';
            const mockRoute = 'test.route.string';
            const mockBinded = true;
            const opts = { binded: mockBinded };
            const mockMsg = { key: 'some remote message' };

            let invokeCount = 0;
            const sids = [];

            const mockRpcInvoke = (sid, rmsg, cb) => {
                invokeCount++;
                const args = rmsg.args;
                const route = args[0];
                const msg = args[1];
                const opts = args[2];
                mockMsg.should.eql(msg);
                mockRoute.should.equal(route);
                should.exist(opts);
                mockBinded.should.equal(opts.userOptions.binded);
                sids.push(sid);
                cb();
            };

            const app = pofresh.createApp({ base: mockBase });
            app.rpcInvoke = mockRpcInvoke;
            app.addServers(mockServers);
            const channelService = new ChannelService(app);

            channelService.broadcast(mockSType, mockRoute, mockMsg, opts, () => {
                invokeCount.should.equal(2);
                sids.length.should.equal(connectorIds.length);
                for (let i = 0, l = connectorIds.length; i < l; i++) {
                    sids.should.containEql(connectorIds[i]);
                }
                done();
            });
        });
    });
});
