const logger = require('../index');
const path = require('path');

// Configuration for Express application logging
const config = {
    appenders: {
        console: {
            type: 'console'
        },
        access: {
            type: 'dateFile',
            filename: path.join(__dirname, 'logs', 'access-%DATE%.log'),
            pattern: 'YYYY-MM-DD',
            maxFiles: '30d'
        },
        app: {
            type: 'file',
            filename: path.join(__dirname, 'logs', 'app.log'),
            maxLogSize: 10485760,
            backups: 5
        },
        error: {
            type: 'file',
            filename: path.join(__dirname, 'logs', 'error.log'),
            maxLogSize: 5242880,
            backups: 3
        }
    },
    categories: {
        default: {
            appenders: ['console', 'app'],
            level: 'info'
        },
        access: {
            appenders: ['access'],
            level: 'info'
        },
        error: {
            appenders: ['console', 'error'],
            level: 'error'
        }
    }
};

// Configure the logger
logger.configure(config);

// Create loggers for different purposes
const appLogger = logger.getLogger('default', 'ExpressApp');
const accessLogger = logger.getLogger('access');
const errorLogger = logger.getLogger('error', 'ErrorHandler');

// Simulate Express.js application
console.log('=== Express Middleware Example ===\n');

// Create connect logger middleware for access logging
const accessLoggerMiddleware = logger.connectLogger(accessLogger, {
    level: 'info',
    format: ':remote-addr - :method :url HTTP/:http-version :status :content-length - :response-time ms'
});

// Alternative middleware with custom format
const customAccessLogger = logger.connectLogger(accessLogger, {
    level: 'info',
    format: function(req, res, format) {
        return format(`:remote-addr - ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms`);
    }
});

// Simulate Express middleware usage
function simulateExpressApp() {
    appLogger.info('Express application starting...');
    
    // Simulate different HTTP requests
    const requests = [
        { method: 'GET', url: '/', status: 200, responseTime: 45 },
        { method: 'POST', url: '/api/users', status: 201, responseTime: 123 },
        { method: 'GET', url: '/api/users/123', status: 200, responseTime: 67 },
        { method: 'PUT', url: '/api/users/123', status: 200, responseTime: 89 },
        { method: 'DELETE', url: '/api/users/123', status: 204, responseTime: 34 },
        { method: 'GET', url: '/api/nonexistent', status: 404, responseTime: 12 },
        { method: 'POST', url: '/api/login', status: 401, responseTime: 56 }
    ];
    
    requests.forEach((reqData, index) => {
        setTimeout(() => {
            // Simulate request/response objects
            const req = {
                method: reqData.method,
                url: reqData.url,
                headers: {
                    'user-agent': 'Mozilla/5.0 (Example Browser)',
                    'referer': 'http://example.com'
                },
                connection: {
                    remoteAddress: '192.168.1.' + (100 + index)
                },
                httpVersion: '1.1'
            };
            
            const res = {
                statusCode: reqData.status,
                getHeader: (name) => {
                    const headers = {
                        'content-length': '1234',
                        'content-type': 'application/json'
                    };
                    return headers[name.toLowerCase()];
                },
                on: (event, callback) => {
                    if (event === 'finish') {
                        // Simulate response completion
                        setTimeout(() => {
                            // Add response time to request
                            req._startTime = Date.now() - reqData.responseTime;
                            callback();
                        }, 10);
                    }
                }
            };
            
            // Simulate middleware execution
            const next = () => {
                // Log the request using access logger
                const logMessage = `${req.connection.remoteAddress} - ${req.method} ${req.url} HTTP/${req.httpVersion} ${res.statusCode} ${res.getHeader('content-length')} - ${reqData.responseTime}ms`;
                accessLogger.info(logMessage);
                
                // Log application events
                if (res.statusCode >= 400) {
                    if (res.statusCode >= 500) {
                        errorLogger.error(`Server error: ${req.method} ${req.url} - ${res.statusCode}`);
                    } else {
                        appLogger.warn(`Client error: ${req.method} ${req.url} - ${res.statusCode}`);
                    }
                } else {
                    appLogger.info(`Request processed: ${req.method} ${req.url} - ${res.statusCode}`);
                }
            };
            
            // Execute middleware
            accessLoggerMiddleware(req, res, next);
            
        }, index * 200); // Stagger requests
    });
}

// Error handling middleware simulation
function errorHandlingMiddleware(err, req, res, next) {
    errorLogger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        userAgent: req.headers['user-agent'],
        ip: req.connection.remoteAddress
    });
    
    res.statusCode = 500;
    next();
}

// Simulate application startup
appLogger.info('Configuring Express middleware...');
appLogger.info('Access logger middleware configured');
appLogger.info('Error handling middleware configured');
appLogger.info('Express application ready to accept connections');

// Start simulation
simulateExpressApp();

// Simulate some application events
setTimeout(() => {
    appLogger.info('Database connection established');
    appLogger.info('Redis cache connected');
}, 500);

setTimeout(() => {
    appLogger.warn('High memory usage detected');
}, 1500);

setTimeout(() => {
    // Simulate an error
    try {
        throw new Error('Database connection lost');
    } catch (error) {
        errorLogger.error('Critical error occurred:', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}, 2000);

setTimeout(() => {
    appLogger.info('Application metrics:', {
        uptime: '2.5 seconds',
        requestsProcessed: 7,
        errorsEncountered: 1,
        memoryUsage: process.memoryUsage()
    });
}, 2500);

console.log('\n=== Simulating Express application with logging ===');
console.log('Check the logs directory for:');
console.log('- access-YYYY-MM-DD.log: HTTP access logs');
console.log('- app.log: Application logs');
console.log('- error.log: Error logs');

// Graceful shutdown
setTimeout(() => {
    appLogger.info('Express application shutting down...');
    logger.shutdown(() => {
        console.log('\nLogger shutdown complete');
    });
}, 3000);