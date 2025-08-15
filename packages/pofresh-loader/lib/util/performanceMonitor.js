/**
 * Performance monitoring and diagnostics for pofresh-loader
 * Features: Real-time metrics, performance profiling, bottleneck detection
 */

const { performance } = require('perf_hooks');

/**
 * Performance monitoring configuration
 */
const PERFORMANCE_CONFIG = {
    // Metrics collection
    enableMetrics: true,
    metricsInterval: 1000, // 1 second
    maxMetricsHistory: 3600, // 1 hour of data

    // Profiling
    enableProfiling: true,
    profileSampleRate: 0.1, // 10% of operations
    maxProfileDepth: 10,

    // Thresholds
    warningThresholds: {
        loadTime: 100, // ms
        memoryUsage: 50 * 1024 * 1024, // 50MB
        cacheHitRate: 0.8, // 80%
        errorRate: 0.05 // 5%
    },

    criticalThresholds: {
        loadTime: 1000, // ms
        memoryUsage: 100 * 1024 * 1024, // 100MB
        cacheHitRate: 0.5, // 50%
        errorRate: 0.1 // 10%
    },

    // Monitoring
    enableMemoryMonitoring: true,
    enableCpuMonitoring: true,
    enableDiskMonitoring: true,

    // Alerts
    enableAlerts: true,
    alertCooldown: 60000, // 1 minute
    maxAlerts: 100
};

/**
 * Performance metrics collector
 */
class PerformanceMonitor {
    constructor(options = {}) {
        this.config = { ...PERFORMANCE_CONFIG, ...options };

        // Metrics storage
        this.metrics = {
            load: {
                total: 0,
                success: 0,
                failed: 0,
                totalTime: 0,
                averageTime: 0,
                minTime: Infinity,
                maxTime: 0,
                history: []
            },
            cache: {
                hits: 0,
                misses: 0,
                evictions: 0,
                size: 0,
                memoryUsage: 0,
                hitRate: 0,
                history: []
            },
            memory: {
                usage: 0,
                heapUsed: 0,
                heapTotal: 0,
                external: 0,
                history: []
            },
            errors: {
                total: 0,
                byCode: new Map(),
                history: []
            },
            system: {
                cpuUsage: 0,
                uptime: 0,
                loadAverage: 0,
                history: []
            }
        };

        // Profiling data
        this.profiles = new Map();
        this.activeProfiles = new Map();

        // Alerts
        this.alerts = [];
        this.alertThrottle = new Map();

        // Timers
        this.metricsTimer = null;
        this.systemTimer = null;

        this.startMonitoring();
    }

    /**
     * Record module load operation
     * @param {string} modulePath - Module path
     * @param {number} duration - Load duration in ms
     * @param {boolean} success - Whether load was successful
     * @param {Object} details - Additional details
     */
    recordLoad(modulePath, duration, success = true, details = {}) {
        const loadMetrics = this.metrics.load;

        loadMetrics.total++;
        loadMetrics.totalTime += duration;

        if (success) {
            loadMetrics.success++;
        } else {
            loadMetrics.failed++;
        }

        // Update time statistics
        loadMetrics.averageTime = loadMetrics.totalTime / loadMetrics.total;
        loadMetrics.minTime = Math.min(loadMetrics.minTime, duration);
        loadMetrics.maxTime = Math.max(loadMetrics.maxTime, duration);

        // Add to history
        this.addToHistory(loadMetrics.history, {
            modulePath,
            duration,
            success,
            timestamp: Date.now(),
            ...details
        });

        // Check thresholds
        this.checkThreshold('loadTime', duration, { modulePath, success });

        // Profile if enabled
        if (this.config.enableProfiling && Math.random() < this.config.profileSampleRate) {
            this.profileOperation('load', { modulePath, duration, success });
        }
    }

