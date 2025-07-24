import { vi, beforeEach, afterEach } from 'vitest';
import schedule from '../lib/schedule.js';
import cronTrigger from '../lib/cronTrigger.js';

describe('Schedule', () => {
  let jobId;

  beforeEach(() => {
    // 使用模拟时间
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (jobId) {
      try {
        schedule.cancelJob(jobId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    // 恢复真实时间
    vi.useRealTimers();
  });

  describe('scheduleJob', () => {
    test('should schedule simple job with delay', async () => {
      const mockJob = vi.fn();
      const delay = 100;

      jobId = schedule.scheduleJob({ start: Date.now() + delay }, mockJob);

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('number');
      expect(mockJob).not.toHaveBeenCalled();

      // 快进时间到延迟时间
      await vi.advanceTimersByTimeAsync(delay);

      expect(mockJob).toHaveBeenCalledOnce();
    });

    test('should schedule periodic job', async () => {
      const mockJob = vi.fn();
      const period = 50;
      const count = 3;

      jobId = schedule.scheduleJob({ start: Date.now(), period, count }, mockJob);

      // 验证初始状态
      expect(mockJob).not.toHaveBeenCalled();

      // 快进时间，验证每次执行
      for (let i = 1; i <= count; i++) {
        await vi.advanceTimersByTimeAsync(period);
        expect(mockJob).toHaveBeenCalledTimes(i);
      }

      // 再次快进，确保不会再执行
      await vi.advanceTimersByTimeAsync(period);
      expect(mockJob).toHaveBeenCalledTimes(count);
    });

    test('should schedule cron job', async () => {
      const mockJob = vi.fn();

      // 设置一个固定的时间点进行测试
      const baseTime = new Date('2024-01-01 12:00:00');
      vi.setSystemTime(baseTime);

      // 创建一个在下一分钟执行的 cron 表达式
      const nextMinute = new Date(baseTime.getTime() + 60000);
      const cronExpr = `0 ${nextMinute.getMinutes()} ${nextMinute.getHours()} ${nextMinute.getDate()} ${nextMinute.getMonth()} *`;

      jobId = schedule.scheduleJob(cronExpr, mockJob);

      expect(jobId).toBeDefined();
      expect(mockJob).not.toHaveBeenCalled();

      // 快进到下一分钟
      await vi.advanceTimersByTimeAsync(60000);

      expect(mockJob).toHaveBeenCalledOnce();
    });

    test('should pass data to job function', async () => {
      const testData = { message: 'test', value: 42 };
      const mockJob = vi.fn();

      jobId = schedule.scheduleJob({ start: Date.now() + 50 }, mockJob, testData);

      await vi.advanceTimersByTimeAsync(50);

      expect(mockJob).toHaveBeenCalledOnce();
      expect(mockJob).toHaveBeenCalledWith(testData);
    });

    test('should throw error for invalid cron expression', () => {
      expect(() => {
        schedule.scheduleJob('invalid cron', () => { });
      }).toThrow();
    });
  });

  describe('cancelJob', () => {
    test('should cancel scheduled job', async () => {
      const mockJob = vi.fn();

      jobId = schedule.scheduleJob({ start: Date.now() + 200 }, mockJob);
      schedule.cancelJob(jobId);

      // 快进时间，确保任务不会执行
      await vi.advanceTimersByTimeAsync(300);

      expect(mockJob).not.toHaveBeenCalled();
    });

    test('should throw error for non-existent job', () => {
      expect(() => {
        schedule.cancelJob('non-existent-id');
      }).toThrow();
    });
  });

  describe('job management', () => {
    test('should handle multiple jobs', async () => {
      const totalJobs = 3;
      const jobIds = [];
      const mockJobs = [];

      // 创建多个任务
      for (let i = 0; i < totalJobs; i++) {
        const mockJob = vi.fn();
        mockJobs.push(mockJob);

        const id = schedule.scheduleJob({ start: Date.now() + 50 }, mockJob);
        jobIds.push(id);
      }

      expect(jobIds).toHaveLength(totalJobs);
      jobIds.forEach(id => {
        expect(typeof id).toBe('number');
      });

      // 验证初始状态
      mockJobs.forEach(mockJob => {
        expect(mockJob).not.toHaveBeenCalled();
      });

      // 快进时间
      await vi.advanceTimersByTimeAsync(50);

      // 验证所有任务都执行了
      mockJobs.forEach(mockJob => {
        expect(mockJob).toHaveBeenCalledOnce();
      });
    });
  });
});