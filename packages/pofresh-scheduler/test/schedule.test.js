const schedule = require('../lib/schedule');
const cronTrigger = require('../lib/cronTrigger');

describe('Schedule', () => {
  let jobId;

  afterEach(() => {
    if (jobId) {
      try {
        schedule.cancelJob(jobId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe('scheduleJob', () => {
    test('should schedule simple job with delay', () => {
      return new Promise((resolve) => {
        const startTime = Date.now();
        const delay = 100;
        
        jobId = schedule.scheduleJob({ start: Date.now() + delay }, (data) => {
          expect(Date.now() - startTime).toBeGreaterThanOrEqual(delay);
          resolve();
        });
        
        expect(jobId).toBeDefined();
        expect(typeof jobId).toBe('number');
      });
    });

    test('should schedule periodic job', () => {
      return new Promise((resolve) => {
        const startTime = Date.now();
        const period = 50;
        const count = 3;
        let executions = 0;
        
        jobId = schedule.scheduleJob({ start: Date.now(), period, count }, (data) => {
          executions++;
          if (executions === count) {
            expect(executions).toBe(count);
            resolve();
          }
        });
      });
    });

    test('should schedule cron job', () => {
      return new Promise((resolve) => {
        // Schedule for next second
        const date = new Date(Date.now() + 1100);
        const cronExpr = `${date.getSeconds()} ${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth()} ${date.getDay()}`;
        
        jobId = schedule.scheduleJob(cronExpr, (data) => {
          resolve();
        });
        
        expect(jobId).toBeDefined();
      });
    });

    test('should pass data to job function', () => {
      return new Promise((resolve) => {
        const testData = { message: 'test', value: 42 };
        
        jobId = schedule.scheduleJob({ start: Date.now() + 50 }, (data) => {
          expect(data).toEqual(testData);
          resolve();
        }, testData);
      });
    });

    test('should throw error for invalid cron expression', () => {
      expect(() => {
        schedule.scheduleJob('invalid cron', () => {});
      }).toThrow();
    });
  });

  describe('cancelJob', () => {
    test('should cancel scheduled job', () => {
      return new Promise((resolve, reject) => {
        const mockJob = vi.fn();
        
        jobId = schedule.scheduleJob({ start: Date.now() + 200 }, mockJob);
        schedule.cancelJob(jobId);
        
        // Wait to ensure job doesn't run
        setTimeout(() => {
          expect(mockJob).not.toHaveBeenCalled();
          resolve();
        }, 300);
      });
    });

    test('should throw error for non-existent job', () => {
      expect(() => {
        schedule.cancelJob('non-existent-id');
      }).toThrow();
    });
  });

  describe('job management', () => {
    test('should handle multiple jobs', () => {
      return new Promise((resolve) => {
        let completedJobs = 0;
        const totalJobs = 3;
        const jobIds = [];
        
        for (let i = 0; i < totalJobs; i++) {
          const id = schedule.scheduleJob({ start: Date.now() + 50 }, (data) => {
            completedJobs++;
            if (completedJobs === totalJobs) {
              expect(completedJobs).toBe(totalJobs);
              resolve();
            }
          });
          jobIds.push(id);
        }
        
        expect(jobIds).toHaveLength(totalJobs);
        jobIds.forEach(id => {
          expect(typeof id).toBe('number');
        });
      });
    });
  });
});