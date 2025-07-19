import Job from '../lib/job.js';

describe('Job', () => {
  describe('createJob', () => {
    test('should create job with trigger and function', () => {
      const triggerConfig = {
        start: Date.now() + 1000,
        period: 5000,
        count: 3
      };
      const mockFn = () => { };
      const data = { test: 'data' };

      const job = Job.createJob(triggerConfig, mockFn, data);

      expect(job.trigger).toBeDefined();
      expect(job.func).toBe(mockFn);
      expect(job.data).toBe(data);
      expect(job.id).toBeDefined();
    });
  });

  describe('run', () => {
    test('should execute the job function with data', () => {
      let executed = false;
      const triggerConfig = {
        start: Date.now() + 1000
      };
      const mockFn = (data) => {
        executed = true;
        expect(data).toEqual({ test: 'data' });
      };
      const data = { test: 'data' };

      const job = Job.createJob(triggerConfig, mockFn, data);
      job.run();

      expect(executed).toBe(true);
    });
  });

  describe('nextTime', () => {
    test('should return next execution time from trigger', () => {
      const startTime = Date.now() + 1000;
      const triggerConfig = {
        start: startTime,
        period: 5000,
        count: 3
      };
      const mockFn = () => { };

      const job = Job.createJob(triggerConfig, mockFn);
      const nextTime = job.nextTime();

      expect(nextTime).toBe(startTime + 5000);
    });
  });

  describe('executeTime', () => {
    test('should return current execute time from trigger', () => {
      const startTime = Date.now() + 1000;
      const triggerConfig = {
        start: startTime
      };
      const mockFn = () => { };

      const job = Job.createJob(triggerConfig, mockFn);
      const execTime = job.executeTime();

      expect(execTime).toBe(startTime);
    });
  });
});