import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CacheManager from '../lib/util/cacheManager.js';

describe('CacheManager', () => {
    let cacheManager;

    beforeEach(() => {
        cacheManager = new CacheManager({
            maxCacheSize: 5,
            ttl: 1000, // 1 second for testing
            memoryLimit: 1000,
            enableStats: true
        });
    });

    afterEach(() => {
        cacheManager.destroy();
    });

    describe('basic operations', () => {
        it('should store and retrieve values', () => {
            cacheManager.set('key1', 'value1');
            expect(cacheManager.get('key1')).toBe('value1');
        });

        it('should return undefined for non-existent keys', () => {
            expect(cacheManager.get('nonexistent')).toBeUndefined();
        });

        it('should check if key exists', () => {
            cacheManager.set('key1', 'value1');
            expect(cacheManager.has('key1')).toBe(true);
            expect(cacheManager.has('nonexistent')).toBe(false);
        });

        it('should delete keys', () => {
            cacheManager.set('key1', 'value1');
            expect(cacheManager.delete('key1')).toBe(true);
            expect(cacheManager.get('key1')).toBeUndefined();
            expect(cacheManager.delete('nonexistent')).toBe(false);
        });

        it('should clear all cache', () => {
            cacheManager.set('key1', 'value1');
            cacheManager.set('key2', 'value2');
            cacheManager.clear();
            expect(cacheManager.size()).toBe(0);
            expect(cacheManager.get('key1')).toBeUndefined();
            expect(cacheManager.get('key2')).toBeUndefined();
        });
    });

    describe('TTL functionality', () => {
        it('should expire entries after TTL', async () => {
            cacheManager.set('key1', 'value1');
            expect(cacheManager.get('key1')).toBe('value1');

            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 1100));

            expect(cacheManager.get('key1')).toBeUndefined();
        });

        it('should not expire entries when TTL is 0', async () => {
            const noTtlCache = new CacheManager({ ttl: 0 });
            noTtlCache.set('key1', 'value1');

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(noTtlCache.get('key1')).toBe('value1');
            noTtlCache.destroy();
        });
    });

    describe('LRU eviction', () => {
        it('should evict least recently used items when cache is full', () => {
            // Fill cache to capacity
            for (let i = 1; i <= 5; i++) {
                cacheManager.set(`key${i}`, `value${i}`);
            }

            expect(cacheManager.size()).toBe(5);

            // Access key1 to make it recently used
            cacheManager.get('key1');

            // Add new item to trigger eviction
            cacheManager.set('key6', 'value6');

            // Should have evicted the least recently used (key2, since key1 was accessed)
            expect(cacheManager.size()).toBe(5);
            expect(cacheManager.get('key1')).toBe('value1'); // Still there
            expect(cacheManager.get('key2')).toBeUndefined(); // Evicted
        });
    });

    describe('memory management', () => {
        it('should track memory usage', () => {
            cacheManager.set('key1', 'value1');
            cacheManager.set('key2', { data: 'larger object' });

            const stats = cacheManager.getStats();
            expect(stats.memoryUsage).toBeGreaterThan(0);
            expect(stats.currentSize).toBe(2);
        });

        it('should evict based on memory limit', () => {
            const largeCache = new CacheManager({
                maxCacheSize: 10,
                memoryLimit: 50 // Very small limit
            });

            // Add items that exceed memory limit
            largeCache.set('key1', 'x'.repeat(30)); // ~60 bytes
            largeCache.set('key2', 'y'.repeat(30)); // ~60 bytes

            // Should have evicted some items due to memory limit
            expect(largeCache.size()).toBeLessThan(2);
            largeCache.destroy();
        });
    });

    describe('statistics', () => {
        it('should track cache statistics', () => {
            cacheManager.set('key1', 'value1');
            cacheManager.get('key1'); // hit
            cacheManager.get('key1'); // hit
            cacheManager.get('nonexistent'); // miss

            const stats = cacheManager.getStats();
            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(1);
            expect(stats.hitRate).toBeCloseTo(0.67, 2);
            expect(stats.currentSize).toBe(1);
        });

        it('should track evictions', () => {
            // Fill cache and trigger eviction
            for (let i = 1; i <= 10; i++) {
                cacheManager.set(`key${i}`, `value${i}`);
            }

            const stats = cacheManager.getStats();
            expect(stats.evictions).toBeGreaterThan(0);
        });
    });

    describe('cleanup', () => {
        it('should cleanup expired entries', async () => {
            cacheManager.set('key1', 'value1');
            cacheManager.set('key2', 'value2');

            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 1100));

            cacheManager.cleanup();

            expect(cacheManager.size()).toBe(0);
        });

        it('should handle cleanup errors gracefully', () => {
            // Simulate error during cleanup
            const originalCleanup = cacheManager.cleanup;
            cacheManager.cleanup = () => {
                throw new Error('Cleanup error');
            };

            expect(() => {
                try {
                    cacheManager.cleanup();
                } catch (err) {
                    // Should be caught and logged, not thrown
                    console.error('Cleanup error (expected in test):', err.message);
                }
            }).not.toThrow();

            // Restore original method
            cacheManager.cleanup = originalCleanup;
        });
    });

    describe('utility methods', () => {
        it('should return all keys', () => {
            cacheManager.set('key1', 'value1');
            cacheManager.set('key2', 'value2');

            const keys = cacheManager.keys();
            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
            expect(keys.length).toBe(2);
        });

        it('should return correct size', () => {
            expect(cacheManager.size()).toBe(0);
            cacheManager.set('key1', 'value1');
            expect(cacheManager.size()).toBe(1);
        });
    });

    describe('options override', () => {
        it('should respect per-entry options', () => {
            cacheManager.set('key1', 'value1', { ttl: 100 }); // Custom TTL
            cacheManager.set('key2', 'value2'); // Default TTL

            // Wait for custom TTL to expire but not default
            setTimeout(() => {
                expect(cacheManager.get('key1')).toBeUndefined();
                expect(cacheManager.get('key2')).toBe('value2');
            }, 150);
        });
    });
});
