/**
 * Enhanced error handling system for pofresh-loader
 * Features: Error classification, recovery strategies, detailed logging
 */

class LoaderError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'LoaderError';
        this.code = code;
        this.details = details;
        this.timestamp = performance.now();
        this.stack = new Error().stack;
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

/**
 * Error codes and their corresponding recovery strategies
 */
const ERROR_CODES = {
    // File system errors
    FS_INVALID_PATH: {
        severity: 'critical',
        recoverable: false,
        message: 'Invalid path provided'
    },
    FS_PATH_NOT_FOUND: {
        severity: 'error',
        recoverable: false,
        message: 'Path not found'
    },
    FS_PERMISSION_DENIED: {
        severity: 'error',
        recoverable: false,
        message: 'Permission denied'
    },
    FS_DIRECTORY_NOT_FOUND: {
        severity: 'error',
        recoverable: false,
        message: 'Directory not found'
    },
    FS_FILE_NOT_FOUND: {
        severity: 'warning',
        recoverable: true,
        message: 'File not found'
    },
    FS_READ_ERROR: {
        severity: 'error',
        recoverable: true,
        message: 'Failed to read file/directory'
    },
    FS_WRITE_ERROR: {
        severity: 'error',
        recoverable: true,
        message: 'Failed to write file'
    },

    // Module loading errors
    MODULE_RESOLUTION_FAILED: {
        severity: 'error',
        recoverable: false,
        message: 'Failed to resolve module'
    },
    MODULE_LOAD_FAILED: {
        severity: 'error',
        recoverable: true,
        message: 'Failed to load module'
    },
    MODULE_FACTORY_ERROR: {
        severity: 'error',
        recoverable: true,
        message: 'Module factory function failed'
    },
    MODULE_INVALID_FORMAT: {
        severity: 'warning',
        recoverable: true,
        message: 'Module has invalid format'
    },
    MODULE_NAME_CONFLICT: {
        severity: 'warning',
        recoverable: true,
        message: 'Module name conflict detected'
    },

    // Cache errors
    CACHE_MEMORY_LIMIT: {
        severity: 'warning',
        recoverable: true,
        message: 'Cache memory limit exceeded'
    },
    CACHE_SIZE_LIMIT: {
        severity: 'warning',
        recoverable: true,
        message: 'Cache size limit exceeded'
    },
    CACHE_CORRUPTION: {
        severity: 'error',
        recoverable: true,
        message: 'Cache corruption detected'
    },

    // Security errors
    SECURITY_PATH_VIOLATION: {
        severity: 'critical',
        recoverable: false,
        message: 'Security violation: path not allowed'
    },
    SECURITY_MODULE_SANDBOX: {
        severity: 'error',
        recoverable: false,
        message: 'Security violation: module sandbox breach'
    },

    // Configuration errors
    CONFIG_INVALID_OPTION: {
        severity: 'warning',
        recoverable: true,
        message: 'Invalid configuration option'
    },
    CONFIG_MISSING_REQUIRED: {
        severity: 'error',
        recoverable: false,
        message: 'Missing required configuration'
    },

    // System errors
    SYSTEM_OUT_OF_MEMORY: {
        severity: 'critical',
        recoverable: false,
        message: 'System out of memory'
    },
    SYSTEM_TIMEOUT: {
        severity: 'error',
        recoverable: true,
        message: 'Operation timeout'
    }
};

/**
 * Error handler class for pofresh-loader
 */
class ErrorHandler {
    constructor(options = {}) {
        this.options = {
            logger: console,
            maxErrors: options.maxErrors || 1000,
            enableRecovery: options.enableRecovery !== false,
            enableLogging: options.enableLogging !== false,
            enableMetrics: options.enableMetrics !== false,
            ...options
        };

        this.errorHistory = [];
        this.errorMetrics = {
            totalErrors: 0,
            errorsByCode: new Map(),
            errorsBySeverity: new Map(),
            recoveryAttempts: 0,
            recoverySuccesses: 0
        };

        this.recoveryStrategies = new Map([
            ['retry', this.retryStrategy.bind(this)],
            ['fallback', this.fallbackStrategy.bind(this)],
            ['skip', this.skipStrategy.bind(this)],
            ['degrade', this.degradeStrategy.bind(this)]
        ]);
    }

