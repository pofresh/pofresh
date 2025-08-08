import util from '../lib/util.js';

describe('util', () => {
    it('should export utility functions', () => {
        expect(util).toBeDefined();
        expect(typeof util.log).toBe('function');
        expect(typeof util.help).toBe('function');
        expect(typeof util.errorHandle).toBe('function');
        expect(typeof util.argsFilter).toBe('function');
        expect(typeof util.formatOutput).toBe('function');
        expect(typeof util.md5).toBe('function');
    });

    describe('log function', () => {
        it('should log messages to stdout', () => {
            const mockWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => {});

            util.log('test message');

            expect(mockWrite).toHaveBeenCalledWith('test message\n');
            mockWrite.mockRestore();
        });
    });

    describe('argsFilter function', () => {
        it('should filter and split arguments correctly', () => {
            const result = util.argsFilter('show servers');
            expect(result).toEqual(['show', 'servers']);
        });

        it('should handle arguments with quotes', () => {
            const result = util.argsFilter("add 'time=0 30 10 * * *' action=test");
            expect(result).toContain('time=0 30 10 * * *');
        });

        it('should handle single argument', () => {
            const result = util.argsFilter('help');
            expect(result).toEqual(['help']);
        });

        it('should handle empty arguments', () => {
            const result = util.argsFilter('');
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('md5 function', () => {
        it('should generate MD5 hash', () => {
            const result = util.md5('test');
            expect(result).toBe('098f6bcd4621d373cade4e832627b4f6');
        });

        it('should generate different hashes for different inputs', () => {
            const hash1 = util.md5('test1');
            const hash2 = util.md5('test2');
            expect(hash1).not.toBe(hash2);
        });

        it('should generate consistent hashes for same input', () => {
            const hash1 = util.md5('consistent');
            const hash2 = util.md5('consistent');
            expect(hash1).toBe(hash2);
        });
    });

    describe('tabComplete function', () => {
        it('should return existing hits if provided', () => {
            const existingHits = ['help', 'show'];
            const result = util.tabComplete(existingHits, 'h', {}, 'complete');
            expect(result).toBe(existingHits);
        });

        it('should complete commands based on line input', () => {
            const map = { help: 1, show: 1, stop: 1 };
            const result = util.tabComplete([], 'h', map, 'complete');
            expect(result).toContain('help');
            expect(result).not.toContain('show');
        });

        it('should handle enable/disable commands', () => {
            const result = util.tabComplete([], 'enable a', {}, 'enable');
            expect(result).toContain('enable app');
        });

        it('should handle dump commands', () => {
            const result = util.tabComplete([], 'dump m', {}, 'dump');
            expect(result).toContain('dump memory');
        });

        it('should sort results', () => {
            const map = { zebra: 1, apple: 1, banana: 1 };
            const result = util.tabComplete([], '', map, 'complete');
            expect(result[0]).toBe('apple');
            expect(result.at(-1)).toBe('zebra');
        });
    });

    describe('format_date function', () => {
        it('should format date correctly', () => {
            const date = new Date('2023-01-01T10:30:45');
            const result = util.format_date(date);
            expect(result).toMatch(/2023-1-1 10:30:45/);
        });

        it('should pad single digit hours, minutes, seconds', () => {
            const date = new Date('2023-01-01T01:05:09');
            const result = util.format_date(date);
            expect(result).toMatch(/01:05:09/);
        });
    });

    describe('basic functionality tests', () => {
        it('should handle formatOutput without throwing errors', () => {
            expect(() => {
                util.formatOutput('unknown', { msg: 'test' });
            }).not.toThrow();
        });

        it('should handle errorHandle without throwing errors', () => {
            const mockRl = { prompt: vi.fn() };
            expect(() => {
                util.errorHandle('test', mockRl);
            }).not.toThrow();
        });
    });
});
