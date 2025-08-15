/**
 * 批量日志管理器 - 提供高效的日志批处理功能
 */
class BatchLoggerManager {
    /**
     * 构造函数
     * @param {Object} config - 配置对象
     */
    constructor(config) {
        if (!config) {
            throw new Error('BatchLoggerManager configuration is required');
        }

        this.config = {
            enabled: true,
            sizeThreshold: 100,
            timeThreshold: 500, // ms
            batches: new Map(),
            ...config
        };

        this.timers = new Map();
        this.failedBatches = new Map();
    }

    /**
     * 添加日志条目到批量处理队列
     * @param {Object} logger - Winston日志实例
     * @param {string} level - 日志级别
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     */
    addLogEntry(logger, level, message, meta = {}) {
        try {
            if (!this.config.enabled) {
                this.logDirectly(logger, level, message, meta);
                return;
            }

            const loggerKey = this.getLoggerKey(logger);
            const batch = this.getBatch(loggerKey);

            batch.push({ level, message, meta });

            // 检查是否需要立即刷新批次
            if (batch.length >= this.config.sizeThreshold) {
                this.flushBatch(loggerKey, logger);
                return;
            }

            // 设置定时器（如果尚未设置）
            this.setupTimer(loggerKey, logger);
        } catch (error) {
            this.handleBatchError(error, logger);
        }
    }

    /**
     * 获取日志器的唯一标识
     * @param {Object} logger - Winston日志实例
     * @returns {string} 日志器标识
     */
    getLoggerKey(logger) {
        return logger._batchKey || 'default';
    }

    /**
     * 获取或创建批量队列
     * @param {string} loggerKey - 日志器标识
     * @returns {Array} 批量队列
     */
    getBatch(loggerKey) {
        if (!this.config.batches.has(loggerKey)) {
            this.config.batches.set(loggerKey, []);
        }
        return this.config.batches.get(loggerKey);
    }

    /**
     * 设置定时器
     * @param {string} loggerKey - 日志器标识
     * @param {Object} logger - Winston日志实例
     */
    setupTimer(loggerKey, logger) {
        if (!this.timers.has(loggerKey)) {
            const timer = setTimeout(() => {
                this.flushBatch(loggerKey, logger);
            }, this.config.timeThreshold);

            this.timers.set(loggerKey, timer);
        }
    }

    /**
     * 刷新指定批次的日志
     * @param {string} loggerKey - 日志器标识
     * @param {Object} logger - Winston日志实例
     */
    flushBatch(loggerKey, logger) {
        try {
            if (!this.config.batches.has(loggerKey)) {
                return;
            }

            const batch = this.config.batches.get(loggerKey);
            if (batch.length === 0) {
                this.clearBatchResources(loggerKey);
                return;
            }

            // 清理定时器
            this.clearTimer(loggerKey);

            // 处理批次中的所有日志条目
            this.processBatchEntries(batch, logger);

            // 清空批次
            this.config.batches.delete(loggerKey);
        } catch (error) {
            this.handleFlushError(error, loggerKey);
        }
    }

    /**
     * 处理批次中的日志条目
     * @param {Array} batch - 批次数组
     * @param {Object} logger - Winston日志实例
     */
    processBatchEntries(batch, logger) {
        for (const entry of batch) {
            try {
                logger[entry.level](entry.message, entry.meta);
            } catch (entryError) {
                this.handleEntryError(entry, entryError, logger);
            }
        }
    }

    /**
     * 处理单个日志条目的错误
     * @param {Object} entry - 日志条目
     * @param {Error} entryError - 错误对象
     * @param {Object} logger - Winston日志实例
     */
    handleEntryError(entry, entryError, logger) {
        try {
            logger.error(`[ENTRY ERROR] ${entry.message}`, {
                originalError: entryError.message,
                stack: entryError.stack,
                meta: entry.meta
            });
        } catch (errorLoggingError) {
            // 静默忽略日志错误，防止无限循环
            console.error(`Failed to log entry error: ${errorLoggingError.message}`);
        }
    }

    /**
     * 处理批处理过程中的错误
     * @param {Error} error - 错误对象
     * @param {Object} logger - Winston日志实例
     */
    handleBatchError(error, logger) {
        const loggerKey = logger?._batchKey || 'default';

        try {
            // 尝试直接记录日志而不进行批处理
            logger?.error(`[BATCH ERROR] ${error.message}`, {
                stack: error.stack,
                loggerKey
            });
        } catch (fallbackError) {
            // 静默回退错误
            console.error(`Batch logging fallback failed: ${fallbackError.message}`);
        }
    }

    /**
     * 处理刷新过程中的错误
     * @param {Error} error - 错误对象
     * @param {string} loggerKey - 日志器标识
     */
    handleFlushError(error, loggerKey) {
        try {
            const currentBatch = this.config.batches.get(loggerKey);
            if (currentBatch && currentBatch.length > 0) {
                this.saveFailedBatch(loggerKey, currentBatch);
            }
        } catch (saveError) {
            console.error(`Failed to save failed batch: ${saveError.message}`);
        }
    }

    /**
     * 保存失败的批次以便稍后处理
     * @param {string} loggerKey - 日志器标识
     * @param {Array} batch - 失败批次
     */
    saveFailedBatch(loggerKey, batch) {
        if (!this.failedBatches) {
            this.failedBatches = new Map();
        }

        if (!this.failedBatches.has(loggerKey)) {
            this.failedBatches.set(loggerKey, []);
        }

        this.failedBatches.get(loggerKey).push(...batch);
    }

    /**
     * 清理批次相关资源
     * @param {string} loggerKey - 日志器标识
     */
    clearBatchResources(loggerKey) {
        this.config.batches.delete(loggerKey);
        this.clearTimer(loggerKey);
    }

    /**
     * 清理定时器
     * @param {string} loggerKey - 日志器标识
     */
    clearTimer(loggerKey) {
        if (this.timers.has(loggerKey)) {
            clearTimeout(this.timers.get(loggerKey));
            this.timers.delete(loggerKey);
        }
    }

    /**
     * 直接记录日志（不使用批处理）
     * @param {Object} logger - Winston日志实例
     * @param {string} level - 日志级别
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     */
    logDirectly(logger, level, message, meta) {
        try {
            logger[level](message, meta);
        } catch (error) {
            console.error(`Direct logging failed: ${error.message}`);
        }
    }

    /**
     * 刷新所有批次
     * @param {Map} loggers - 日志器映射
     */
    flushAllBatches(loggers) {
        for (const [loggerKey, _] of this.config.batches.entries()) {
            const logger = loggers.get(loggerKey) || loggers.get('default');
            if (logger) {
                this.flushBatch(loggerKey, logger);
            }
        }
    }

    /**
     * 获取失败批次的数量
     * @returns {number} 失败批次的数量
     */
    getFailedBatchCount() {
        return this.failedBatches ? this.failedBatches.size : 0;
    }

    /**
     * 重置所有状态
     */
    reset() {
        this.config.batches.clear();
        this.timers.clear();
        this.failedBatches = new Map();
    }
}

module.exports = BatchLoggerManager;