    /**
     * Record cache operation
     * @param {string} operation - Cache operation (hit, miss, eviction)
     * @param {string} key - Cache key
     * @param {Object} details - Additional details
     */
    recordCache(operation, key, details = {}) {
        const cacheMetrics = this.metrics.cache;

        switch (operation) {
            case 'hit':
                cacheMetrics.hits++;
                break;
            case 'miss':
                cacheMetrics.misses++;
                break;
            case 'eviction':
                cacheMetrics.evictions++;
                break;
        }

        // Update hit rate
        const total = cacheMetrics.hits + cacheMetrics.misses;
        cacheMetrics.hitRate = total > 0 ? cacheMetrics.hits / total : 0;

        // Add to history
        this.addToHistory(cacheMetrics.history, {
            operation,
            key,
            timestamp: Date.now(),
            ...details
        });

        // Check cache hit rate
        if (total > 10) {
            // Only check after some operations
            this.checkThreshold('cacheHitRate', cacheMetrics.hitRate, { operation, key });
        }
    }

    /**
     * Update cache statistics
     * @param {number} size - Current cache size
     * @param {number} memoryUsage - Memory usage in bytes
     */
    updateCacheStats(size, memoryUsage) {
        this.metrics.cache.size = size;
        this.metrics.cache.memoryUsage = memoryUsage;

        this.checkThreshold('memoryUsage', memoryUsage, { component: 'cache' });
    }

    /**
     * Record error
     * @param {string} code - Error code
     * @param {string} message - Error message
     * @param {Object} details - Additional details
     */
    recordError(code, message, details = {}) {
        const errorMetrics = this.metrics.errors;

        errorMetrics.total++;
        const count = errorMetrics.byCode.get(code) || 0;
        errorMetrics.byCode.set(code, count + 1);

        // Add to history
        this.addToHistory(errorMetrics.history, {
            code,
            message,
            timestamp: Date.now(),
            ...details
        });

        // Calculate error rate
        const totalOps = this.metrics.load.total;
        const errorRate = totalOps > 0 ? errorMetrics.total / totalOps : 0;
        this.checkThreshold('errorRate', errorRate, { code, message });
    }

    /**
     * Update system metrics
     */
    updateSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        this.metrics.memory = {
            usage: memUsage.rss,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            history: this.metrics.memory.history
        };

        this.metrics.system = {
            cpuUsage: cpuUsage.user + cpuUsage.system,
            uptime: process.uptime(),
            loadAverage: process.loadavg ? process.loadavg()[0] : 0,
            history: this.metrics.system.history
        };

        // Add to history
        this.addToHistory(this.metrics.memory.history, {
            ...this.metrics.memory,
            timestamp: Date.now()
        });

        this.addToHistory(this.metrics.system.history, {
            ...this.metrics.system,
            timestamp: Date.now()
        });

