import fs from 'fs';
import { describe, expect, it } from 'vitest';
import pathUtil from '../../lib/util/pathUtil.js';
import utils from '../../lib/util/utils.js';

const mockBase = `${process.cwd()}/test/mock-base`;

describe('path util test', () => {
    describe('#getSysRemotePath', () => {
        it('should return the system remote service path for frontend server', () => {
            const role = 'frontend';
            const expectSuffix = '/common/remote/frontend';
            const p = pathUtil.getSysRemotePath(role);
            expect(p).toBeDefined();
            expect(fs.existsSync(p)).toBe(true);
            expect(utils.endsWith(p, expectSuffix)).toBe(true);
        });

        it('should return the system remote service path for backend server', () => {
            const role = 'backend';
            const expectSuffix = '/common/remote/backend';
            const p = pathUtil.getSysRemotePath(role);
            expect(p).toBeDefined();
            expect(fs.existsSync(p)).toBe(true);
            expect(utils.endsWith(p, expectSuffix)).toBe(true);
        });
    });

    describe('#getUserRemotePath', () => {
        it('should return user remote service path for the associated server type', () => {
            const serverType = 'connector';
            const expectSuffix = '/app/servers/connector/remote';
            const p = pathUtil.getUserRemotePath(mockBase, serverType);
            expect(p).toBeDefined();
            expect(fs.existsSync(p)).toBe(true);
            expect(utils.endsWith(p, expectSuffix)).toBe(true);
        });

        it('should return null if the directory not exist', () => {
            let serverType = 'area';
            let p = pathUtil.getUserRemotePath(mockBase, serverType);
            expect(p).toBeUndefined();

            serverType = 'some-dir-not-exist';
            p = pathUtil.getUserRemotePath(mockBase, serverType);
            expect(p).toBeUndefined();
        });
    });

    describe('#remotePathRecord', () => {
        it('should create remote path record correctly', () => {
            const namespace = 'user';
            const serverType = 'connector';
            const path = '/some/path/to/remote';
            const r = pathUtil.remotePathRecord(namespace, serverType, path);
            expect(r).toBeDefined();
            expect(namespace).toBe(r.namespace);
            expect(serverType).toBe(r.serverType);
            expect(path).toBe(r.path);
        });
    });

    describe('#getHandlerPath', () => {
        it('should return user handler path for the associated server type', () => {
            const serverType = 'connector';
            const expectSuffix = '/app/servers/connector/handler';
            const p = pathUtil.getHandlerPath(mockBase, serverType);
            expect(p).toBeDefined();
            expect(fs.existsSync(p)).toBe(true);
            expect(utils.endsWith(p, expectSuffix)).toBe(true);
        });

        it('should return null if the directory not exist', () => {
            let serverType = 'area';
            let p = pathUtil.getHandlerPath(mockBase, serverType);
            expect(p).toBeUndefined();

            serverType = 'some-dir-not-exist';
            p = pathUtil.getHandlerPath(mockBase, serverType);
            expect(p).toBeUndefined();
        });
    });

    describe('#getScriptPath', () => {
        it('should return script path correctly', () => {
            const p = pathUtil.getScriptPath(mockBase);
            const expectSuffix = '/scripts';
            expect(p).toBeDefined();
            expect(utils.endsWith(p, expectSuffix)).toBe(true);
        });
    });

    describe('#getLogPath', () => {
        it('should return log path correctly', () => {
            const p = pathUtil.getLogPath(mockBase);
            const expectSuffix = '/logs';
            expect(p).toBeDefined();
            expect(utils.endsWith(p, expectSuffix)).toBe(true);
        });
    });
});