    /**
     * Handle an error with classification and recovery
     * @param {Error|string} error - Error object or message
     * @param {string} code - Error code
     * @param {Object} context - Context information
     * @param {Object} options - Handling options
     * @returns {Object} Error handling result
     */
    handleError(error, code = 'UNKNOWN_ERROR', context = {}, options = {}) {
        const normalizedError = this.normalizeError(error, code, context);
        const errorConfig = ERROR_CODES[code] || {
            severity: 'error',
            recoverable: false,
            message: 'Unknown error'
        };

        // Record error
        this.recordError(normalizedError, errorConfig);

        // Log error
        if (this.options.enableLogging) {
            this.logError(normalizedError, errorConfig);
        }

        // Attempt recovery if enabled and recoverable
        let recoveryResult = null;
        if (this.options.enableRecovery && errorConfig.recoverable) {
            recoveryResult = this.attemptRecovery(normalizedError, errorConfig, context, options);
        }

        return {
            error: normalizedError,
            handled: true,
            recovered: recoveryResult?.success || false,
            recoveryResult,
            severity: errorConfig.severity,
            shouldContinue: this.shouldContinue(errorConfig, recoveryResult)
        };
    }

    /**
     * Normalize error to LoaderError
     * @param {Error|string} error - Original error
     * @param {string} code - Error code
     * @param {Object} context - Context information
     * @returns {LoaderError} Normalized error
     */
    normalizeError(error, code, context) {
        if (error instanceof LoaderError) {
            return error;
        }

        const message = error instanceof Error ? error.message : String(error);
        const details = {
            ...context,
            originalError: error instanceof Error ? error.stack : null,
            timestamp: Date.now()
        };

        return new LoaderError(message, code, details);
    }

    /**
     * Record error for metrics and history
     * @param {LoaderError} error - Error to record
     * @param {Object} config - Error configuration
     */
    recordError(error, config) {
        // Update metrics
        this.errorMetrics.totalErrors++;

        // By code
        const codeCount = this.errorMetrics.errorsByCode.get(error.code) || 0;
        this.errorMetrics.errorsByCode.set(error.code, codeCount + 1);

        // By severity
        const severityCount = this.errorMetrics.errorsBySeverity.get(config.severity) || 0;
        this.errorMetrics.errorsBySeverity.set(config.severity, severityCount + 1);

        // Add to history (with limit)
        this.errorHistory.push({
            error,
            config,
            timestamp: Date.now()
        });

        if (this.errorHistory.length > this.options.maxErrors) {
            this.errorHistory.shift();
        }
    }

    /**
     * Log error with appropriate level
     * @param {LoaderError} error - Error to log
     * @param {Object} config - Error configuration
     */
    logError(error, config) {
        const logEntry = {
            code: error.code,
            message: error.message,
            severity: config.severity,
            details: error.details,
            timestamp: error.timestamp
        };

        switch (config.severity) {
            case 'critical':
                this.options.logger.error('[CRITICAL]', logEntry);
                break;
            case 'error':
                this.options.logger.error('[ERROR]', logEntry);
                break;
            case 'warning':
                this.options.logger.warn('[WARNING]', logEntry);
                break;
            default:
                this.options.logger.info('[INFO]', logEntry);
        }
    }

