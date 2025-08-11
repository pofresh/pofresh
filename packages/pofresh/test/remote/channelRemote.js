import { describe, expect, it } from 'vitest';
import pofresh from '../../index.js';
import remote from '../../lib/common/remote/frontend/channelRemote.js';
import ChannelService from '../../lib/common/service/channelService.js';
import SessionService from '../../lib/common/service/sessionService.js';

const mockBase = `${process.cwd()}/test`;

const _WAIT_TIME = 200;

describe('channel remote test', () => {
    describe('#pushMessage', () => {
        it('should push message the the specified clients', () => {
            return new Promise(resolve => {
                const sids = [1, 2, 3, 4, 5, 6];
                const uids = [11, 12, 13];
                const frontendId = 'frontend-server-id';
                const mockRoute = 'mock-route-string';
                const mockMsg = { msg: 'some test msg' };
                let invokeCount = 0;
                const invokeUids = [];

                const sessionService = new SessionService();
                sessionService.sendMessageByUid = (uid, msg) => {
                    expect(mockMsg).toEqual(msg);
                    invokeCount++;
                    invokeUids.push(uid);
                };

                let session;
                for (let i = 0, l = sids.length, j = 0; i < l; i++) {
                    session = sessionService.create(sids[i], frontendId);
                    if (i % 2) {
                        sessionService.bind(session.id, uids[j]);
                        j++;
                    }
                }
                const app = pofresh.createApp({ base: mockBase });
                app.components.__connector__ = {
                    send(reqId, route, msg, recvs, opts, cb) {
                        app.components.__pushScheduler__.schedule(reqId, route, msg, recvs, opts, cb);
                    }
                };
                app.components.__connector__.connector = {};
                app.components.__pushScheduler__ = {
                    schedule(_reqId, _route, msg, recvs, _opts, cb) {
                        expect(mockMsg).toEqual(msg);
                        invokeCount += recvs.length;
                        let sess;
                        for (const recv of recvs) {
                            sess = sessionService.get(recv);
                            if (sess) {
                                invokeUids.push(sess.uid);
                            }
                        }
                        cb();
                    }
                };
                app.set('sessionService', sessionService);
                const channelRemote = remote(app);
                channelRemote.pushMessage(mockRoute, mockMsg, uids, { isPush: true }, () => {
                    expect(invokeCount).toBe(uids.length);
                    expect(invokeUids.length).toBe(uids.length);
                    for (const uid of uids) {
                        expect(invokeUids).toContainEqual(uid);
                    }
                    resolve();
                });
            });
        });
    });

    describe('#broadcast', () => {
        it('should broadcast to all the client connected', () => {
            return new Promise(resolve => {
                const sids = [1, 2, 3, 4, 5];
                const uids = [11, 12, 13, 14, 15];
                const frontendId = 'frontend-server-id';
                const mockRoute = 'mock-route-string';
                const mockMsg = { msg: 'some test msg' };
                let invokeCount = 0;

                const sessionService = new SessionService();
                const channelService = new ChannelService();

                let session;
                for (let i = 0; i < sids.length; i++) {
                    session = sessionService.create(sids[i], frontendId);
                    if (i % 2) {
                        session.bind(uids[i]);
                    }
                }

                const app = pofresh.createApp({ base: mockBase });
                app.components.__connector__ = {
                    send(reqId, route, msg, recvs, opts, cb) {
                        app.components.__pushScheduler__.schedule(reqId, route, msg, recvs, opts, cb);
                    }
                };
                app.components.__connector__.connector = {};
                app.components.__pushScheduler__ = {
                    schedule(_reqId, _route, msg, _recvs, opts, cb) {
                        invokeCount++;
                        expect(mockMsg).toEqual(msg);
                        expect(opts).toBeDefined();
                        expect(opts.type).toBe('broadcast');
                        cb();
                    }
                };
                app.set('sessionService', sessionService);
                app.set('channelService', channelService);
                const channelRemote = remote(app);
                channelRemote.broadcast(mockRoute, mockMsg, { type: 'broadcast' }, () => {
                    expect(invokeCount).toBe(1);
                    resolve();
                });
            });
        });

        it('should broadcast to all the binded client connected', () => {
            return new Promise(resolve => {
                const sids = [1, 2, 3, 4, 5, 6];
                const uids = [11, 12, 13];
                const frontendId = 'frontend-server-id';
                const mockRoute = 'mock-route-string';
                const mockMsg = { msg: 'some test msg' };
                let invokeCount = 0;
                const _invokeUids = [];

                const sessionService = new SessionService();
                const channelService = new ChannelService();

                let session;
                let j = 0;
                for (let i = 0; i < sids.length; i++) {
                    session = sessionService.create(sids[i], frontendId);
                    if (i % 2) {
                        session.bind(uids[j]);
                        j++;
                    }
                }

                const app = pofresh.createApp({ base: mockBase });
                app.components.__connector__ = {
                    send(reqId, route, msg, recvs, opts, cb) {
                        app.components.__pushScheduler__.schedule(reqId, route, msg, recvs, opts, cb);
                    }
                };
                app.components.__connector__.connector = {};
                app.components.__pushScheduler__ = {
                    schedule(_reqId, _route, msg, _recvs, opts, cb) {
                        invokeCount++;
                        expect(mockMsg).toEqual(msg);
                        expect(opts).toBeDefined();
                        expect(opts.type).toBe('broadcast');
                        expect(true).toBe(opts.userOptions.binded);
                        cb();
                    }
                };
                app.set('sessionService', sessionService);
                app.set('channelService', channelService);
                const channelRemote = remote(app);
                channelRemote.broadcast(
                    mockRoute,
                    mockMsg,
                    { type: 'broadcast', userOptions: { binded: true } },
                    () => {
                        expect(invokeCount).toBe(1);
                        resolve();
                    }
                );
            });
        });
    });
});
