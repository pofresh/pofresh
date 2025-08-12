import { describe, expect, it } from 'vitest';
import pofresh from '../../index.js';
import ChannelService from '../../lib/common/service/channelService.js';

const mockBase = `${process.cwd()}/test`;
const channelName = 'test_channel';
const mockApp = { serverId: 'test-server-1' };

describe('channel test', () => {
    describe('#add', () => {
        it('should add a member into channel and could fetch it later', () => {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            expect(channel).toBeDefined();

            const uid = 'uid1',
                sid = 'sid1';
            expect(channel.add(uid, sid)).toBe(true);

            const member = channel.getMember(uid);
            expect(member).toBeDefined();
            expect(uid).toBe(member.uid);
            expect(sid).toBe(member.sid);
        });

        it('should fail if the sid not specified', () => {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            expect(channel).toBeDefined();

            const uid = 'uid1';
            expect(channel.add(uid, null)).toBe(false);
        });

        it('should fail after the channel has been destroied', () => {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            expect(channel).toBeDefined();

            channel.destroy();

            const uid = 'uid1',
                sid = 'sid1';
            expect(channel.add(uid, sid)).toBe(false);
        });
    });

    describe('#leave', () => {
        it('should remove the member from channel when leave', () => {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            expect(channel).toBeDefined();

            const uid = 'uid1',
                sid = 'sid1';
            expect(channel.add(uid, sid)).toBe(true);

            let member = channel.getMember(uid);
            expect(member).toBeDefined();

            channel.leave(uid, sid);
            member = channel.getMember(uid);
            expect(member).toBeUndefined();
        });

        it('should fail if uid or sid not specified', () => {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            expect(channel).toBeDefined();

            const uid = 'uid1',
                sid = 'sid1';
            expect(channel.add(uid, sid)).toBe(true);

            expect(channel.leave(uid, null)).toBe(false);
            expect(channel.leave(null, sid)).toBe(false);
        });
    });

    describe('#getMembers', () => {
        it('should return all the members of channel', () => {
            const uinfos = [
                { uid: 'uid1', sid: 'sid1' },
                { uid: 'uid2', sid: 'sid2' },
                { uid: 'uid3', sid: 'sid3' }
            ];

            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);

            let i, l, item;
            for (i = 0, l = uinfos.length; i < l; i++) {
                item = uinfos[i];
                channel.add(item.uid, item.sid);
            }

            const members = channel.getMembers();
            expect(members).toBeDefined();
            expect(members.length).toBe(uinfos.length);
            for (i = 0, l = uinfos.length; i < l; i++) {
                item = uinfos[i];
                expect(members).toContainEqual(item.uid);
            }
        });
    });

    describe('#pushMessage', () => {
        it('should push message to the right frontend server by sid', () => {
            return new Promise(resolve => {
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
                    expect(mockMsg).toEqual(msg);

                    for (const uid of uids) {
                        const r2 = uidMap[uid];
                        expect(r2.sid).toBe(sid);
                    }

                    cb();
                };

                const app = pofresh.createApp({ base: mockBase });
                app.rpcInvoke = mockRpcInvoke;
                const channelService = new ChannelService(app);

                const channel = channelService.createChannel(channelName);
                for (const mockUid of mockUids) {
                    channel.add(mockUid.uid, mockUid.sid);
                }

                channel.pushMessage(mockMsg, () => {
                    expect(invokeCount).toBe(2);
                    resolve();
                });
            });
        });
        it('should fail if channel has destroied', () => {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            expect(channel).toBeDefined();

            channel.destroy();

            return new Promise(resolve => {
                channel.pushMessage('test.route', {}, {}, err => {
                    expect(err).toBeDefined();
                    expect(err.message).toBe('channel is not running now');
                    resolve();
                });
            });
        });
    });
});
