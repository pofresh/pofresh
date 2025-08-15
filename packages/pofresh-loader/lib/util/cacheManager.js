/**
 * Modern cache management system for pofresh-loader
 * Features: LRU eviction, TTL support, memory monitoring, statistics
 */

class CacheManager {
    constructor(options = {}) {
        this.options = {
            maxCacheSize: options.maxCacheSize || 1000,
            ttl: options.ttl || 0, // 0 means no TTL
            enableStats: options.enableStats !== false,
            memoryLimit: options.memoryLimit || 50 * 1024 * 1024, // 50MB default
            cleanupInterval: options.cleanupInterval || 60000, // 1 minute
            enableCompression: options.enableCompression || false,
            ...options
        };

        this.cache = new Map();
        this.accessOrder = new Map(); // For LRU tracking
        this.timers = new Map(); // For TTL cleanup
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            errors: 0,
            currentSize: 0,
            memoryUsage: 0,
            createdAt: Date.now()
        };

        this.isCleaningUp = false;
        this.cleanupTimer = null;

        this.startCleanupTimer();
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {*} Cached value or undefined
     */
    get(key) {
        try {
            const item = this.cache.get(key);
            if (!item) {
                this.stats.misses++;
                return undefined;
            }

            // Check TTL
            if (this.options.ttl > 0 && Date.now() > item.expiresAt) {
                this.delete(key);
                this.stats.misses++;
                return undefined;
            }

            // Update access order for LRU
            this.updateAccessOrder(key);
            this.stats.hits++;

            return item.value;
        } catch (err) {
            this.stats.errors++;
            return undefined;
        }
    }

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {Object} options - Override options for this entry
     * @returns {boolean} True if set successfully
     */
    set(key, value, options = {}) {
        try {
            const entryOptions = { ...this.options, ...options };

            // Check memory limits
            const estimatedSize = this.estimateSize(value);
            if (this.stats.memoryUsage + estimatedSize > entryOptions.memoryLimit) {
                this.evictLeastRecentlyUsed(estimatedSize);
            }

            // Check cache size limits
            if (this.cache.size >= entryOptions.maxCacheSize) {
                this.evictLeastRecentlyUsed();
            }

            const item = {
                value: entryOptions.enableCompression ? this.compress(value) : value,
                createdAt: Date.now(),
                expiresAt: entryOptions.ttl > 0 ? Date.now() + entryOptions.ttl : 0,
                size: estimatedSize,
                accessCount: 0,
                compressed: entryOptions.enableCompression
            };

            this.cache.set(key, item);
            this.updateAccessOrder(key);
            this.stats.currentSize = this.cache.size;
            this.stats.memoryUsage += estimatedSize;

            // Set TTL timer if needed
            if (entryOptions.ttl > 0) {
                this.setTtlTimer(key, entryOptions.ttl);
            }

            return true;
        } catch (err) {
            this.stats.errors++;
            return false;
        }
    }

    /**
     * Delete item from cache
     * @param {string} key - Cache key
     * @returns {boolean} True if deleted
     */
    delete(key) {
        try {
            const item = this.cache.get(key);
            if (item) {
                this.cache.delete(key);
                this.accessOrder.delete(key);
                this.clearTtlTimer(key);
                this.stats.memoryUsage -= item.size;
                this.stats.currentSize = this.cache.size;
                return true;
            }
            return false;
        } catch (err) {
            this.stats.errors++;
            return false;
        }
    }

    /**
     * Clear entire cache
     */
    clear() {
        try {
            this.cache.clear();
            this.accessOrder.clear();
            this.clearAllTtlTimers();
            this.stats.currentSize = 0;
            this.stats.memoryUsage = 0;
        } catch (err) {
            this.stats.errors++;
        }
    }

