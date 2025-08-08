const logger = require('../index');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Advanced configuration with multiple appenders and categories
const config = {
    appenders: {
        // Console with custom layout
        console: {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: '%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] %c - %m'
            }
        },

        // Application logs with rotation
        app: {
            type: 'file',
            filename: path.join(logsDir, 'application.log'),
            maxLogSize: 10_485_760, // 10MB
            backups: 10,
            compress: true,
            layout: {
                type: 'pattern',
                pattern: '%d{ISO8601} [%p] %c{2} - %m%n'
            }
        },

        // Daily rotating files for different services
        userService: {
            type: 'dateFile',
            filename: path.join(logsDir, 'user-service-%DATE%.log'),
            pattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            maxSize: '50m',
            compress: true
        },

        orderService: {
            type: 'dateFile',
            filename: path.join(logsDir, 'order-service-%DATE%.log'),
            pattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            maxSize: '50m',
            compress: true
        },

        // Performance logs
        performance: {
            type: 'dateFile',
            filename: path.join(logsDir, 'performance-%DATE%.log'),
            pattern: 'YYYY-MM-DD-HH',
            maxFiles: '7d',
            maxSize: '100m'
        },

        // Security audit logs
        security: {
            type: 'file',
            filename: path.join(logsDir, 'security-audit.log'),
            maxLogSize: 20_971_520, // 20MB
            backups: 20,
            compress: true,
            layout: {
                type: 'pattern',
                pattern: '%d{ISO8601} [SECURITY] %c - %m%n'
            }
        },

        // Error logs with detailed formatting
        error: {
            type: 'file',
            filename: path.join(logsDir, 'errors.log'),
            maxLogSize: 5_242_880, // 5MB
            backups: 5,
            layout: {
                type: 'pattern',
                pattern: '%d{ISO8601} [%p] %c{1} - %m%n%s'
            }
        },

        // Debug logs (only in development)
        debug: {
            type: 'file',
            filename: path.join(logsDir, 'debug.log'),
            maxLogSize: 10_485_760,
            backups: 3
        }
    },

    categories: {
        default: {
            appenders: ['console', 'app'],
            level: 'info'
        },

        // Service-specific categories
        'user-service': {
            appenders: ['console', 'userService'],
            level: 'debug'
        },

        'order-service': {
            appenders: ['console', 'orderService'],
            level: 'info'
        },

        // Performance monitoring
        performance: {
            appenders: ['performance'],
            level: 'info'
        },

        // Security events
        security: {
            appenders: ['console', 'security'],
            level: 'warn'
        },

        // Error tracking
        error: {
            appenders: ['console', 'error'],
            level: 'error'
        },

        // Development debugging
        debug: {
            appenders: ['console', 'debug'],
            level: 'debug'
        }
    },

    // Global settings
    replaceConsole: false,
    rawMessage: false,
    lineDebug: process.env.NODE_ENV === 'development'
};

// Configure logger with environment-specific settings
if (process.env.NODE_ENV === 'production') {
    // Production optimizations
    config.categories.default.level = 'warn';
    config.categories['user-service'].level = 'info';
    config.lineDebug = false;
} else if (process.env.NODE_ENV === 'development') {
    // Development settings
    config.categories.default.level = 'debug';
    config.lineDebug = true;
}

// Apply configuration
logger.configure(config);

// Create specialized loggers
const appLogger = logger.getLogger('default', 'AdvancedExample');
const userLogger = logger.getLogger('user-service', 'UserService');
const orderLogger = logger.getLogger('order-service', 'OrderService');
const perfLogger = logger.getLogger('performance', 'PerformanceMonitor');
const securityLogger = logger.getLogger('security', 'SecurityAudit');
const errorLogger = logger.getLogger('error', 'ErrorHandler');
const debugLogger = logger.getLogger('debug', 'DebugInfo');

// Application startup logging
appLogger.info('Application starting with advanced logging configuration');
appLogger.info('Environment:', process.env.NODE_ENV || 'development');
appLogger.info('Log directory:', logsDir);

