import { Job, createJob, getGlobalStats } from '../lib/job.js';

describe('Job', () => {
    describe('createJob', () => {
        test('should create job with simple trigger and function', () => {
            const triggerConfig = {
                start: Date.now() + 1000,
                period: 5000,
                count: 3
            };
            const mockFn = () => {};
            const data = { test: 'data' };

            const job = createJob(triggerConfig, mockFn, data);

            expect(job.trigger).toBeDefined();
            expect(job.func).toBe(mockFn);
            expect(job.data).toBe(data);
            expect(job.id).toBeDefined();
            expect(job.type).toBe(1); // SIMPLE type
        });

        test('should create job with cron trigger and function', () => {
            const triggerConfig = '0 0 12 * * *';
            const mockFn = () => {};
            const data = { test: 'data' };

            const job = createJob(triggerConfig, mockFn, data);

            expect(job.trigger).toBeDefined();
            expect(job.func).toBe(mockFn);
            expect(job.data).toBe(data);
            expect(job.id).toBeDefined();
            expect(job.type).toBe(2); // CRON type
        });

        test('should throw error for invalid trigger', () => {
            const mockFn = () => {};
            expect(() => {
                createJob('invalid cron', mockFn);
            }).toThrow();
        });
    });

    describe('run', () => {
        test('should execute the job function with data', () => {
            let executed = false;
            const triggerConfig = {
                start: Date.now() + 1000
            };
            const mockFn = data => {
                executed = true;
                expect(data).toEqual({ test: 'data' });
            };
            const data = { test: 'data' };

            const job = createJob(triggerConfig, mockFn, data);
            job.run();

            expect(executed).toBe(true);
        });

        test('should not run inactive job', () => {
            let executed = false;
            const triggerConfig = {
                start: Date.now() + 1000
            };
            const mockFn = () => { executed = true; };
            const job = createJob(triggerConfig, mockFn);
            
            job.pause();
            job.run();

            expect(executed).toBe(false);
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
            const mockFn = () => {};

            const job = createJob(triggerConfig, mockFn);
            const nextTime = job.nextTime();

            expect(nextTime).toBe(startTime + 5000);
        });

        test('should return null for inactive job', () => {
            const triggerConfig = {
                start: Date.now() + 1000
            };
            const mockFn = () => {};
            const job = createJob(triggerConfig, mockFn);
            
            job.pause();
            const nextTime = job.nextTime();

            expect(nextTime).toBeNull();
        });
    });

    describe('executeTime', () => {
        test('should return current execute time from trigger', () => {
            const startTime = Date.now() + 1000;
            const triggerConfig = {
                start: startTime
            };
            const mockFn = () => {};

            const job = createJob(triggerConfig, mockFn);
            const execTime = job.executeTime();

            expect(execTime).toBe(startTime);
        });
    });

    describe('pause/resume', () => {
        test('should pause and resume job', () => {
            const triggerConfig = {
                start: Date.now() + 1000
            };
            const mockFn = () => {};
            const job = createJob(triggerConfig, mockFn);

            expect(job.isJobActive()).toBe(true);
            
            job.pause();
            expect(job.isJobActive()).toBe(false);
            
            job.resume();
            expect(job.isJobActive()).toBe(true);
        });
    });

    describe('getInfo', () => {
        test('should return job information', () => {
            const triggerConfig = {
                start: Date.now() + 1000
            };
            const mockFn = () => {};
            const data = { test: 'data' };
            const job = createJob(triggerConfig, mockFn, data);

            const info = job.getInfo();

            expect(info).toHaveProperty('id');
            expect(info).toHaveProperty('type');
            expect(info).toHaveProperty('runTime');
            expect(info).toHaveProperty('isActive');
            expect(info).toHaveProperty('createdAt');
            expect(info).toHaveProperty('data');
            expect(info.data).toBe(data);
        });
    });

    describe('cleanup', () => {
        test('should clean up job resources', () => {
            const triggerConfig = {
                start: Date.now() + 1000
            };
            const mockFn = () => {};
            const job = createJob(triggerConfig, mockFn);

            expect(() => {
                job.cleanup();
            }).not.toThrow();

            expect(job.isJobActive()).toBe(false);
        });
    });

    describe('resource management', () => {
        test('should manage resources', () => {
            const triggerConfig = {
                start: Date.now() + 1000
            };
            const mockFn = () => {};
            const job = createJob(triggerConfig, mockFn);
            const resource = { test: 'resource' };

            job.addResource(resource);
            expect(job.resources.has(resource)).toBe(true);

            job.removeResource(resource);
            expect(job.resources.has(resource)).toBe(false);
        });
    });

    describe('global statistics', () => {
        test('should track global job statistics', () => {
            const initialStats = getGlobalStats();
            const initialCount = initialStats.totalJobsCreated;

            const triggerConfig = {
                start: Date.now() + 1000
            };
            const mockFn = () => {};
            const job = createJob(triggerConfig, mockFn);

            const newStats = getGlobalStats();
            expect(newStats.totalJobsCreated).toBe(initialCount + 1);
        });
    });
});
