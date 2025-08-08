/**
 * Error handling utilities for pofresh-admin
 * Copyright(c) 2024
 * MIT Licensed
 */

const logger = require('pofresh-logger').getLogger('pofresh-admin', 'ErrorHandler');

class ErrorHandler {
    /**
     * 安全地调用回调函数，防止重复调用
     * @param {Function} callback 回调函数
     * @param {Error} err 错误对象
     * @param {*} result 结果
     */
    static safeCallback(callback, err, result) {
        if (typeof callback === 'function') {
            try {
                callback(err, result);
            } catch (callbackErr) {
                logger.error('Error in callback execution:', callbackErr);
            }
        }
    }

    /**
     * 创建带超时的回调包装器
     * @param {Function} callback 原始回调
     * @param {number} timeout 超时时间（毫秒）
     * @param {string} operation 操作名称
     * @returns {Object} 包含回调和清理函数的对象
     */
    static createTimeoutCallback(callback, timeout = 30_000, operation = 'operation') {
        let called = false;
        const timeoutId = setTimeout(() => {
            if (!called) {
                logger.warn(`${operation} timeout after ${timeout}ms`);
                wrappedCallback(new Error(`${operation} timeout`));
            }
        }, timeout);

        const wrappedCallback = (err, result) => {
            if (called) {
                return;
            }
            called = true;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            ErrorHandler.safeCallback(callback, err, result);
        };

        return {
            callback: wrappedCallback,
            cleanup: () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            }
        };
    }

    /**
     * 验证输入参数
     * @param {Object} params 参数对象
     * @param {Array} required 必需的参数名数组
     * @param {Object} types 参数类型映射
     * @returns {Error|null} 验证错误或null
     */
    static validateParams(params, required = [], types = {}) {
        if (!params || typeof params !== 'object') {
            return new Error('Invalid parameters: must be an object');
        }

        // 检查必需参数
        for (const param of required) {
            if (params[param] === undefined || params[param] === null) {
                return new Error(`Missing required parameter: ${param}`);
            }
        }

        // 检查参数类型
        for (const [param, expectedType] of Object.entries(types)) {
            if (params[param] !== undefined) {
                const actualType = typeof params[param];
                if (actualType !== expectedType) {
                    return new Error(
                        `Invalid type for parameter ${param}: ` + `expected ${expectedType}, got ${actualType}`
                    );
                }
            }
        }

        return null;
    }

    /**
     * 安全地执行异步操作
     * @param {Function} operation 异步操作函数
     * @param {Function} callback 回调函数
     * @param {string} operationName 操作名称
     */
    static safeAsyncOperation(operation, callback, operationName = 'async operation') {
        try {
            const result = operation();

            if (result && typeof result.then === 'function') {
                // Promise
                result
                    .then(res => ErrorHandler.safeCallback(callback, null, res))
                    .catch(err => {
                        logger.error(`${operationName} failed:`, err);
                        ErrorHandler.safeCallback(callback, err);
                    });
            } else {
                // 同步结果
                ErrorHandler.safeCallback(callback, null, result);
            }
        } catch (err) {
            logger.error(`${operationName} failed:`, err);
            ErrorHandler.safeCallback(callback, err);
        }
    }

    /**
     * 创建资源管理器
     * @returns {Object} 资源管理器对象
     */
    static createResourceManager() {
        const resources = new Set();
        const timers = new Set();

        return {
            addResource(resource) {
                resources.add(resource);
            },

            addTimer(timerId) {
                timers.add(timerId);
            },

            cleanup() {
                // 清理定时器
                for (const timerId of timers) {
                    clearTimeout(timerId);
                    clearInterval(timerId);
                }
                timers.clear();

                // 清理资源
                for (const resource of resources) {
                    try {
                        if (resource && typeof resource.close === 'function') {
                            resource.close();
                        } else if (resource && typeof resource.destroy === 'function') {
                            resource.destroy();
                        } else if (resource && typeof resource.end === 'function') {
                            resource.end();
                        }
                    } catch (err) {
                        logger.error('Error cleaning up resource:', err);
                    }
                }
                resources.clear();
            }
        };
    }

    /**
     * 安全地解析JSON
     * @param {string} jsonString JSON字符串
     * @param {*} defaultValue 默认值
     * @returns {*} 解析结果或默认值
     */
    static safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (err) {
            logger.warn('Failed to parse JSON:', err.message);
            return defaultValue;
        }
    }

    /**
     * 检查路径安全性
     * @param {string} filePath 文件路径
     * @returns {boolean} 是否安全
     */
    static isPathSafe(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return false;
        }

        // 检查路径遍历攻击
        const dangerousPatterns = [
            /\.\./, // 父目录引用
            /~/, // 用户目录
            /^\/+/, // 绝对路径（根据需要调整）
            /\0/ // 空字节
        ];

        return !dangerousPatterns.some(pattern => pattern.test(filePath));
    }
}

module.exports = ErrorHandler;
