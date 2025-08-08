/**
 * Performance monitoring utilities for pofresh-admin
 * Copyright(c) 2024
 * MIT Licensed
 */

const EventEmitter = require('events');
const logger = require('pofresh-logger').getLogger('pofresh-admin', 'PerformanceMonitor');

class PerformanceMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            memoryThreshold: options.memoryThreshold || 100 * 1024 * 1024, // 100MB
            cpuThreshold: options.cpuThreshold || 80, // 80%
            responseTimeThreshold: options.responseTimeThreshold || 5000, // 5秒
            monitorInterval: options.monitorInterval || 30_000, // 30秒
            enabled: options.enabled !== false
        };

        this.metrics = {
            requests: new Map(),
            memory: [],
            cpu: [],
            responseTime: []
        };

        this.timers = new Set();
        this.startTime = Date.now();

        if (this.options.enabled) {
            this.startMonitoring();
        }
    }

    /**
     * 开始性能监控
     */
    startMonitoring() {
        // 内存监控
        const memoryTimer = setInterval(() => {
            this.checkMemoryUsage();
        }, this.options.monitorInterval);
        this.timers.add(memoryTimer);

        // CPU监控
        const cpuTimer = setInterval(() => {
            this.checkCpuUsage();
        }, this.options.monitorInterval);
        this.timers.add(cpuTimer);

        logger.info('Performance monitoring started');
    }

    /**
     * 停止性能监控
     */
    stopMonitoring() {
        for (const timer of this.timers) {
            clearInterval(timer);
        }
        this.timers.clear();
        logger.info('Performance monitoring stopped');
    }

    /**
     * 检查内存使用情况
     */
    checkMemoryUsage() {
        const memUsage = process.memoryUsage();
        const timestamp = Date.now();

        const memoryInfo = {
            timestamp,
            rss: memUsage.rss,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external
        };

        this.metrics.memory.push(memoryInfo);

        // 保持最近100个记录
        if (this.metrics.memory.length > 100) {
            this.metrics.memory.shift();
        }

        // 检查内存阈值
        if (memUsage.heapUsed > this.options.memoryThreshold) {
            this.emit('memoryWarning', {
                current: memUsage.heapUsed,
                threshold: this.options.memoryThreshold,
                timestamp
            });

            logger.warn(`Memory usage high: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        }
    }

    /**
     * 检查CPU使用情况
     */
    checkCpuUsage() {
        const startUsage = process.cpuUsage();
        const startTime = process.hrtime();

        setTimeout(() => {
            const endUsage = process.cpuUsage(startUsage);
            const endTime = process.hrtime(startTime);

            const totalTime = endTime[0] * 1_000_000 + endTime[1] / 1000; // 微秒
            const cpuPercent = ((endUsage.user + endUsage.system) / totalTime) * 100;

            const timestamp = Date.now();
            const cpuInfo = {
                timestamp,
                percent: cpuPercent,
                user: endUsage.user,
                system: endUsage.system
            };

            this.metrics.cpu.push(cpuInfo);

            // 保持最近100个记录
            if (this.metrics.cpu.length > 100) {
                this.metrics.cpu.shift();
            }

            // 检查CPU阈值
            if (cpuPercent > this.options.cpuThreshold) {
                this.emit('cpuWarning', {
                    current: cpuPercent,
                    threshold: this.options.cpuThreshold,
                    timestamp
                });

                logger.warn(`CPU usage high: ${cpuPercent.toFixed(2)}%`);
            }
        }, 100);
    }

    /**
     * 开始请求计时
     * @param {string} requestId 请求ID
     * @param {Object} metadata 请求元数据
     */
    startRequest(requestId, metadata = {}) {
        this.metrics.requests.set(requestId, {
            startTime: Date.now(),
            metadata
        });
    }

    /**
     * 结束请求计时
     * @param {string} requestId 请求ID
     * @param {Object} result 请求结果
     */
    endRequest(requestId, result = {}) {
        const requestInfo = this.metrics.requests.get(requestId);
        if (!requestInfo) {
            return;
        }

        const endTime = Date.now();
        const responseTime = endTime - requestInfo.startTime;

        const responseInfo = {
            requestId,
            responseTime,
            startTime: requestInfo.startTime,
            endTime,
            metadata: requestInfo.metadata,
            result
        };

        this.metrics.responseTime.push(responseInfo);

        // 保持最近1000个记录
        if (this.metrics.responseTime.length > 1000) {
            this.metrics.responseTime.shift();
        }

        // 清理请求记录
        this.metrics.requests.delete(requestId);

        // 检查响应时间阈值
        if (responseTime > this.options.responseTimeThreshold) {
            this.emit('slowResponse', {
                requestId,
                responseTime,
                threshold: this.options.responseTimeThreshold,
                metadata: requestInfo.metadata
            });

            logger.warn(`Slow response detected: ${responseTime}ms for request ${requestId}`);
        }

        return responseInfo;
    }

    /**
     * 获取性能统计信息
     * @returns {Object} 性能统计
     */
    getStats() {
        const now = Date.now();
        const uptime = now - this.startTime;

        // 内存统计
        const memoryStats = this.calculateMemoryStats();

        // CPU统计
        const cpuStats = this.calculateCpuStats();

        // 响应时间统计
        const responseTimeStats = this.calculateResponseTimeStats();

        return {
            uptime,
            timestamp: now,
            memory: memoryStats,
            cpu: cpuStats,
            responseTime: responseTimeStats,
            activeRequests: this.metrics.requests.size
        };
    }

    /**
     * 计算内存统计
     */
    calculateMemoryStats() {
        if (this.metrics.memory.length === 0) {
            return null;
        }

        const recent = this.metrics.memory.slice(-10); // 最近10个记录
        const heapUsed = recent.map(m => m.heapUsed);

        return {
            current: recent[recent.length - 1].heapUsed,
            average: heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length,
            max: Math.max(...heapUsed),
            min: Math.min(...heapUsed)
        };
    }

    /**
     * 计算CPU统计
     */
    calculateCpuStats() {
        if (this.metrics.cpu.length === 0) {
            return null;
        }

        const recent = this.metrics.cpu.slice(-10); // 最近10个记录
        const percentages = recent.map(c => c.percent);

        return {
            current: recent[recent.length - 1].percent,
            average: percentages.reduce((a, b) => a + b, 0) / percentages.length,
            max: Math.max(...percentages),
            min: Math.min(...percentages)
        };
    }

    /**
     * 计算响应时间统计
     */
    calculateResponseTimeStats() {
        if (this.metrics.responseTime.length === 0) {
            return null;
        }

        const recent = this.metrics.responseTime.slice(-100); // 最近100个记录
        const times = recent.map(r => r.responseTime);

        times.sort((a, b) => a - b);

        return {
            count: recent.length,
            average: times.reduce((a, b) => a + b, 0) / times.length,
            median: times[Math.floor(times.length / 2)],
            p95: times[Math.floor(times.length * 0.95)],
            p99: times[Math.floor(times.length * 0.99)],
            max: Math.max(...times),
            min: Math.min(...times)
        };
    }

    /**
     * 清理过期的请求记录
     */
    cleanupExpiredRequests() {
        const now = Date.now();
        const timeout = 5 * 60 * 1000; // 5分钟超时

        for (const [requestId, requestInfo] of this.metrics.requests) {
            if (now - requestInfo.startTime > timeout) {
                this.metrics.requests.delete(requestId);
                logger.warn(`Cleaned up expired request: ${requestId}`);
            }
        }
    }

    /**
     * 销毁监控器
     */
    destroy() {
        this.stopMonitoring();
        this.metrics.requests.clear();
        this.metrics.memory.length = 0;
        this.metrics.cpu.length = 0;
        this.metrics.responseTime.length = 0;
        this.removeAllListeners();
    }
}

module.exports = PerformanceMonitor;
