import fs from 'fs';
import path from 'path';
import pathUtil from '../../lib/util/pathUtil.js';

const mockBase = path.join(__dirname, '..', 'mock-base');

describe('path util test', () => {
    describe('#getSysRemotePath', () => {
        it('should return the system remote service path for frontend server', () => {
            const role = 'frontend';
            const p = pathUtil.getSysRemotePath(role);
            expect(p).toBeDefined();
            expect(fs.existsSync(p)).toBe(true);
            expect(p.endsWith('frontend')).toBe(true);
        });

        it('should return the system remote service path for backend server', () => {
            const role = 'backend';
            const p = pathUtil.getSysRemotePath(role);
            expect(p).toBeDefined();
            expect(fs.existsSync(p)).toBe(true);
            expect(p.endsWith('backend')).toBe(true);
        });
    });

    describe('#getUserRemotePath', () => {
        it('should return user remote service path for the associated server type', () => {
            const serverType = 'connector';
            const p = pathUtil.getUserRemotePath(mockBase, serverType);
            expect(p).toBeDefined();
            expect(fs.existsSync(p)).toBe(true);
            expect(p.endsWith('remote')).toBe(true);
        });

        it('should return null if the directory not exist', () => {
            let serverType = 'area';
            let p = pathUtil.getUserRemotePath(mockBase, serverType);
            expect(p).toBeNull();

            serverType = 'some-dir-not-exist';
            p = pathUtil.getUserRemotePath(mockBase, serverType);
            expect(p).toBeNull();
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
            const p = pathUtil.getHandlerPath(mockBase, serverType);
            expect(p).toBeDefined();
            expect(fs.existsSync(p)).toBe(true);
            expect(p.endsWith('handler')).toBe(true);
        });

        it('should return null if the directory not exist', () => {
            let serverType = 'area';
            let p = pathUtil.getHandlerPath(mockBase, serverType);
            expect(p).toBeNull();

            serverType = 'some-dir-not-exist';
            p = pathUtil.getHandlerPath(mockBase, serverType);
            expect(p).toBeNull();
        });
    });

    describe('#getScriptPath', () => {
        it('should return script path correctly', () => {
            const p = pathUtil.getScriptPath(mockBase);
            expect(p).toBeDefined();
            expect(p.endsWith('scripts')).toBe(true);
        });
    });

    describe('#getLogPath', () => {
        it('should return log path correctly', () => {
            const p = pathUtil.getLogPath(mockBase);
            expect(p).toBeDefined();
            expect(p.endsWith('logs')).toBe(true);
        });
    });
});
