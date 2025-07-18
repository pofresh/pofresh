const Job = require('../lib/job');

describe('Job', () => {
  describe('createJob', () => {
    test('should create job with trigger and function', () => {
      const mockTrigger = {
        nextExecuteTime: () => Date.now() + 1000,
        executeTime: () => Date.now() + 1000
      };
      const mockFn = () => {};
      const data = { test: 'data' };

      const job = Job.createJob(mockTrigger, mockFn, data);

      expect(job.trigger).toBe(mockTrigger);
      expect(job.func).toBe(mockFn);
      expect(job.data).toBe(data);
      expect(job.id).toBeDefined();
    });
  });

  describe('run', () => {
    test('should execute the job function with data', () => {
      let executed = false;
      const mockTrigger = {
        nextExecuteTime: () => Date.now() + 1000,
        executeTime: () => Date.now() + 1000
      };
      const mockFn = (data) => {
        executed = true;
        expect(data).toEqual({ test: 'data' });
      };
      const data = { test: 'data' };

      const job = Job.createJob(mockTrigger, mockFn, data);
      job.run();

      expect(executed).toBe(true);
    });
  });

  describe('nextTime', () => {
    test('should return next execution time from trigger', () => {
      const mockTrigger = {
        nextExecuteTime: () => 123456789,
        executeTime: () => 123456789
      };
      const mockFn = () => {};

      const job = Job.createJob(mockTrigger, mockFn);
      const nextTime = job.nextTime();

      expect(nextTime).toBe(123456789);
    });
  });

  describe('executeTime', () => {
    test('should return current execute time from trigger', () => {
      const mockTrigger = {
        nextExecuteTime: () => 123456789,
        executeTime: () => 987654321
      };
      const mockFn = () => {};

      const job = Job.createJob(mockTrigger, mockFn);
      const execTime = job.executeTime();

      expect(execTime).toBe(987654321);
    });
  });
});