    /**
     * Attempt error recovery
     * @param {LoaderError} error - Error to recover from
     * @param {Object} config - Error configuration
     * @param {Object} context - Context information
     * @param {Object} options - Recovery options
     * @returns {Object} Recovery result
     */
    attemptRecovery(error, config, context, options) {
        this.errorMetrics.recoveryAttempts++;

        const strategy = options.recoveryStrategy || this.getDefaultRecoveryStrategy(error.code);
        const recoveryFn = this.recoveryStrategies.get(strategy);

        if (!recoveryFn) {
            return { success: false, strategy: 'none', message: 'No recovery strategy available' };
        }

        try {
            const result = recoveryFn(error, config, context, options);
            if (result.success) {
                this.errorMetrics.recoverySuccesses++;
            }
            return result;
        } catch (recoveryError) {
            return {
                success: false,
                strategy,
                message: `Recovery failed: ${recoveryError.message}`
            };
        }
    }

    /**
     * Get default recovery strategy for error code
     * @param {string} code - Error code
     * @returns {string} Recovery strategy name
     */
    getDefaultRecoveryStrategy(code) {
        const strategyMap = {
            FS_FILE_NOT_FOUND: 'skip',
            FS_READ_ERROR: 'retry',
            FS_WRITE_ERROR: 'retry',
            MODULE_LOAD_FAILED: 'fallback',
            MODULE_FACTORY_ERROR: 'fallback',
            MODULE_INVALID_FORMAT: 'skip',
            MODULE_NAME_CONFLICT: 'skip',
            CACHE_MEMORY_LIMIT: 'degrade',
            CACHE_SIZE_LIMIT: 'degrade',
            CACHE_CORRUPTION: 'fallback',
            SYSTEM_TIMEOUT: 'retry'
        };

        return strategyMap[code] || 'none';
    }

    /**
     * Determine if execution should continue
     * @param {Object} config - Error configuration
     * @param {Object} recoveryResult - Recovery result
     * @returns {boolean} True if execution should continue
     */
    shouldContinue(config, recoveryResult) {
        if (config.severity === 'critical') {
            return false;
        }

        if (recoveryResult?.success) {
            return true;
        }

        return config.recoverable;
    }

    // Recovery strategies

    /**
     * Retry strategy
     */
    retryStrategy(error, config, context, options) {
        const maxRetries = options.maxRetries || 3;
        const delay = options.retryDelay || 100;

        // For synchronous operations, return retry info
        return {
            success: false, // Actual retry should be handled by caller
            strategy: 'retry',
            maxRetries,
            delay,
            message: 'Retry operation suggested'
        };
    }

    /**
     * Fallback strategy
     */
    fallbackStrategy(error, config, context, options) {
        const fallback = options.fallback;
        if (typeof fallback === 'function') {
            try {
                const result = fallback(context);
                return {
                    success: true,
                    strategy: 'fallback',
                    result,
                    message: 'Fallback operation succeeded'
                };
            } catch (fallbackError) {
                return {
                    success: false,
                    strategy: 'fallback',
                    message: `Fallback failed: ${fallbackError.message}`
                };
            }
        }

        return {
            success: false,
            strategy: 'fallback',
            message: 'No fallback function provided'
        };
    }

    /**
     * Skip strategy
     */
    skipStrategy(error, config, context, options) {
        return {
            success: true,
            strategy: 'skip',
            message: 'Operation skipped due to error'
        };
    }

    /**
     * Degrade strategy
     */
    degradeStrategy(error, config, context, options) {
        return {
            success: true,
            strategy: 'degrade',
            message: 'Operation degraded due to resource constraints'
        };
    }

    /**
     * Get error metrics
     * @returns {Object} Error metrics
     */
    getMetrics() {
        return {
            ...this.errorMetrics,
            recoveryRate: this.errorMetrics.recoverySuccesses / this.errorMetrics.recoveryAttempts || 0,
            recentErrors: this.errorHistory.slice(-10)
        };
    }

    /**
     * Clear error history
     */
    clearHistory() {
        this.errorHistory = [];
        this.errorMetrics.totalErrors = 0;
        this.errorMetrics.errorsByCode.clear();
        this.errorMetrics.errorsBySeverity.clear();
        this.errorMetrics.recoveryAttempts = 0;
        this.errorMetrics.recoverySuccesses = 0;
    }
}

module.exports = {
    LoaderError,
    ErrorHandler,
    ERROR_CODES
};
