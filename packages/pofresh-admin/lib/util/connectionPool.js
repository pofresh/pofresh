/**
 * Connection pool management for pofresh-admin
 * Copyright(c) 2024
 * MIT Licensed
 */

const EventEmitter = require('events');
const ErrorHandler = require('./errorHandler');
const logger = require('pofresh-logger').getLogger('pofresh-admin', 'ConnectionPool');

class ConnectionPool extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            maxConnections: options.maxConnections || 10,
            minConnections: options.minConnections || 2,
            acquireTimeout: options.acquireTimeout || 30000,
            idleTimeout: options.idleTimeout || 300000, // 5分钟
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 1000,
            validateConnection: options.validateConnection || (() => true),
            createConnection: options.createConnection ||
                (() => { throw new Error('createConnection must be provided'); }),
            destroyConnection: options.destroyConnection || ((conn) => {
                if (conn && typeof conn.close === 'function') {
                    conn.close();
                } else if (conn && typeof conn.destroy === 'function') {
                    conn.destroy();
                }
            })
        };

        this.connections = new Set();
        this.availableConnections = [];
        this.pendingRequests = [];
        this.activeConnections = new Map();
        this.connectionStats = {
            created: 0,
            destroyed: 0,
            acquired: 0,
            released: 0,
            errors: 0
        };

        this.timers = new Set();
        this.destroyed = false;

        this.startMaintenanceTimer();
    }

    /**
     * 获取连接
     * @param {Function} callback 回调函数
     */
    acquire(callback) {
        if (this.destroyed) {
            return ErrorHandler.safeCallback(callback, new Error('Connection pool has been destroyed'));
        }

        const timeoutWrapper = ErrorHandler.createTimeoutCallback(
            callback,
            this.options.acquireTimeout,
            'Connection acquisition'
        );

        // 检查是否有可用连接
        if (this.availableConnections.length > 0) {
            const connection = this.availableConnections.pop();

            // 验证连接
            if (this.options.validateConnection(connection)) {
                this.activeConnections.set(connection, Date.now());
                this.connectionStats.acquired++;
                return timeoutWrapper.callback(null, connection);
            } else {
                // 连接无效，销毁并重试
                this.destroyConnection(connection);
                return this.acquire(timeoutWrapper.callback);
            }
        }

        // 检查是否可以创建新连接
        if (this.connections.size < this.options.maxConnections) {
            this.createNewConnection((err, connection) => {
                if (err) {
                    return timeoutWrapper.callback(err);
                }

                this.activeConnections.set(connection, Date.now());
                this.connectionStats.acquired++;
                timeoutWrapper.callback(null, connection);
            });
        } else {
            // 加入等待队列
            this.pendingRequests.push({
                callback: timeoutWrapper.callback,
                timestamp: Date.now()
            });
        }
    }

    /**
     * 释放连接
     * @param {Object} connection 连接对象
     */
    release(connection) {
        if (this.destroyed) {
            return this.destroyConnection(connection);
        }

        if (!this.activeConnections.has(connection)) {
            logger.warn('Attempting to release unknown connection');
            return;
        }

        this.activeConnections.delete(connection);
        this.connectionStats.released++;

        // 检查连接是否仍然有效
        if (!this.options.validateConnection(connection)) {
            this.destroyConnection(connection);
            return;
        }

        // 检查是否有等待的请求
        if (this.pendingRequests.length > 0) {
            const request = this.pendingRequests.shift();
            this.activeConnections.set(connection, Date.now());
            this.connectionStats.acquired++;
            ErrorHandler.safeCallback(request.callback, null, connection);
        } else {
            // 将连接返回到可用池
            this.availableConnections.push(connection);
        }
    }

    /**
     * 创建新连接
     * @param {Function} callback 回调函数
     */
    createNewConnection(callback) {
        const retries = 0;

        const attemptCreate = () => {
            try {
                const result = this.options.createConnection();

                if (result && typeof result.then === 'function') {
                    // Promise
                    result
                        .then(connection => {
                            this.onConnectionCreated(connection, callback);
                        })
                        .catch(err => {
                            this.handleCreateError(err, retries, attemptCreate, callback);
                        });
                } else {
                    // 同步结果
                    this.onConnectionCreated(result, callback);
                }
            } catch (err) {
                this.handleCreateError(err, retries, attemptCreate, callback);
            }
        };

        attemptCreate();
    }

    /**
     * 处理连接创建成功
     * @param {Object} connection 连接对象
     * @param {Function} callback 回调函数
     */
    onConnectionCreated(connection, callback) {
        if (!connection) {
            return ErrorHandler.safeCallback(callback, new Error('Connection creation returned null'));
        }

        this.connections.add(connection);
        this.connectionStats.created++;

        // 设置连接错误处理
        if (connection && typeof connection.on === 'function') {
            connection.on('error', (err) => {
                logger.error('Connection error:', err);
                this.connectionStats.errors++;
                this.destroyConnection(connection);
            });
        }

        this.emit('connectionCreated', connection);
        ErrorHandler.safeCallback(callback, null, connection);
    }

    /**
     * 处理连接创建错误
     * @param {Error} err 错误对象
     * @param {number} retries 重试次数
     * @param {Function} attemptCreate 重试函数
     * @param {Function} callback 回调函数
     */
    handleCreateError(err, retries, attemptCreate, callback) {
        this.connectionStats.errors++;
        logger.error('Failed to create connection:', err);

        if (retries < this.options.maxRetries) {
            retries++;
            setTimeout(attemptCreate, this.options.retryDelay * retries);
        } else {
            const errorMessage = `Failed to create connection after ${this.options.maxRetries} retries: ${err.message}`;
            ErrorHandler.safeCallback(callback, new Error(errorMessage));
        }
    }

    /**
     * 销毁连接
     * @param {Object} connection 连接对象
     */
    destroyConnection(connection) {
        if (!connection) {
            return;
        }

        this.connections.delete(connection);
        this.activeConnections.delete(connection);

        // 从可用连接中移除
        const index = this.availableConnections.indexOf(connection);
        if (index !== -1) {
            this.availableConnections.splice(index, 1);
        }

        try {
            this.options.destroyConnection(connection);
            this.connectionStats.destroyed++;
            this.emit('connectionDestroyed', connection);
        } catch (err) {
            logger.error('Error destroying connection:', err);
        }
    }

    /**
     * 开始维护定时器
     */
    startMaintenanceTimer() {
        const maintenanceTimer = setInterval(() => {
            this.performMaintenance();
        }, 60000); // 每分钟执行一次

        this.timers.add(maintenanceTimer);
    }

    /**
     * 执行连接池维护
     */
    performMaintenance() {
        if (this.destroyed) {
            return;
        }

        const now = Date.now();

        // 清理空闲连接
        this.cleanupIdleConnections();

        // 清理超时的等待请求
        this.cleanupPendingRequests(now);

        // 确保最小连接数
        this.ensureMinConnections();

        // 记录统计信息
        this.logStats();
    }

    /**
     * 清理空闲连接
     */
    cleanupIdleConnections() {
        const idleConnections = [];

        for (let i = this.availableConnections.length - 1; i >= 0; i--) {
            const connection = this.availableConnections[i];
            // 这里简化处理，实际应该记录连接的最后使用时间
            if (this.availableConnections.length > this.options.minConnections) {
                idleConnections.push(connection);
                this.availableConnections.splice(i, 1);
            }
        }

        idleConnections.forEach(conn => this.destroyConnection(conn));
    }

    /**
     * 清理超时的等待请求
     * @param {number} now 当前时间
     */
    cleanupPendingRequests(now) {
        for (let i = this.pendingRequests.length - 1; i >= 0; i--) {
            const request = this.pendingRequests[i];
            if (now - request.timestamp > this.options.acquireTimeout) {
                this.pendingRequests.splice(i, 1);
                ErrorHandler.safeCallback(request.callback, new Error('Connection acquisition timeout'));
            }
        }
    }

    /**
     * 确保最小连接数
     */
    ensureMinConnections() {
        const totalConnections = this.connections.size;
        const needed = this.options.minConnections - totalConnections;

        for (let i = 0; i < needed; i++) {
            this.createNewConnection((err, connection) => {
                if (!err && connection) {
                    this.availableConnections.push(connection);
                }
            });
        }
    }

    /**
     * 记录统计信息
     */
    logStats() {
        const stats = this.getStats();
        logger.debug('Connection pool stats:', stats);
    }

    /**
     * 获取连接池统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            totalConnections: this.connections.size,
            availableConnections: this.availableConnections.length,
            activeConnections: this.activeConnections.size,
            pendingRequests: this.pendingRequests.length,
            stats: { ...this.connectionStats }
        };
    }

    /**
     * 销毁连接池
     * @param {Function} callback 回调函数
     */
    destroy(callback) {
        if (this.destroyed) {
            return ErrorHandler.safeCallback(callback);
        }

        this.destroyed = true;

        // 清理定时器
        for (const timer of this.timers) {
            clearInterval(timer);
        }
        this.timers.clear();

        // 拒绝所有等待的请求
        this.pendingRequests.forEach(request => {
            ErrorHandler.safeCallback(request.callback, new Error('Connection pool destroyed'));
        });
        this.pendingRequests.length = 0;

        // 销毁所有连接
        const connections = Array.from(this.connections);
        connections.forEach(conn => this.destroyConnection(conn));

        this.emit('destroyed');
        this.removeAllListeners();

        ErrorHandler.safeCallback(callback);
    }
}

module.exports = ConnectionPool;
