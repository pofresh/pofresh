const logger = require('../index');
const path = require('path');

// Configuration for file logging with rotation
const config = {
    appenders: {
        // Console appender for development
        console: {
            type: 'console'
        },
        // File appender for general logs
        file: {
            type: 'file',
            filename: path.join(__dirname, 'logs', 'app.log'),
            maxLogSize: 10_485_760, // 10MB
            backups: 5,
            compress: true
        },
        // Daily rotating file for access logs
        dateFile: {
            type: 'dateFile',
            filename: path.join(__dirname, 'logs', 'access-%DATE%.log'),
            pattern: 'YYYY-MM-DD',
            maxFiles: '14d', // Keep logs for 14 days
            maxSize: '20m', // Max 20MB per file
            compress: true
        },
        // Error-only file
        errorFile: {
            type: 'file',
            filename: path.join(__dirname, 'logs', 'error.log'),
            maxLogSize: 5_242_880, // 5MB
            backups: 3
        }
    },
    categories: {
        default: {
            appenders: ['console', 'file'],
            level: 'info'
        },
        access: {
            appenders: ['dateFile'],
            level: 'info'
        },
        error: {
            appenders: ['console', 'errorFile'],
            level: 'error'
        },
        development: {
            appenders: ['console'],
            level: 'debug'
        }
    },
    replaceConsole: false,
    rawMessage: false,
    lineDebug: false
};

// Configure the logger
logger.configure(config);

// Create different loggers for different purposes
const appLogger = logger.getLogger('default', 'FileLoggingExample');
const accessLogger = logger.getLogger('access', 'AccessLog');
const errorLogger = logger.getLogger('error', 'ErrorHandler');
const devLogger = logger.getLogger('development', 'DevMode');

// Application logging
appLogger.info('Application started successfully');
appLogger.debug('This debug message will not appear (level is info)');
appLogger.warn('This is a warning message');

// Access logging (typically used for HTTP requests)
accessLogger.info('GET /api/users 200 - 45ms');
accessLogger.info('POST /api/login 401 - 12ms');
accessLogger.info('GET /api/dashboard 200 - 123ms');

// Error logging
try {
    throw new Error('Simulated application error');
} catch (error) {
    errorLogger.error('Application error occurred:', error.message);
    errorLogger.error('Stack trace:', error.stack);
}

// Development logging (shows debug messages)
devLogger.debug('Debug information for development');
devLogger.info('Development info message');
devLogger.warn('Development warning');

// Demonstrate logger with prefixes
const userServiceLogger = logger.getLogger('default', 'UserService', 'Authentication');
userServiceLogger.info('User login attempt', {
    userId: 12_345,
    ip: '192.168.1.100'
});
userServiceLogger.warn('Failed login attempt', {
    userId: 12_345,
    reason: 'Invalid password'
});

// Demonstrate different log levels
const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
levels.forEach(level => {
    if (appLogger[level]) {
        appLogger[level](`This is a ${level} level message`);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    appLogger.info('Application shutting down...');
    logger.shutdown(() => {
        process.exit(0);
    });
});

// Keep the process running for a bit to see the logs
setTimeout(() => {
    appLogger.info('Example completed');
    logger.shutdown();
}, 1000);
