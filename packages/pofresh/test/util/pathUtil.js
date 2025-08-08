const pathUtil = require('../../lib/util/pathUtil');
const utils = require('../../lib/util/utils');
const should = require('should');
const fs = require('fs');

const mockBase = process.cwd() + '/test/mock-base';

describe('path util test', () => {
    describe('#getSysRemotePath', () => {
        it('should return the system remote service path for frontend server', () => {
            const role = 'frontend';
            const expectSuffix = '/common/remote/frontend';
            const p = pathUtil.getSysRemotePath(role);
            should.exist(p);
            fs.existsSync(p).should.be.true;
            utils.endsWith(p, expectSuffix).should.be.true;
        });

        it('should return the system remote service path for backend server', () => {
            const role = 'backend';
            const expectSuffix = '/common/remote/backend';
            const p = pathUtil.getSysRemotePath(role);
            should.exist(p);
            fs.existsSync(p).should.be.true;
            utils.endsWith(p, expectSuffix).should.be.true;
        });
    });

    describe('#getUserRemotePath', () => {
        it('should return user remote service path for the associated server type', () => {
            const serverType = 'connector';
            const expectSuffix = '/app/servers/connector/remote';
            const p = pathUtil.getUserRemotePath(mockBase, serverType);
            should.exist(p);
            fs.existsSync(p).should.be.true;
            utils.endsWith(p, expectSuffix).should.be.true;
        });

        it('should return null if the directory not exist', () => {
            let serverType = 'area';
            let p = pathUtil.getUserRemotePath(mockBase, serverType);
            should.not.exist(p);

            serverType = 'some-dir-not-exist';
            p = pathUtil.getUserRemotePath(mockBase, serverType);
            should.not.exist(p);
        });
    });

    describe('#remotePathRecord', () => {
        const namespace = 'user';
        const serverType = 'connector';
        const path = '/some/path/to/remote';
        const r = pathUtil.remotePathRecord(namespace, serverType, path);
        should.exist(r);
        namespace.should.equal(r.namespace);
        serverType.should.equal(r.serverType);
        path.should.equal(r.path);
    });

    describe('#getHandlerPath', () => {
        it('should return user handler path for the associated server type', () => {
            const serverType = 'connector';
            const expectSuffix = '/app/servers/connector/handler';
            const p = pathUtil.getHandlerPath(mockBase, serverType);
            should.exist(p);
            fs.existsSync(p).should.be.true;
            utils.endsWith(p, expectSuffix).should.be.true;
        });

        it('should return null if the directory not exist', () => {
            let serverType = 'area';
            let p = pathUtil.getHandlerPath(mockBase, serverType);
            should.not.exist(p);

            serverType = 'some-dir-not-exist';
            p = pathUtil.getHandlerPath(mockBase, serverType);
            should.not.exist(p);
        });
    });

    describe('#getScriptPath', () => {
        const p = pathUtil.getScriptPath(mockBase);
        const expectSuffix = '/scripts';
        should.exist(p);
        utils.endsWith(p, expectSuffix).should.be.true;
    });

    describe('#getLogPath', () => {
        const p = pathUtil.getLogPath(mockBase);
        const expectSuffix = '/logs';
        should.exist(p);
        utils.endsWith(p, expectSuffix).should.be.true;
    });
});
