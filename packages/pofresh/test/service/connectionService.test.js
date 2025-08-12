import { describe, expect, it } from 'vitest';
import ConnectionService from '../../lib/common/service/connectionService.js';

const mockApp = {
    settings: {
        serverId: 'connector-server-1'
    },

    get(key) {
        return this.settings[key];
    },

    getServerId() {
        return this.get('serverId');
    }
};

describe('connection service test', () => {
    describe('#addLoginedUser', () => {
        it('should add logined user and could fetch it later', () => {
            const service = new ConnectionService(mockApp);
            expect(service).toBeDefined();
            expect(service.loginedCount).toBe(0);

            const uid = 'uid1';
            const info = { msg: 'some other message' };
            service.addLoginedUser(uid, info);

            expect(service.loginedCount).toBe(1);
            const record = service.logined[uid];
            expect(record).toBeDefined();
            expect(record).toEqual(info);
        });
    });

    describe('#increaseConnectionCount', () => {
        it('should increate connection count and could fetch it later', () => {
            const service = new ConnectionService(mockApp);
            expect(service).toBeDefined();
            expect(service.connCount).toBe(0);

            service.increaseConnectionCount();
            expect(service.connCount).toBe(1);
        });
    });

    describe('#removeLoginedUser', () => {
        it('should remove logined user info with the uid', () => {
            const service = new ConnectionService(mockApp);
            expect(service).toBeDefined();
            expect(service.loginedCount).toBe(0);

            const uid = 'uid1';
            const info = { msg: 'some other message' };
            service.addLoginedUser(uid, info);

            expect(service.loginedCount).toBe(1);
            let record = service.logined[uid];
            expect(record).toBeDefined();

            const uid2 = 'uid2';
            service.removeLoginedUser(uid2);
            expect(service.loginedCount).toBe(1);
            record = service.logined[uid];
            expect(record).toBeDefined();

            service.removeLoginedUser(uid);
            expect(service.loginedCount).toBe(0);
            record = service.logined[uid];
            expect(record).toBeUndefined();
        });
    });

    describe('#decreaseConnectionCount', () => {
        it('should decrease connection count only if uid is empty', () => {
            const service = new ConnectionService(mockApp);
            expect(service).toBeDefined();

            service.increaseConnectionCount();
            expect(service.connCount).toBe(1);
            service.decreaseConnectionCount();
            expect(service.connCount).toBe(0);
        });

        it('should keep zero if connection count become zero', () => {
            const service = new ConnectionService(mockApp);
            expect(service).toBeDefined();

            expect(service.connCount).toBe(0);
            service.decreaseConnectionCount();
            expect(service.connCount).toBe(0);
        });

        it('should remove the logined info if uid is specified', () => {
            const service = new ConnectionService(mockApp);
            expect(service).toBeDefined();

            service.increaseConnectionCount();

            const uid = 'uid1';
            const info = { msg: 'some other message' };
            service.addLoginedUser(uid, info);

            expect(service.connCount).toBe(1);
            expect(service.logined[uid]).toEqual(info);

            service.decreaseConnectionCount(uid);

            expect(service.connCount).toBe(0);
            expect(service.logined[uid]).toBeUndefined();
        });
    });

    it('should getStatisticsInfo', done => {
        const service = new ConnectionService(mockApp);
        const uid1 = 'uid1',
            uid2 = 'uid2';
        const info1 = { msg: 'msg1' },
            info2 = { msg: 'msg2' };

        service.increaseConnectionCount();
        service.increaseConnectionCount();
        service.increaseConnectionCount();

        service.addLoginedUser(uid1, info1);
        service.addLoginedUser(uid2, info2);

        const sinfo = service.getStatisticsInfo();

        expect(sinfo).toHaveProperty('serverId', 'connector-server-1');
        expect(sinfo).toHaveProperty('totalConnCount', 3);
        expect(sinfo).toHaveProperty('loginedCount', 2);

        const infos = sinfo.loginedList;
        expect(infos).toBeDefined();
        expect(infos.length).toBe(2);
        expect(infos).toContainEqual(info1);
        expect(infos).toContainEqual(info2);
    });
});