    /**
     * Check if key exists in cache
     * @param {string} key - Cache key
     * @returns {boolean} True if exists
     */
    has(key) {
        try {
            const item = this.cache.get(key);
            if (!item) return false;

            // Check TTL
            if (this.options.ttl > 0 && Date.now() > item.expiresAt) {
                this.delete(key);
                return false;
            }

            return true;
        } catch (err) {
            this.stats.errors++;
            return false;
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        return {
            ...this.stats,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
            uptime: Date.now() - this.stats.createdAt,
            memoryLimit: this.options.memoryLimit,
            memoryUsagePercent: (this.stats.memoryUsage / this.options.memoryLimit) * 100
        };
    }

    /**
     * Get all cache keys
     * @returns {Array} Array of cache keys
     */
    keys() {
        return Array.from(this.cache.keys());
    }

    /**
     * Get cache size
     * @returns {number} Number of items in cache
     */
    size() {
        return this.cache.size;
    }

    /**
     * Clean up expired items
     */
    cleanup() {
        if (this.isCleaningUp) return;

        this.isCleaningUp = true;
        try {
            const now = Date.now();
            const keysToDelete = [];

            for (const [key, item] of this.cache.entries()) {
                if (this.options.ttl > 0 && now > item.expiresAt) {
                    keysToDelete.push(key);
                }
            }

            for (const key of keysToDelete) {
                this.delete(key);
                this.stats.evictions++;
            }
        } catch (err) {
            this.stats.errors++;
        } finally {
            this.isCleaningUp = false;
        }
    }

    /**
     * Destroy cache manager and clean up resources
     */
    destroy() {
        this.stopCleanupTimer();
        this.clearAllTtlTimers();
        this.clear();
    }

    // Private methods

    /**
     * Update access order for LRU
     * @param {string} key - Cache key
     */
    updateAccessOrder(key) {
        this.accessOrder.delete(key);
        this.accessOrder.set(key, Date.now());

        const item = this.cache.get(key);
        if (item) {
            item.accessCount = (item.accessCount || 0) + 1;
        }
    }

    /**
     * Evict least recently used items
     * @param {number} requiredSize - Size needed for new item
     */
    evictLeastRecentlyUsed(requiredSize = 0) {
        const keys = Array.from(this.accessOrder.entries())
            .sort(([, a], [, b]) => a - b)
            .map(([key]) => key);

        let freedSpace = 0;
        for (const key of keys) {
            if (freedSpace >= requiredSize && this.cache.size < this.options.maxCacheSize) {
                break;
            }

            const item = this.cache.get(key);
            if (item) {
                freedSpace += item.size;
                this.delete(key);
                this.stats.evictions++;
            }
        }
    }

    /**
     * Estimate memory size of a value
     * @param {*} value - Value to estimate
     * @returns {number} Estimated size in bytes
     */
    estimateSize(value) {
        try {
            if (value === null || value === undefined) return 0;
            if (typeof value === 'boolean') return 4;
            if (typeof value === 'number') return 8;
            if (typeof value === 'string') return value.length * 2;
            if (typeof value === 'function') return 100; // Rough estimate

            // For objects and arrays, use JSON stringification as approximation
            return JSON.stringify(value).length * 2;
        } catch (err) {
            return 1000; // Conservative estimate
        }
    }

    /**
     * Compress value (placeholder implementation)
     * @param {*} value - Value to compress
     * @returns {*} Compressed value
     */
    compress(value) {
        // Placeholder for future compression implementation
        return value;
    }

    /**
     * Set TTL timer for a key
     * @param {string} key - Cache key
     * @param {number} ttl - Time to live in milliseconds
     */
    setTtlTimer(key, ttl) {
        this.clearTtlTimer(key);

        const timer = setTimeout(() => {
            this.delete(key);
            this.stats.evictions++;
        }, ttl);

        this.timers.set(key, timer);
    }

    /**
     * Clear TTL timer for a key
     * @param {string} key - Cache key
     */
    clearTtlTimer(key) {
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
    }

    /**
     * Clear all TTL timers
     */
    clearAllTtlTimers() {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
    }

    /**
     * Start cleanup timer
     */
    startCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.options.cleanupInterval);
    }

    /**
     * Stop cleanup timer
     */
    stopCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
}

module.exports = CacheManager;
