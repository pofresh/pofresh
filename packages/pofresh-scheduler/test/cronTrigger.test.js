const cronTrigger = require('../lib/cronTrigger');
const decoder = require('../lib/cronTriggerDecoder');

const SECOND = 0;
const MIN = 1;
const HOUR = 2;
const DOM = 3;
const MONTH = 4;
const DOW = 5;

describe('CronTrigger', () => {
  describe('createTrigger', () => {
    test('should create a valid cron trigger instance', () => {
      const trigger = cronTrigger.createTrigger('0 0 12 * * *', () => {});
      expect(trigger).toBeDefined();
      expect(trigger.trigger).toBeDefined();
      expect(trigger.nextTime).toBeDefined();
    });
  });

  describe('executeTime', () => {
    test('should return the next execution time', () => {
      const trigger = cronTrigger.createTrigger('0 0 12 * * *', () => {});
      const executeTime = trigger.executeTime();
      expect(typeof executeTime).toBe('number');
      expect(executeTime).toBeGreaterThan(Date.now());
    });
  });

  describe('nextExecuteTime', () => {
    test('should calculate next execution time for daily trigger', () => {
      const trigger = cronTrigger.createTrigger('0 0 12 * * *', () => {});
      const now = Date.now();
      const nextTime = trigger.nextExecuteTime(now);
      
      expect(nextTime).toBeGreaterThan(now);
      const nextDate = new Date(nextTime);
      expect(nextDate.getHours()).toBe(12);
      expect(nextDate.getMinutes()).toBe(0);
      expect(nextDate.getSeconds()).toBe(0);
    });

    test('should handle edge case cron expression', () => {
      const trigger = cronTrigger.createTrigger('0 0 12 31 2 *', () => {});
      const nextTime = trigger.nextExecuteTime(Date.now());
      expect(typeof nextTime).toBe('number');
      expect(nextTime).toBeGreaterThan(Date.now());
    });

    test('should handle monthly trigger', () => {
      const trigger = cronTrigger.createTrigger('0 0 12 1 * *', () => {});
      const now = Date.now();
      const nextTime = trigger.nextExecuteTime(now);
      
      expect(nextTime).toBeGreaterThan(now);
      const nextDate = new Date(nextTime);
      expect(nextDate.getDate()).toBe(1);
      expect(nextDate.getHours()).toBe(12);
    });

    test('should handle weekly trigger', () => {
      const trigger = cronTrigger.createTrigger('0 0 12 * * 1', () => {});
      const now = Date.now();
      const nextTime = trigger.nextExecuteTime(now);
      
      expect(nextTime).toBeGreaterThan(now);
      const nextDate = new Date(nextTime);
      expect(nextDate.getDay()).toBe(1); // Monday
      expect(nextDate.getHours()).toBe(12);
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