// Service-specific logging
function simulateUserService() {
    userLogger.info('User service initialized');

    // Simulate user operations
    const operations = [
        { action: 'login', userId: 'user123', success: true, duration: 45 },
        {
            action: 'profile_update',
            userId: 'user456',
            success: true,
            duration: 123
        },
        {
            action: 'password_change',
            userId: 'user789',
            success: false,
            duration: 67
        },
        { action: 'logout', userId: 'user123', success: true, duration: 12 }
    ];

    operations.forEach((op, index) => {
        setTimeout(() => {
            if (op.success) {
                userLogger.info(`User ${op.action} successful`, {
                    userId: op.userId,
                    duration: op.duration,
                    timestamp: new Date().toISOString()
                });
            } else {
                userLogger.warn(`User ${op.action} failed`, {
                    userId: op.userId,
                    duration: op.duration,
                    reason: 'Invalid credentials'
                });
            }

            // Log performance metrics
            perfLogger.info('Operation performance', {
                service: 'user-service',
                operation: op.action,
                duration: op.duration,
                success: op.success
            });
        }, index * 300);
    });
}

function simulateOrderService() {
    orderLogger.info('Order service initialized');

    const orders = [
        { orderId: 'ORD001', amount: 99.99, status: 'created' },
        { orderId: 'ORD002', amount: 149.5, status: 'paid' },
        { orderId: 'ORD003', amount: 75.25, status: 'shipped' },
        { orderId: 'ORD004', amount: 200.0, status: 'delivered' }
    ];

    orders.forEach((order, index) => {
        setTimeout(() => {
            orderLogger.info(`Order ${order.status}`, {
                orderId: order.orderId,
                amount: order.amount,
                status: order.status,
                timestamp: new Date().toISOString()
            });

            // Log performance for order processing
            const processingTime = Math.floor(Math.random() * 200) + 50;
            perfLogger.info('Order processing performance', {
                service: 'order-service',
                orderId: order.orderId,
                processingTime,
                status: order.status
            });
        }, index * 400);
    });
}

function simulateSecurityEvents() {
    const securityEvents = [
        { type: 'failed_login', ip: '192.168.1.100', attempts: 3 },
        {
            type: 'suspicious_activity',
            ip: '10.0.0.50',
            details: 'Multiple rapid requests'
        },
        {
            type: 'privilege_escalation',
            userId: 'admin123',
            resource: '/admin/users'
        },
        { type: 'data_access', userId: 'user456', resource: '/api/sensitive-data' }
    ];

    securityEvents.forEach((event, index) => {
        setTimeout(() => {
            securityLogger.warn(`Security event: ${event.type}`, {
                type: event.type,
                ip: event.ip,
                userId: event.userId,
                details: event.details || event.resource,
                timestamp: new Date().toISOString(),
                severity: event.type.includes('escalation') ? 'HIGH' : 'MEDIUM'
            });
        }, index * 600);
    });
}

function simulateErrors() {
    setTimeout(() => {
        try {
            throw new Error('Database connection timeout');
        } catch (error) {
            errorLogger.error('Database error occurred', {
                error: error.message,
                stack: error.stack,
                service: 'database',
                timestamp: new Date().toISOString()
            });
        }
    }, 1000);

    setTimeout(() => {
        try {
            throw new Error('External API rate limit exceeded');
        } catch (error) {
            errorLogger.error('External API error', {
                error: error.message,
                service: 'external-api',
                endpoint: '/api/v1/data',
                retryAfter: 60
            });
        }
    }, 2000);
}

function simulateDebugInfo() {
    if (process.env.NODE_ENV !== 'production') {
        debugLogger.debug('Debug mode enabled');

        setInterval(() => {
            debugLogger.debug('System status check', {
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            });
        }, 5000);
    }
}

// Performance monitoring
function logPerformanceMetrics() {
    setInterval(() => {
        const metrics = {
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            cpu: process.cpuUsage(),
            activeHandles: process._getActiveHandles().length,
            activeRequests: process._getActiveRequests().length
        };

        perfLogger.info('System performance metrics', metrics);
    }, 10_000);
}

// Start simulations
appLogger.info('Starting service simulations...');

simulateUserService();
simulateOrderService();
simulateSecurityEvents();
simulateErrors();
simulateDebugInfo();
logPerformanceMetrics();

// Application health check
setInterval(() => {
    appLogger.info('Application health check', {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            userService: 'running',
            orderService: 'running',
            database: 'connected',
            cache: 'connected'
        }
    });
}, 15_000);

// Graceful shutdown
process.on('SIGINT', () => {
    appLogger.info('Received SIGINT, shutting down gracefully...');

    // Log shutdown metrics
    perfLogger.info('Application shutdown metrics', {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });

    logger.shutdown(() => {
        process.exit(0);
    });
});

// Auto-shutdown after demo
setTimeout(() => {
    appLogger.info('Demo completed, shutting down...');
    logger.shutdown();
}, 30_000);
