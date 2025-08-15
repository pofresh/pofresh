import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import PerformanceMonitor from '../lib/util/performanceMonitor.js';

describe('PerformanceMonitor', () => {
    let performanceMonitor;

    beforeEach(() => {
        performanceMonitor = new PerformanceMonitor({
            enableMetrics: true,
            enableProfiling: true,
            enableAlerts: true,
            warningThresholds: {
                loadTime: 50, // Lower threshold for testing
                memoryUsage: 1024 * 1024, // 1MB
                cacheHitRate: 0.6,
                errorRate: 0.02
            },
            criticalThresholds: {
                loadTime: 100,
                memoryUsage: 2 * 1024 * 1024, // 2MB
                cacheHitRate: 0.4,
                errorRate: 0.05
            }
        });
    });

    afterEach(() => {
        performanceMonitor.stop();
        performanceMonitor.clear();
    });

    describe('load operation recording', () => {
        it('should record successful load operations', () => {
            performanceMonitor.recordLoad('/test/module.js', 25, true);

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.load.total).toBe(1);
            expect(metrics.load.success).toBe(1);
            expect(metrics.load.failed).toBe(0);
            expect(metrics.load.averageTime).toBe(25);
            expect(metrics.load.minTime).toBe(25);
            expect(metrics.load.maxTime).toBe(25);
        });

        it('should record failed load operations', () => {
            performanceMonitor.recordLoad('/test/module.js', 25, false);

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.load.total).toBe(1);
            expect(metrics.load.success).toBe(0);
            expect(metrics.load.failed).toBe(1);
        });

        it('should calculate average time correctly', () => {
            performanceMonitor.recordLoad('/test/module1.js', 25, true);
            performanceMonitor.recordLoad('/test/module2.js', 75, true);

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.load.averageTime).toBe(50);
        });

        it('should track min and max times', () => {
            performanceMonitor.recordLoad('/test/module1.js', 25, true);
            performanceMonitor.recordLoad('/test/module2.js', 75, true);
            performanceMonitor.recordLoad('/test/module3.js', 50, true);

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.load.minTime).toBe(25);
            expect(metrics.load.maxTime).toBe(75);
        });
    });

    describe('cache operation recording', () => {
        it('should record cache hits and misses', () => {
            performanceMonitor.recordCache('hit', 'key1');
            performanceMonitor.recordCache('hit', 'key2');
            performanceMonitor.recordCache('miss', 'key3');

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.cache.hits).toBe(2);
            expect(metrics.cache.misses).toBe(1);
            expect(metrics.cache.hitRate).toBeCloseTo(0.67, 2);
        });

        it('should record cache evictions', () => {
            performanceMonitor.recordCache('eviction', 'key1');

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.cache.evictions).toBe(1);
        });

        it('should update cache statistics', () => {
            performanceMonitor.updateCacheStats(10, 1024);

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.cache.size).toBe(10);
            expect(metrics.cache.memoryUsage).toBe(1024);
        });
    });

    describe('error recording', () => {
        it('should record errors with codes', () => {
            performanceMonitor.recordError('FILE_NOT_FOUND', 'File not found');
            performanceMonitor.recordError('PERMISSION_DENIED', 'Permission denied');
            performanceMonitor.recordError('FILE_NOT_FOUND', 'Another file not found');

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.errors.total).toBe(3);
            expect(metrics.errors.byCode.get('FILE_NOT_FOUND')).toBe(2);
            expect(metrics.errors.byCode.get('PERMISSION_DENIED')).toBe(1);
        });
    });

    describe('profiling', () => {
        it('should start and end profiles', () => {
            const profileId = performanceMonitor.startProfile('test_operation', { test: 'data' });

            expect(profileId).toBeDefined();
            expect(typeof profileId).toBe('string');

            // Simulate some work
            setTimeout(() => {
                const profile = performanceMonitor.endProfile(profileId, { success: true });

                expect(profile).toBeDefined();
                expect(profile.operation).toBe('test_operation');
                expect(profile.duration).toBeGreaterThan(0);
                expect(profile.active).toBe(false);
                expect(profile.result.success).toBe(true);
            }, 10);
        });

        it('should add profile steps', () => {
            const profileId = performanceMonitor.startProfile('test_operation');

            performanceMonitor.addProfileStep(profileId, 'step1', { data: 'test1' });
            performanceMonitor.addProfileStep(profileId, 'step2', { data: 'test2' });

            const profile = performanceMonitor.endProfile(profileId);

            expect(profile.steps).toHaveLength(2);
            expect(profile.steps[0].name).toBe('step1');
            expect(profile.steps[1].name).toBe('step2');
        });

        it('should return null for non-existent profiles', () => {
            const profile = performanceMonitor.endProfile('non_existent_id');
            expect(profile).toBeNull();
        });
    });

    describe('alerts', () => {
        it('should generate warnings for threshold breaches', () => {
            performanceMonitor.recordLoad('/test/slow.js', 60, true); // Above warning threshold

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.alerts.length).toBeGreaterThan(0);
            expect(metrics.alerts[0].severity).toBe('warning');
            expect(metrics.alerts[0].metric).toBe('loadTime');
        });

        it('should generate critical alerts for critical threshold breaches', () => {
            performanceMonitor.recordLoad('/test/critical.js', 120, true); // Above critical threshold

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.alerts.some(alert => alert.severity === 'critical')).toBe(true);
        });

        it('should throttle alerts', () => {
            // Generate multiple alerts quickly
            performanceMonitor.recordLoad('/test/slow1.js', 60, true);
            performanceMonitor.recordLoad('/test/slow2.js', 60, true);

            const metrics = performanceMonitor.getMetrics();
            // Should have fewer alerts due to throttling
            expect(metrics.alerts.length).toBeLessThan(2);
        });
    });

    describe('performance reports', () => {
        it('should generate comprehensive performance reports', () => {
            // Add some test data
            performanceMonitor.recordLoad('/test/module1.js', 25, true);
            performanceMonitor.recordLoad('/test/module2.js', 75, true);
            performanceMonitor.recordLoad('/test/module3.js', 60, false);
            performanceMonitor.recordCache('hit', 'key1');
            performanceMonitor.recordCache('miss', 'key2');

            const report = performanceMonitor.getReport();

            expect(report.summary.totalOperations).toBe(3);
            expect(report.summary.successRate).toBeCloseTo(0.67, 2);
            expect(report.summary.averageLoadTime).toBeCloseTo(53.33, 2);
            expect(report.summary.cacheHitRate).toBe(0.5);
            expect(report.summary.errorRate).toBeCloseTo(0.33, 2);
            expect(report.health).toBeGreaterThan(0);
            expect(report.health).toBeLessThanOrEqual(100);
        });

        it('should generate recommendations', () => {
            // Add data that should trigger recommendations
            performanceMonitor.recordLoad('/test/slow.js', 80, true);
            performanceMonitor.recordCache('miss', 'key1');
            performanceMonitor.recordCache('miss', 'key2');

            const report = performanceMonitor.getReport();

            expect(report.recommendations.length).toBeGreaterThan(0);
            expect(report.recommendations.some(r => r.category === 'performance')).toBe(true);
            expect(report.recommendations.some(r => r.category === 'caching')).toBe(true);
        });

        it('should identify bottlenecks', () => {
            // Add slow operations
            performanceMonitor.recordLoad('/test/slow1.js', 80, true);
            performanceMonitor.recordLoad('/test/slow2.js', 90, true);

            const report = performanceMonitor.getReport();

            expect(report.bottlenecks.length).toBeGreaterThan(0);
            expect(report.bottlenecks[0].type).toBe('slow_modules');
        });
    });

    describe('metrics retrieval', () => {
        it('should return current metrics', () => {
            performanceMonitor.recordLoad('/test/module.js', 50, true);
            performanceMonitor.recordCache('hit', 'key1');

            const metrics = performanceMonitor.getMetrics();

            expect(metrics.load.total).toBe(1);
            expect(metrics.cache.hits).toBe(1);
            expect(metrics.uptime).toBeGreaterThan(0);
            expect(metrics.alerts).toBeDefined();
        });

        it('should return profile data', () => {
            const profileId = performanceMonitor.startProfile('test');
            performanceMonitor.endProfile(profileId);

            const profiles = performanceMonitor.getProfiles();

            expect(profiles.length).toBe(1);
            expect(profiles[0].operation).toBe('test');
        });

        it('should return specific profile by ID', () => {
            const profileId = performanceMonitor.startProfile('test');
            performanceMonitor.endProfile(profileId);

            const profile = performanceMonitor.getProfiles(profileId);

            expect(profile).toBeDefined();
            expect(profile.operation).toBe('test');
        });
    });

    describe('cleanup and management', () => {
        it('should clear all data', () => {
            performanceMonitor.recordLoad('/test/module.js', 50, true);
            performanceMonitor.recordCache('hit', 'key1');
            performanceMonitor.recordError('TEST_ERROR', 'Test error');

            performanceMonitor.clear();

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.load.total).toBe(0);
            expect(metrics.cache.hits).toBe(0);
            expect(metrics.errors.total).toBe(0);
        });

        it('should stop monitoring', () => {
            performanceMonitor.stop();

            // Should not throw when stopped
            performanceMonitor.recordLoad('/test/module.js', 50, true);
            const metrics = performanceMonitor.getMetrics();
            expect(metrics.load.total).toBe(1);
        });
    });

    describe('system metrics', () => {
        it('should update system metrics', () => {
            // Manually trigger system metrics update
            performanceMonitor.updateSystemMetrics();

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.memory.usage).toBeGreaterThan(0);
            expect(metrics.system.uptime).toBeGreaterThan(0);
        });
    });
});
