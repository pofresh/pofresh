import { describe, expect, it } from 'vitest';
import SessionService from '../../lib/common/service/sessionService.js';

describe('session service test', () => {
    describe('#bind', () => {
        it('should get session by uid after binded', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {};
            const uid = 'changchang';
            let eventCount = 0;

            const session = service.create(sid, fid, socket);

            expect(session).toBeDefined();

            expect(session).toEqual(service.get(sid));

            session.on('bind', euid => {
                eventCount++;
                expect(uid).toBe(euid);
            });

            await new Promise((resolve, _reject) => {
                service.bind(sid, uid, err => {
                    expect(err).toBeUndefined();
                    const sessions = service.getByUid(uid);
                    expect(sessions).toBeDefined();
                    expect(sessions.length).toBe(1);
                    expect(session).toEqual(sessions[0]);
                    expect(eventCount).toBe(1);
                    service.bind(sid, uid, err => {
                        expect(err).toBeUndefined();
                        resolve();
                    });
                });
            });
        });
        it('should fail if already binded uid', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };
            const uid = 'py',
                test_uid = 'test';

            const _session = service.create(sid, fid, socket);

            await new Promise(resolve => {
                service.bind(sid, uid, null);
                resolve();
            });

            await new Promise((resolve, _reject) => {
                service.bind(sid, test_uid, err => {
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });
        it('should fail if try to bind a session not exist', async () => {
            const service = new SessionService();
            const sid = 1,
                uid = 'changchang';

            await new Promise((resolve, _reject) => {
                service.bind(sid, uid, err => {
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });
    });

    describe('#unbind', () => {
        it('should fail unbind session if session not exist', async () => {
            const service = new SessionService();
            const sid = 1;
            const uid = 'py';

            await new Promise((resolve, _reject) => {
                service.unbind(sid, uid, err => {
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });
        it('should fail unbind session if session not binded', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };
            const uid = 'py';

            const _session = service.create(sid, fid, socket);

            await new Promise((resolve, _reject) => {
                service.unbind(sid, uid, err => {
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });
        it('should fail to get session after session unbinded', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };
            const uid = 'py';

            const _session = service.create(sid, fid, socket);
            await new Promise(resolve => {
                service.bind(sid, uid, null);
                resolve();
            });

            await new Promise((resolve, _reject) => {
                service.unbind(sid, uid, err => {
                    expect(err).toBeUndefined();
                    const sessions = service.getByUid(uid);
                    expect(sessions).toBeUndefined();
                    resolve();
                });
            });
        });
    });

    describe('#remove', () => {
        it('should not get the session after remove', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };
            const uid = 'changchang';

            const _session = service.create(sid, fid, socket);

            await new Promise((resolve, _reject) => {
                service.bind(sid, uid, _err => {
                    service.remove(sid);
                    expect(service.get(sid)).toBeUndefined();
                    expect(service.getByUid(uid)).toBeUndefined();
                    resolve();
                });
            });
        });
    });

    describe('#import', () => {
        it('should update the session with the key/value pair', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };
            const key = 'key-1',
                value = 'value-1';

            const session = service.create(sid, fid, socket);

            await new Promise((resolve, _reject) => {
                service.import(sid, key, value, err => {
                    expect(err).toBeUndefined();
                    expect(value).toEqual(session.get(key));
                    resolve();
                });
            });
        });

        it('should fail if try to update a session not exist', async () => {
            const service = new SessionService();
            const sid = 1;
            const key = 'key-1',
                value = 'value-1';

            await new Promise((resolve, _reject) => {
                service.import(sid, key, value, err => {
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });

        it('should update the session with the key/value pairs', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };
            const key = 'key-1',
                value = 'value-1',
                key2 = 'key-2',
                value2 = {};

            const settings = {};
            settings[key] = value;
            settings[key2] = value2;

            const session = service.create(sid, fid, socket);

            await new Promise((resolve, _reject) => {
                service.importAll(sid, settings, err => {
                    expect(err).toBeUndefined();
                    expect(value).toEqual(session.get(key));
                    expect(value2).toEqual(session.get(key2));
                    resolve();
                });
            });
        });

        it('should fail if try to update a session not exist', async () => {
            const service = new SessionService();
            const sid = 1;
            const key = 'key-1',
                value = 'value-1';

            await new Promise((resolve, _reject) => {
                service.import(sid, key, value, err => {
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });

        it('should fail if try to update a session not exist', async () => {
            const service = new SessionService();
            const sid = 1;
            const key = 'key-1',
                value = 'value-1',
                key2 = 'key-2',
                value2 = {};

            const settings = {};
            settings[key] = value;
            settings[key2] = value2;

            await new Promise((resolve, _reject) => {
                service.importAll(sid, settings, err => {
                    expect(err).toBeDefined();
                    resolve();
                });
            });
        });
    });

    describe('#kick', () => {
        it('should kick the sessions', async () => {
            const service = new SessionService();
            const sid1 = 1,
                fid1 = 'frontend-server-1';
            const sid2 = 2,
                fid2 = 'frontend-server-1';

            const socket = {
                emit() {},
                disconnect() {},
                removeAllListeners() {},
                on() {}
            };
            const uid = 'changchang';
            let eventCount = 0;

            const session1 = service.create(sid1, fid1, socket);
            const session2 = service.create(sid2, fid2, socket);
            session1.on('closed', () => {
                eventCount++;
            });

            session2.on('closed', () => {
                eventCount++;
            });

            await new Promise((resolve, _reject) => {
                service.bind(sid1, uid, _err => {
                    service.bind(sid2, uid, _err => {
                        service.kick(uid, err => {
                            expect(err).toBeUndefined();
                            expect(service.get(sid1)).toBeUndefined();
                            expect(service.get(sid2)).toBeUndefined();
                            expect(service.getByUid(uid)).toBeUndefined();
                            expect(eventCount).toBe(2);
                            resolve();
                        });
                    });
                });
            });
        });

        it('should kick the session by sessionId', async () => {
            const service = new SessionService();
            const sid1 = 1,
                fid1 = 'frontend-server-1';
            const sid2 = 2,
                fid2 = 'frontend-server-1';

            const socket = {
                emit() {},
                disconnect() {},
                removeAllListeners() {},
                on() {}
            };
            const uid = 'changchang';
            let eventCount = 0;

            const session1 = service.create(sid1, fid1, socket);
            const session2 = service.create(sid2, fid2, socket);
            session1.on('closed', () => {
                eventCount++;
            });

            session2.on('closed', () => {
                eventCount++;
            });

            await new Promise((resolve, _reject) => {
                service.bind(sid1, uid, _err => {
                    service.bind(sid2, uid, _err => {
                        service.kickBySessionId(sid1, err => {
                            expect(err).toBeUndefined();
                            expect(service.get(sid1)).toBeUndefined();
                            expect(service.get(sid2)).toBeDefined();
                            expect(service.getByUid(uid)).toBeDefined();
                            expect(eventCount).toBe(1);
                            resolve();
                        });
                    });
                });
            });
        });

        it('should ok if kick a session not exist', async () => {
            const service = new SessionService();
            const uid = 'changchang';

            await new Promise((resolve, _reject) => {
                service.kick(uid, err => {
                    expect(err).toBeUndefined();
                    resolve();
                });
            });
        });

        it('should kick session by sid', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1';
            const socket = {
                emit() {},
                disconnect() {},
                removeAllListeners() {},
                on() {}
            };
            let eventCount = 0;

            const session = service.create(sid, fid, socket);
            session.on('closed', () => {
                eventCount++;
            });

            await new Promise((resolve, _reject) => {
                service.kickBySessionId(sid, err => {
                    expect(err).toBeUndefined();
                    expect(service.get(sid)).toBeUndefined();
                    expect(eventCount).toBe(1);
                    resolve();
                });
            });
        });

        it('should ok if kick a session not exist', async () => {
            const service = new SessionService();
            const sid = 1;

            await new Promise((resolve, _reject) => {
                service.kickBySessionId(sid, err => {
                    expect(err).toBeUndefined();
                    resolve();
                });
            });
        });
    });

    describe('#forEachSession', () => {
        it('should iterate all created sessions', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };

            const outter_session = service.create(sid, fid, socket);

            await new Promise((resolve, reject) => {
                let found = false;
                service.forEachSession(session => {
                    expect(session).toBeDefined();
                    expect(outter_session.id).toEqual(session.id);
                    found = true;
                    resolve();
                });
                if (!found) {
                    reject(new Error('No session found'));
                }
            });
        });
    });

    describe('#forEachBindedSession', () => {
        it('should iterate all binded sessions', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };
            const uid = 'py';

            const outter_session = service.create(sid, fid, socket);
            await new Promise(resolve => {
                service.bind(sid, uid, null);
                resolve();
            });

            await new Promise((resolve, _reject) => {
                service.forEachBindedSession(session => {
                    expect(session).toBeDefined();
                    expect(outter_session.id).toEqual(session.id);
                    expect(outter_session.uid).toEqual(session.uid);
                    resolve();
                });
            });
        });
    });
});

describe('frontend session test', () => {
    describe('#bind', () => {
        it('should get session by uid after binded', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };
            const uid = 'changchang';
            let eventCount = 0;

            const session = service.create(sid, fid, socket);
            const fsession = session.toFrontendSession();

            expect(fsession).toBeDefined();

            fsession.on('bind', euid => {
                eventCount++;
                expect(uid).toBe(euid);
            });

            await new Promise((resolve, _reject) => {
                fsession.bind(uid, err => {
                    expect(err).toBeUndefined();
                    const sessions = service.getByUid(uid);
                    expect(sessions).toBeDefined();
                    expect(sessions.length).toBe(1);
                    expect(session).toEqual(sessions[0]);
                    expect(eventCount).toBe(1);
                    resolve();
                });
            });
        });
    });

    describe('#unbind', () => {
        it('should fail to get session after session unbinded', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };
            const uid = 'py';

            const session = service.create(sid, fid, socket);
            const fsession = session.toFrontendSession();

            await new Promise(resolve => {
                fsession.bind(uid, null);
                resolve();
            });

            await new Promise((resolve, _reject) => {
                fsession.unbind(uid, err => {
                    expect(err).toBeUndefined();
                    const sessions = service.getByUid(uid);
                    expect(sessions).toBeUndefined();
                    resolve();
                });
            });
        });
    });

    describe('#set/get', () => {
        it('should update the key/value pair in frontend session but not session', () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };
            const key = 'key-1',
                value = 'value-1';

            const session = service.create(sid, fid, socket);
            const fsession = session.toFrontendSession();

            fsession.set(key, value);

            expect(session.get(key)).toBeUndefined();
            expect(value).toEqual(fsession.get(key));
        });
    });

    describe('#push', () => {
        it('should push the specified key/value pair to session', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };
            const key = 'key-1',
                value = 'value-1',
                key2 = 'key-2',
                value2 = {};

            const session = service.create(sid, fid, socket);
            const fsession = session.toFrontendSession();

            fsession.set(key, value);
            fsession.set(key2, value2);

            await new Promise((resolve, _reject) => {
                fsession.push(key, err => {
                    expect(err).toBeUndefined();
                    expect(value).toEqual(session.get(key));
                    expect(session.get(key2)).toBeUndefined();
                    resolve();
                });
            });
        });

        it('should push all the key/value pairs to session', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };
            const key = 'key-1',
                value = 'value-1',
                key2 = 'key-2',
                value2 = {};

            const session = service.create(sid, fid, socket);
            const fsession = session.toFrontendSession();

            fsession.set(key, value);
            fsession.set(key2, value2);

            await new Promise((resolve, _reject) => {
                fsession.pushAll(err => {
                    expect(err).toBeUndefined();
                    expect(value).toEqual(session.get(key));
                    expect(value2).toEqual(session.get(key2));
                    resolve();
                });
            });
        });
    });

    describe('#export', () => {
        it('should equal frontend session after export', async () => {
            const service = new SessionService();
            const sid = 1,
                fid = 'frontend-server-1',
                socket = {
                    emit() {},
                    disconnect() {},
                    removeAllListeners() {},
                    on() {}
                };
            const _uid = 'py';

            const session = service.create(sid, fid, socket);
            const fsession = session.toFrontendSession();
            const esession = fsession.export();
            expect(esession.id).toEqual(fsession.id);
            expect(esession.frontendId).toEqual(fsession.frontendId);
        });
    });
});
