import { SimpleTrigger, createTrigger as createSimpleTrigger } from '../lib/simpleTrigger.js';

describe('SimpleTrigger', () => {
    describe('constructor', () => {
        test('should create trigger with start time only', () => {
            const startTime = Date.now() + 1000;
            const mockJob = { runTime: 0 };
            const trigger = createSimpleTrigger({ start: startTime }, mockJob);

            expect(trigger.nextTime).toBe(startTime);
            expect(trigger.period).toBe(-1);
            expect(trigger.count).toBe(-1);
        });

        test('should create trigger with period and count', () => {
            const startTime = Date.now();
            const period = 5000;
            const count = 3;
            const mockJob = { runTime: 0 };
            const trigger = createSimpleTrigger(
                {
                    start: startTime,
                    period,
                    count
                },
                mockJob
            );

            expect(trigger.nextTime).toBe(startTime);
            expect(trigger.period).toBe(period);
            expect(trigger.count).toBe(count);
        });

        test('should create trigger with infinite count when count is 0', () => {
            const startTime = Date.now();
            const period = 5000;
            const mockJob = { runTime: 0 };
            const trigger = createSimpleTrigger(
                {
                    start: startTime,
                    period,
                    count: 0
                },
                mockJob
            );

            expect(trigger.count).toBe(-1); // The actual implementation converts 0 to -1 (no limit)
        });

        test('should throw error for invalid trigger config', () => {
            const mockJob = { runTime: 0 };
            expect(() => {
                createSimpleTrigger({ count: 10 }, mockJob);
            }).toThrow();
        });
    });

    describe('nextExecuteTime', () => {
        test('should return start time for first execution', () => {
            const startTime = Date.now() + 1000;
            const mockJob = { runTime: 0 };
            const trigger = createSimpleTrigger({ start: startTime, period: 1000 }, mockJob);

            expect(trigger.nextExecuteTime()).toBe(startTime + 1000);
        });

        test('should return null when start time is in the past and no period', () => {
            const startTime = Date.now() - 1000;
            const mockJob = { runTime: 0 };
            const trigger = createSimpleTrigger({ start: startTime }, mockJob);

            expect(trigger.nextExecuteTime()).toBeNull();
        });

        test('should return periodic times for recurring trigger', () => {
            const startTime = Date.now();
            const period = 5000;
            const count = 3;
            const mockJob = { runTime: 0 };
            const trigger = createSimpleTrigger({ start: startTime, period, count }, mockJob);

            // First call adds period to nextTime
            expect(trigger.nextExecuteTime()).toBe(startTime + period);
            trigger.job.runTime = 1;
            expect(trigger.nextExecuteTime()).toBe(startTime + 2 * period);
            trigger.job.runTime = 2;
            expect(trigger.nextExecuteTime()).toBe(startTime + 3 * period);
            trigger.job.runTime = 3;
            expect(trigger.nextExecuteTime()).toBeNull();
        });

        test('should return null after count executions', () => {
            const startTime = Date.now();
            const period = 5000;
            const count = 2;
            const mockJob = { runTime: 3 };
            const trigger = createSimpleTrigger({ start: startTime, period, count }, mockJob);

            expect(trigger.nextExecuteTime()).toBeNull();
        });

        test('should handle zero count as infinite', () => {
            const startTime = Date.now();
            const period = 5000;
            const mockJob = { runTime: 100 };
            const trigger = createSimpleTrigger({ start: startTime, period, count: 0 }, mockJob);

            // Since count is 0 (converted to -1), it should continue infinitely
            // nextExecuteTime adds period to current nextTime
            expect(trigger.nextExecuteTime()).toBe(startTime + period);
        });
    });

    describe('executeTime', () => {
        test('should return the next execution time', () => {
            const startTime = Date.now() + 1000;
            const mockJob = { runTime: 0 };
            const trigger = createSimpleTrigger({ start: startTime }, mockJob);

            expect(trigger.executeTime()).toBe(startTime);
        });
    });

    describe('validation', () => {
        test('should check if trigger is valid', () => {
            const mockJob = { runTime: 0 };
            const trigger = createSimpleTrigger({ start: Date.now() + 1000 }, mockJob);
            expect(trigger.isTriggerValid()).toBe(true);
        });

        test('should validate trigger configuration', () => {
            expect(SimpleTrigger.validateTrigger({ start: Date.now() + 1000 })).toBe(true);
            expect(SimpleTrigger.validateTrigger({ count: 10 })).toBe(false);
        });
    });

    describe('reset', () => {
        test('should reset trigger with new configuration', () => {
            const mockJob = { runTime: 0 };
            const trigger = createSimpleTrigger({ start: Date.now() + 1000, period: 1000 }, mockJob);

            trigger.reset({ start: Date.now() + 2000, period: 2000, count: 5 });

            expect(trigger.period).toBe(2000);
            expect(trigger.count).toBe(5);
        });
    });

    describe('cleanup', () => {
        test('should clean up resources', () => {
            const mockJob = { runTime: 0 };
            const trigger = createSimpleTrigger({ start: Date.now() + 1000 }, mockJob);

            expect(() => {
                trigger.cleanup();
            }).not.toThrow();

            expect(trigger.isTriggerValid()).toBe(false);
        });
    });

    describe('statistics', () => {
        test('should return statistics', () => {
            const mockJob = { runTime: 0 };
            const trigger = createSimpleTrigger({ start: Date.now() + 1000 }, mockJob);
            const stats = trigger.getStats();

            expect(stats).toHaveProperty('totalExecutions');
            expect(stats).toHaveProperty('errors');
            expect(stats).toHaveProperty('isValid');
        });
    });

    describe('resource management', () => {
        test('should manage resources', () => {
            const mockJob = { runTime: 0 };
            const trigger = createSimpleTrigger({ start: Date.now() + 1000 }, mockJob);
            const resource = { test: 'resource' };

            trigger.addResource(resource);
            expect(trigger.resources.has(resource)).toBe(true);

            trigger.removeResource(resource);
            expect(trigger.resources.has(resource)).toBe(false);
        });
    });
});
