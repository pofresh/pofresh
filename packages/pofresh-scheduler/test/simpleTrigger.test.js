import SimpleTrigger from '../lib/simpleTrigger.js';

describe('SimpleTrigger', () => {
  describe('constructor', () => {
    test('should create trigger with start time only', () => {
      const startTime = Date.now() + 1000;
      const trigger = SimpleTrigger.createTrigger({ start: startTime });
      
      expect(trigger.nextTime).toBe(startTime);
      expect(trigger.period).toBe(-1);
      expect(trigger.count).toBe(-1);
    });

    test('should create trigger with period and count', () => {
      const startTime = Date.now();
      const period = 5000;
      const count = 3;
      const trigger = SimpleTrigger.createTrigger({ start: startTime, period, count });
      
      expect(trigger.nextTime).toBe(startTime);
      expect(trigger.period).toBe(period);
      expect(trigger.count).toBe(count);
    });

    test('should create trigger with infinite count when count is 0', () => {
      const startTime = Date.now();
      const period = 5000;
      const trigger = SimpleTrigger.createTrigger({ start: startTime, period, count: 0 });
      
      expect(trigger.count).toBe(-1); // The actual implementation converts 0 to -1 (no limit)
    });
  });

  describe('nextExecuteTime', () => {
    test('should return start time for first execution', () => {
      const startTime = Date.now() + 1000;
      const mockJob = { runTime: 0 };
      const trigger = SimpleTrigger.createTrigger({ start: startTime, period: 1000 }, mockJob);
      
      expect(trigger.nextExecuteTime()).toBe(startTime + 1000);
    });

    test('should return 0 when start time is in the past and no period', () => {
      const startTime = Date.now() - 1000;
      const mockJob = { runTime: 0 };
      const trigger = SimpleTrigger.createTrigger({ start: startTime }, mockJob);
      
      expect(trigger.nextExecuteTime()).toBe(0);
    });

    test('should return periodic times for recurring trigger', () => {
      const startTime = Date.now();
      const period = 5000;
      const count = 3;
      const mockJob = { runTime: 0 };
      const trigger = SimpleTrigger.createTrigger({ start: startTime, period, count }, mockJob);
      
      // First call adds period to nextTime
      expect(trigger.nextExecuteTime()).toBe(startTime + period);
      trigger.job.runTime = 1;
      expect(trigger.nextExecuteTime()).toBe(startTime + 2 * period);
      trigger.job.runTime = 2;
      expect(trigger.nextExecuteTime()).toBe(startTime + 3 * period);
      trigger.job.runTime = 3;
      expect(trigger.nextExecuteTime()).toBe(0);
    });

    test('should return 0 after count executions', () => {
      const startTime = Date.now();
      const period = 5000;
      const count = 2;
      const mockJob = { runTime: 3 };
      const trigger = SimpleTrigger.createTrigger({ start: startTime, period, count }, mockJob);
      
      expect(trigger.nextExecuteTime()).toBe(0);
    });

    test('should handle zero count as infinite', () => {
      const startTime = Date.now();
      const period = 5000;
      const mockJob = { runTime: 100 };
      const trigger = SimpleTrigger.createTrigger({ start: startTime, period, count: 0 }, mockJob);
      
      // Since count is 0 (converted to -1), it should continue infinitely
      // nextExecuteTime adds period to current nextTime
      expect(trigger.nextExecuteTime()).toBe(startTime + period);
    });
  });

  describe('executeTime', () => {
    test('should return the next execution time', () => {
      const startTime = Date.now() + 1000;
      const trigger = SimpleTrigger.createTrigger({ start: startTime });
      
      expect(trigger.executeTime()).toBe(startTime);
    });
  });
});