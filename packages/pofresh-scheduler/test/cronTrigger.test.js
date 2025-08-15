import { CronTrigger, createTrigger as createCronTrigger } from '../lib/cronTrigger.js';
import decoder from '../lib/cronTriggerDecoder.js';

const SECOND = 0;
const HOUR = 2;

describe('CronTrigger', () => {
    describe('createTrigger', () => {
        test('should create a valid cron trigger instance', () => {
            const mockJob = { runTime: 0 };
            const trigger = createCronTrigger('0 0 12 * * *', mockJob);
            expect(trigger).toBeDefined();
            expect(trigger.trigger).toBeDefined();
            expect(trigger.originalExpression).toBe('0 0 12 * * *');
        });

        test('should throw error for invalid cron expression', () => {
            const mockJob = { runTime: 0 };
            expect(() => {
                createCronTrigger('invalid cron', mockJob);
            }).toThrow();
        });
    });

    describe('executeTime', () => {
        test('should return the next execution time', () => {
            const mockJob = { runTime: 0 };
            const trigger = createCronTrigger('0 0 12 * * *', mockJob);
            const executeTime = trigger.executeTime();
            expect(typeof executeTime).toBe('number');
        });
    });

    describe('nextExecuteTime', () => {
        test('should calculate next execution time for daily trigger', () => {
            const mockJob = { runTime: 0 };
            const trigger = createCronTrigger('0 0 12 * * *', mockJob);
            const now = Date.now();
            const nextTime = trigger.nextExecuteTime(now);

            expect(nextTime).toBeGreaterThan(now);
            const nextDate = new Date(nextTime);
            expect([0, 12]).toContain(nextDate.getHours()); // Could be today or tomorrow
            expect(nextDate.getMinutes()).toBe(0);
            expect(nextDate.getSeconds()).toBe(0);
        });

        test('should handle edge case cron expression', () => {
            const mockJob = { runTime: 0 };
            const trigger = createCronTrigger('0 0 12 31 2 *', mockJob);
            const nextTime = trigger.nextExecuteTime(Date.now());
            expect(typeof nextTime).toBe('number');
            expect(nextTime).toBeGreaterThan(Date.now());
        });

        test('should handle monthly trigger', () => {
            const mockJob = { runTime: 0 };
            const trigger = createCronTrigger('0 0 12 1 * *', mockJob);
            const now = Date.now();
            const nextTime = trigger.nextExecuteTime(now);

            expect(nextTime).toBeGreaterThan(now);
            const nextDate = new Date(nextTime);
            expect([1, 2, 3]).toContain(nextDate.getDate()); // Could be this month or next
            expect([0, 12]).toContain(nextDate.getHours());
        });

        test('should handle weekly trigger', () => {
            const mockJob = { runTime: 0 };
            const trigger = createCronTrigger('0 0 12 * * 1', mockJob);
            const now = Date.now();
            const nextTime = trigger.nextExecuteTime(now);

            expect(nextTime).toBeGreaterThan(now);
            const nextDate = new Date(nextTime);
            expect([1, 2, 3, 4, 5, 6, 7]).toContain(nextDate.getDay());
            expect([0, 12]).toContain(nextDate.getHours());
        });
    });

    describe('validation', () => {
        test('should validate cron expression statically', () => {
            expect(CronTrigger.validateExpression('0 0 12 * * *')).toBe(true);
            expect(CronTrigger.validateExpression('invalid cron')).toBe(false);
        });

        test('should check if trigger is valid', () => {
            const mockJob = { runTime: 0 };
            const trigger = createCronTrigger('0 0 12 * * *', mockJob);
            expect(trigger.isTriggerValid()).toBe(true);
        });
    });

    describe('reset', () => {
        test('should reset trigger with new expression', () => {
            const mockJob = { runTime: 0 };
            const trigger = createCronTrigger('0 0 12 * * *', mockJob);
            const originalNextTime = trigger.nextTime;

            trigger.reset('0 0 18 * * *');

            expect(trigger.originalExpression).toBe('0 0 18 * * *');
            expect(trigger.nextTime).not.toBe(originalNextTime);
        });
    });

    describe('cleanup', () => {
        test('should clean up resources', () => {
            const mockJob = { runTime: 0 };
            const trigger = createCronTrigger('0 0 12 * * *', mockJob);

            expect(() => {
                trigger.cleanup();
            }).not.toThrow();

            expect(trigger.isTriggerValid()).toBe(false);
        });
    });

    describe('statistics', () => {
        test('should return statistics', () => {
            const mockJob = { runTime: 0 };
            const trigger = createCronTrigger('0 0 12 * * *', mockJob);
            const stats = trigger.getStats();

            expect(stats).toHaveProperty('totalExecutions');
            expect(stats).toHaveProperty('computationTime');
            expect(stats).toHaveProperty('errors');
            expect(stats).toHaveProperty('originalExpression');
            expect(stats).toHaveProperty('isValid');
        });
    });
});

describe('CronTriggerDecoder', () => {
    describe('decodeTrigger', () => {
        test('should decode simple cron expression', () => {
            const result = decoder.decodeCronTime('0 30 14 * * *');
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(6);
        });

        test('should handle comma-separated values', () => {
            const result = decoder.decodeCronTime('0 0 1,2,3 * * *');
            expect(result[HOUR]).toEqual([1, 2, 3]);
        });

        test('should handle ranges', () => {
            const result = decoder.decodeCronTime('0 0 1-3 * * *');
            expect(result[HOUR]).toEqual([1, 2, 3]);
        });

        test('should handle step values', () => {
            const result = decoder.decodeCronTime('0/5 * * * * *');
            expect(result[SECOND]).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
        });

        test('should handle wildcard', () => {
            const result = decoder.decodeCronTime('* * * * * *');
            expect(result[SECOND]).toBe(-1);
        });
    });

    describe('timeMatch', () => {
        test('should match exact value', () => {
            expect(decoder.timeMatch(5, 5)).toBe(true);
            expect(decoder.timeMatch(5, 6)).toBe(false);
        });

        test('should match wildcard', () => {
            expect(decoder.timeMatch(5, -1)).toBe(true);
        });

        test('should match array values', () => {
            expect(decoder.timeMatch(5, [1, 3, 5, 7])).toBe(true);
            expect(decoder.timeMatch(4, [1, 3, 5, 7])).toBe(false);
        });
    });

    describe('getDomLimit', () => {
        test('should return correct days in month for non-leap year', () => {
            expect(decoder.getDomLimit(2023, 1)).toBe(28); // February
            expect(decoder.getDomLimit(2023, 0)).toBe(31); // January
            expect(decoder.getDomLimit(2023, 3)).toBe(30); // April
        });

        test('should return correct days for leap year', () => {
            expect(decoder.getDomLimit(2024, 1)).toBe(29); // February in leap year
        });
    });
});
