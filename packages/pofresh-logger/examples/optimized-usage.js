const logger = require('../index');

// Configure logger with multiple appenders
logger.configure({
    appenders: {
        console: {
            type: 'console'
        },
        file: {
            type: 'file',
            filename: './logs/app.log',
            maxLogSize: 10_485_760, // 10MB
            backups: 5
        },
        errorFile: {
            type: 'file',
            filename: './logs/errors.log'
        }
    },
    categories: {
        default: {
            appenders: ['console', 'file'],
            level: 'info'
        },
        error: {
            appenders: ['console', 'errorFile'],
            level: 'error'
        }
    }
});

// Create loggers
const appLogger = logger.getLogger('app');
const errorLogger = logger.getLogger('error');
const dbLogger = logger.getLogger('database', 'connection');

// Demonstrate improved object logging
const userObject = {
    id: 12_345,
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
        theme: 'dark',
        notifications: true
    }
};

// Basic logging
appLogger.info('Application started successfully');
appLogger.debug('Debug information', { timestamp: new Date() });

// Object logging (now properly serialized)
appLogger.info('User logged in:', userObject);

// Error logging with stack traces
try {
    throw new Error('Sample error for demonstration');
} catch (error) {
    errorLogger.error('An error occurred:', error);
}

// Database logger with prefix
dbLogger.info('Database connection established');
dbLogger.warn('Connection pool is running low');

// Performance logging
const startTime = process.hrtime.bigint();
// Simulate some work
setTimeout(() => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    appLogger.info(`Operation completed in ${duration.toFixed(2)}ms`);

    // Graceful shutdown
    logger.shutdown(() => {
        console.log('Logger shutdown complete');
    });
}, 100);

// Demonstrate high-volume logging performance
console.log('\n=== Performance Test ===');
const perfLogger = logger.getLogger('performance');
const messageCount = 1000;
const perfStartTime = process.hrtime.bigint();

for (let i = 0; i < messageCount; i++) {
    perfLogger.info(`Performance test message ${i}`, {
        index: i,
        timestamp: Date.now(),
        data: `Sample data for message ${i}`
    });
}

const perfEndTime = process.hrtime.bigint();
const perfDuration = Number(perfEndTime - perfStartTime) / 1_000_000;
console.log(`Logged ${messageCount} messages in ${perfDuration.toFixed(2)}ms`);
console.log(`Average: ${(perfDuration / messageCount).toFixed(3)}ms per message`);