        // Check memory usage
        this.checkThreshold('memoryUsage', this.metrics.memory.usage, { component: 'system' });
    }

    /**
     * Start performance profiling for an operation
     * @param {string} operation - Operation name
     * @param {Object} context - Operation context
     * @returns {string} Profile ID
     */
    startProfile(operation, context = {}) {
        if (!this.config.enableProfiling) {
            return null;
        }

        const profileId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const profile = {
            id: profileId,
            operation,
            context,
            startTime: performance.now(),
            endTime: null,
            duration: null,
            memory: {
                start: process.memoryUsage(),
                end: null,
                delta: null
            },
            steps: [],
            active: true
        };

        this.activeProfiles.set(profileId, profile);
        return profileId;
    }

    /**
     * End performance profiling
     * @param {string} profileId - Profile ID
     * @param {Object} result - Operation result
     * @returns {Object} Profile data
     */
    endProfile(profileId, result = {}) {
        if (!this.config.enableProfiling || !this.activeProfiles.has(profileId)) {
            return null;
        }

        const profile = this.activeProfiles.get(profileId);
        profile.endTime = performance.now();
        profile.duration = profile.endTime - profile.startTime;
        profile.memory.end = process.memoryUsage();
        profile.memory.delta = {
            rss: profile.memory.end.rss - profile.memory.start.rss,
            heapUsed: profile.memory.end.heapUsed - profile.memory.start.heapUsed,
            heapTotal: profile.memory.end.heapTotal - profile.memory.start.heapTotal
        };
        profile.active = false;
        profile.result = result;

        // Move to completed profiles
        this.profiles.set(profileId, profile);
        this.activeProfiles.delete(profileId);

        // Analyze profile
        this.analyzeProfile(profile);

        return profile;
    }

    /**
     * Add step to active profile
     * @param {string} profileId - Profile ID
     * @param {string} stepName - Step name
     * @param {Object} details - Step details
     */
    addProfileStep(profileId, stepName, details = {}) {
        if (!this.config.enableProfiling || !this.activeProfiles.has(profileId)) {
            return;
        }

        const profile = this.activeProfiles.get(profileId);
        profile.steps.push({
            name: stepName,
            timestamp: performance.now() - profile.startTime,
            ...details
        });
    }

    /**
     * Get current metrics
     * @returns {Object} Current metrics
     */
    getMetrics() {
        return {
            load: { ...this.metrics.load },
            cache: { ...this.metrics.cache },
            memory: { ...this.metrics.memory },
            errors: {
                total: this.metrics.errors.total,
                byCode: Object.fromEntries(this.metrics.errors.byCode)
            },
            system: { ...this.metrics.system },
            alerts: this.alerts.slice(-10), // Last 10 alerts
            uptime: process.uptime()
        };
    }

    /**
     * Get performance report
     * @returns {Object} Performance report
     */
    getReport() {
        const metrics = this.getMetrics();
        const report = {
            summary: {
                totalOperations: metrics.load.total,
                successRate: metrics.load.total > 0 ? metrics.load.success / metrics.load.total : 0,
                averageLoadTime: metrics.load.averageTime,
                cacheHitRate: metrics.cache.hitRate,
                errorRate: metrics.load.total > 0 ? metrics.errors.total / metrics.load.total : 0,
                memoryUsage: metrics.memory.usage,
                uptime: metrics.system.uptime
            },
            health: this.calculateHealthScore(metrics),
            recommendations: this.generateRecommendations(metrics),
            bottlenecks: this.identifyBottlenecks(metrics),
            alerts: this.alerts,
            timestamp: Date.now()
        };

        return report;
    }

    /**
     * Get profile data
     * @param {string} profileId - Profile ID (optional)
     * @returns {Object} Profile data
     */
    getProfiles(profileId) {
        if (profileId) {
            return this.profiles.get(profileId);
        }

        return Array.from(this.profiles.values()).slice(-100); // Last 100 profiles
    }

    /**
     * Clear metrics and profiles
     */
    clear() {
        // Clear metrics
        Object.keys(this.metrics).forEach(key => {
            if (this.metrics[key].history) {
                this.metrics[key].history = [];
            }
            if (this.metrics[key].byCode) {
                this.metrics[key].byCode.clear();
            }

            // Reset numeric values
            if (key === 'load') {
                this.metrics[key].total = 0;
                this.metrics[key].success = 0;
                this.metrics[key].failed = 0;
                this.metrics[key].totalTime = 0;
                this.metrics[key].averageTime = 0;
                this.metrics[key].minTime = Infinity;
                this.metrics[key].maxTime = 0;
            } else if (key === 'cache') {
                this.metrics[key].hits = 0;
                this.metrics[key].misses = 0;
                this.metrics[key].evictions = 0;
                this.metrics[key].size = 0;
                this.metrics[key].memoryUsage = 0;
                this.metrics[key].hitRate = 0;
            } else if (key === 'errors') {
                this.metrics[key].total = 0;
            }
        });

        // Clear profiles
        this.profiles.clear();
        this.activeProfiles.clear();
        this.alerts = [];
        this.alertThrottle.clear();
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (this.metricsTimer) {
            clearInterval(this.metricsTimer);
            this.metricsTimer = null;
        }

        if (this.systemTimer) {
            clearInterval(this.systemTimer);
            this.systemTimer = null;
        }
    }

    // Private methods

    /**
     * Start monitoring timers
     */
    startMonitoring() {
        if (this.config.enableMetrics) {
            this.metricsTimer = setInterval(() => {
                this.cleanupOldHistory();
            }, this.config.metricsInterval);
        }

        if (this.config.enableSystemMonitoring) {
            this.systemTimer = setInterval(() => {
                this.updateSystemMetrics();
            }, 5000); // Update system metrics every 5 seconds
        }
    }

    /**
     * Add item to history with size limit
     * @param {Array} history - History array
     * @param {Object} item - Item to add
     */
    addToHistory(history, item) {
        history.push(item);

        // Keep only recent history
        if (history.length > this.config.maxMetricsHistory) {
            history.shift();
        }
    }

    /**
     * Check threshold and create alert if needed
     * @param {string} metric - Metric name
     * @param {number} value - Current value
     * @param {Object} context - Alert context
     */
    checkThreshold(metric, value, context = {}) {
        if (!this.config.enableAlerts) return;

        const now = Date.now();
        const lastAlert = this.alertThrottle.get(metric);

        // Check throttle
        if (lastAlert && now - lastAlert < this.config.alertCooldown) {
            return;
        }

        let severity = null;
        let threshold = null;

        if (this.config.criticalThresholds[metric] && value >= this.config.criticalThresholds[metric]) {
            severity = 'critical';
            threshold = this.config.criticalThresholds[metric];
        } else if (this.config.warningThresholds[metric] && value >= this.config.warningThresholds[metric]) {
            severity = 'warning';
            threshold = this.config.warningThresholds[metric];
        }

        if (severity) {
            const alert = {
                id: `${metric}_${now}_${Math.random().toString(36).substr(2, 9)}`,
                metric,
                severity,
                value,
                threshold,
                context,
                timestamp: now,
                acknowledged: false
            };

            this.alerts.push(alert);
            this.alertThrottle.set(metric, now);

            // Keep only recent alerts
            if (this.alerts.length > this.config.maxAlerts) {
                this.alerts.shift();
            }

            // Log alert
            console.log(
                `[PERFORMANCE ALERT] ${severity.toUpperCase()}: ${metric} = ${value} (threshold: ${threshold})`
            );
        }
    }

    /**
     * Profile an operation
     * @param {string} operation - Operation name
     * @param {Object} data - Operation data
     */
    profileOperation(operation, data) {
        const profile = {
            operation,
            data,
            timestamp: Date.now(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        };

        // Store profile for analysis
        const profileKey = `${operation}_${Math.floor(Date.now() / 60000)}`; // Group by minute
        if (!this.profiles.has(profileKey)) {
            this.profiles.set(profileKey, []);
        }

        this.profiles.get(profileKey).push(profile);
    }

    /**
     * Analyze profile for performance insights
     * @param {Object} profile - Profile to analyze
     */
    analyzeProfile(profile) {
        // Analyze profile for patterns and bottlenecks
        if (profile.duration > this.config.warningThresholds.loadTime) {
            this.checkThreshold('loadTime', profile.duration, {
                operation: profile.operation,
                profileId: profile.id
            });
        }

        // Analyze memory usage
        if (profile.memory.delta.heapUsed > 10 * 1024 * 1024) {
            // 10MB memory increase
            this.checkThreshold('memoryUsage', profile.memory.delta.heapUsed, {
                operation: profile.operation,
                profileId: profile.id,
                type: 'memory_delta'
            });
        }

        // Analyze steps
        if (profile.steps.length > 0) {
            const slowSteps = profile.steps.filter(step => step.duration > 50); // Steps over 50ms
            if (slowSteps.length > 0) {
                console.log(`[PROFILE] Slow steps detected in ${profile.operation}:`, slowSteps);
            }
        }
    }

    /**
     * Calculate health score
     * @param {Object} metrics - Current metrics
     * @returns {number} Health score (0-100)
     */
    calculateHealthScore(metrics) {
        let score = 100;

        // Deduct for poor success rate
        const successRate = metrics.load.total > 0 ? metrics.load.success / metrics.load.total : 1;
        score -= (1 - successRate) * 30;

        // Deduct for slow load times
        if (metrics.load.averageTime > this.config.warningThresholds.loadTime) {
            score -= 20;
        }

        // Deduct for poor cache hit rate
        if (metrics.cache.hitRate < this.config.warningThresholds.cacheHitRate) {
            score -= 15;
        }

        // Deduct for high error rate
        const errorRate = metrics.load.total > 0 ? metrics.errors.total / metrics.load.total : 0;
        if (errorRate > this.config.warningThresholds.errorRate) {
            score -= 25;
        }

        // Deduct for high memory usage
        const memUsagePercent = metrics.memory.usage / this.config.warningThresholds.memoryUsage;
        if (memUsagePercent > 1) {
            score -= 20;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Generate performance recommendations
     * @param {Object} metrics - Current metrics
     * @returns {Array} Recommendations
     */
    generateRecommendations(metrics) {
        const recommendations = [];

        if (metrics.load.averageTime > this.config.warningThresholds.loadTime) {
            recommendations.push({
                priority: 'high',
                category: 'performance',
                message: 'Average load time is high. Consider optimizing module loading or implementing better caching.'
            });
        }

        if (metrics.cache.hitRate < this.config.warningThresholds.cacheHitRate) {
            recommendations.push({
                priority: 'medium',
                category: 'caching',
                message: 'Cache hit rate is low. Consider increasing cache size or optimizing cache strategy.'
            });
        }

        if (metrics.memory.usage > this.config.warningThresholds.memoryUsage * 0.8) {
            recommendations.push({
                priority: 'medium',
                category: 'memory',
                message: 'Memory usage is high. Consider implementing memory optimization or cache cleanup.'
            });
        }

        const errorRate = metrics.load.total > 0 ? metrics.errors.total / metrics.load.total : 0;
        if (errorRate > this.config.warningThresholds.errorRate) {
            recommendations.push({
                priority: 'high',
                category: 'reliability',
                message: 'Error rate is high. Review error logs and improve error handling.'
            });
        }

        return recommendations;
    }

    /**
     * Identify performance bottlenecks
     * @param {Object} metrics - Current metrics
     * @returns {Array} Bottlenecks
     */
    identifyBottlenecks(metrics) {
        const bottlenecks = [];

        // Find slowest modules
        const slowModules = metrics.load.history
            .filter(item => item.duration > this.config.warningThresholds.loadTime)
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5);

        if (slowModules.length > 0) {
            bottlenecks.push({
                type: 'slow_modules',
                items: slowModules,
                impact: 'high'
            });
        }

        // Find memory-intensive modules
        const memoryIntensive = metrics.load.history
            .filter(item => item.memoryDelta && item.memoryDelta > 5 * 1024 * 1024)
            .sort((a, b) => b.memoryDelta - a.memoryDelta)
            .slice(0, 5);

        if (memoryIntensive.length > 0) {
            bottlenecks.push({
                type: 'memory_intensive',
                items: memoryIntensive,
                impact: 'medium'
            });
        }

        return bottlenecks;
    }

    /**
     * Clean up old history data
     */
    cleanupOldHistory() {
        const now = Date.now();
        const maxAge = this.config.maxMetricsHistory * this.config.metricsInterval;

        Object.keys(this.metrics).forEach(key => {
            if (this.metrics[key].history) {
                this.metrics[key].history = this.metrics[key].history.filter(item => now - item.timestamp < maxAge);
            }
        });
    }
}

module.exports = PerformanceMonitor;
