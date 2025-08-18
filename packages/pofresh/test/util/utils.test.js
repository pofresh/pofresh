import { describe, expect, it } from 'vitest';
import utils from '../../lib/util/utils.js';

describe('utils test', () => {
    describe('#invokeCallback', () => {
        it('should invoke the function with the parameters', () => {
            const p1 = 1,
                p2 = 'str';

            const func = (arg1, arg2) => {
                expect(p1).toBe(arg1);
                expect(p2).toBe(arg2);
            };

            utils.invokeCallback(func, p1, p2);
        });

        it('should ok if cb is null', () => {
            const p1 = 1,
                p2 = 'str';
            expect(() => {
                utils.invokeCallback(null, p1, p2);
            }).not.toThrow();
        });
    });

    describe('#size', () => {
        it('should return the own property count of the object', () => {
            const obj = {
                p1: 'str',
                p2: 1,
                m1() {
                    // Mock method
                }
            };

            expect(utils.size(obj)).toBe(2);
        });
    });

    describe('#hasChineseChar', () => {
        it('should return false if the string does not have any Chinese characters', () => {
            const src = 'string without Chinese characters';
            expect(utils.hasChineseChar(src)).toBe(false);
        });

        it('should return true if the string has Chinese characters', () => {
            const src = 'string with Chinese characters 你好';
            expect(utils.hasChineseChar(src)).toBe(true);
        });
    });

    describe('#unicodeToUtf8', () => {
        it('should return encoded bytes if the string does not have any Chinese characters', () => {
            const src = 'string without Chinese characters';
            const result = utils.unicodeToUtf8(src);
            expect(result).toBeInstanceOf(Uint8Array);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should return encoded bytes if the string has Chinese characters', () => {
            const src = 'string with Chinese characters 你好';
            const result = utils.unicodeToUtf8(src);
            expect(result).toBeInstanceOf(Uint8Array);
            expect(result.length).toBeGreaterThan(src.length);
        });
    });

    describe('#isLocal', () => {
        it('should return true if the ip is local', () => {
            const ip = '127.0.0.1';
            const host = 'localhost';
            const other = '192.168.1.1';
            expect(utils.isLocal(ip)).toBe(true);
            expect(utils.isLocal(host)).toBe(true);
            expect(utils.isLocal(other)).toBe(false);
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
            expect(utils.size(serverMap)).toBe(2);
        });
    });

    describe('#arrayDiff', () => {
        it('should return the difference of two arrays', () => {
            const array1 = [1, 2, 3, 4, 5];
            const array2 = [1, 2, 3];
            const array = utils.arrayDiff(array1, array2);
            expect(array).toEqual([4, 5]);
        });
    });

    describe('#ping', () => {
        it('should ping server', () => {
            utils.ping('127.0.0.1', flag => {
                expect(flag).toBe(true);
            });
            utils.ping('111.111.111.111', flag => {
                expect(flag).toBe(false);
            });
        });
    });
});
