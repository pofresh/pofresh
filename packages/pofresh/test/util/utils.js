const utils = require('../../lib/util/utils');

describe('utils test', () => {
    describe('#invokeCallback', () => {
        it('should invoke the function with the parameters', () => {
            const p1 = 1,
                p2 = 'str';

            const func = (arg1, arg2) => {
                p1.should.equal(arg1);
                p2.should.equal(arg2);
            };

            utils.invokeCallback(func, p1, p2);
        });

        it('should ok if cb is null', () => {
            const p1 = 1,
                p2 = 'str';
            (() => {
                utils.invokeCallback(null, p1, p2);
            }).should.not.throw();
        });
    });

    describe('#size', () => {
        it('should return the own property count of the object', () => {
            const obj = {
                p1: 'str',
                p2: 1,
                m1() {}
            };

            utils.size(obj).should.equal(2);
        });
    });

    describe('#startsWith', () => {
        it('should return true if the string do start with the prefix', () => {
            const src = 'prefix with a string';
            const prefix = 'prefix';

            utils.startsWith(src, prefix).should.be.true;
        });

        it('should return false if the string not start with the prefix', () => {
            const src = 'prefix with a string';
            let prefix = 'prefix222';

            utils.startsWith(src, prefix).should.be.false;

            prefix = 'with';
            utils.startsWith(src, prefix).should.be.false;
        });

        it('should return false if the src not a string', () => {
            utils.startsWith(1, 'str').should.be.false;
        });
    });

    describe('#endsWith', () => {
        it('should return true if the string do end with the prefix', () => {
            const src = 'string with a suffix';
            const suffix = 'suffix';

            utils.endsWith(src, suffix).should.be.true;
        });

        it('should return false if the string not end with the prefix', () => {
            const src = 'string with a suffix';
            let suffix = 'suffix222';

            utils.endsWith(src, suffix).should.be.false;

            suffix = 'with';
            utils.endsWith(src, suffix).should.be.false;
        });

        it('should return false if the src not a string', () => {
            utils.endsWith(1, 'str').should.be.false;
        });
    });

    describe('#hasChineseChar', () => {
        it('should return false if the string does not have any Chinese characters', () => {
            const src = 'string without Chinese characters';
            utils.hasChineseChar(src).should.be.false;
        });

        it('should return true if the string has Chinese characters', () => {
            const src = 'string with Chinese characters 你好';
            utils.hasChineseChar(src).should.be.true;
        });
    });

    describe('#unicodeToUtf8', () => {
        it('should return the origin string if the string does not have any Chinese characters', () => {
            const src = 'string without Chinese characters';
            utils.unicodeToUtf8(src).should.equal(src);
        });

        it('should not return the origin string if the string has Chinese characters', () => {
            const src = 'string with Chinese characters 你好';
            utils.unicodeToUtf8(src).should.not.equal(src);
        });
    });

    describe('#isLocal', () => {
        it('should return true if the ip is local', () => {
            const ip = '127.0.0.1';
            const host = 'localhost';
            const other = '192.168.1.1';
            utils.isLocal(ip).should.be.true;
            utils.isLocal(host).should.be.true;
            utils.isLocal(other).should.be.false;
        });
    });

    describe('#loadCluster', () => {
        it('should produce cluster servers', () => {
            const clusterServer = {
                host: '127.0.0.1',
                port: '3010++',
                serverType: 'chat',
                cluster: true,
                clusterCount: 2
            };
            const serverMap = {};
            const app = { clusterSeq: {} };
            utils.loadCluster(app, clusterServer, serverMap);
            utils.size(serverMap).should.equal(2);
        });
    });

    describe('#arrayDiff', () => {
        it('should return the difference of two arrays', () => {
            const array1 = [1, 2, 3, 4, 5];
            const array2 = [1, 2, 3];
            const array = utils.arrayDiff(array1, array2);
            array.should.eql([4, 5]);
        });
    });

    describe('#extends', () => {
        it('should extends opts', () => {
            const opts = {
                test: 123
            };
            const add = {
                aaa: 555
            };
            const result = utils.extends(opts, add);
            result.should.eql({
                test: 123,
                aaa: 555
            });
        });
    });

    describe('#ping', () => {
        it('should ping server', () => {
            utils.ping('127.0.0.1', flag => {
                flag.should.be.true;
            });
            utils.ping('111.111.111.111', flag => {
                flag.should.be.false;
            });
        });
    });
});
