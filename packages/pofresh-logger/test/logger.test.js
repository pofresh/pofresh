import fs from 'fs';
import path from 'path';
import logger from '../lib/logger.js';

describe('logger', () => {
    let testConfigPath;
    let originalEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = { ...process.env };

        // Clean up environment variables
        delete process.env.RAW_MESSAGE;
        delete process.env.LOGGER_LINE;

        // Create test config file path
        testConfigPath = path.join(process.cwd(), 'test-log4js.json');
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;

        // Clean up test config file
        if (fs.existsSync(testConfigPath)) {
            fs.unlinkSync(testConfigPath);
        }

        // Shutdown logger to clean up
        logger.shutdown();
    });

    describe('getLogger', () => {
        it('should create a logger instance', () => {
            const testLogger = logger.getLogger('test');
            expect(testLogger).toBeDefined();
            expect(typeof testLogger.info).toBe('function');
            expect(typeof testLogger.debug).toBe('function');
            expect(typeof testLogger.warn).toBe('function');
            expect(typeof testLogger.error).toBe('function');
        });

        it('should create logger with category name', () => {
            const testLogger = logger.getLogger('test-category');
            expect(testLogger).toBeDefined();
        });

        it('should create logger with filename and prefix', () => {
            const testLogger = logger.getLogger(__filename, 'prefix1', 'prefix2');
            expect(testLogger).toBeDefined();
        });

        it('should handle all log levels', () => {
            const testLogger = logger.getLogger('test-levels');

            // Test that all log methods exist and are functions
            ['log', 'debug', 'info', 'warn', 'error', 'trace', 'fatal'].forEach(level => {
                expect(typeof testLogger[level]).toBe('function');
            });
        });

        it('should handle logger with prefix', () => {
            const testLogger = logger.getLogger('test', 'component', 'subcomponent');

            // Mock console to capture output
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            testLogger.info('test message');

            // Should not throw error
            expect(() => testLogger.info('test message')).not.toThrow();

            consoleSpy.mockRestore();
        });
    });

    describe('configure', () => {
        it('should configure with object', () => {
            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'info' }
                }
            };

            expect(() => {
                logger.configure(config);
            }).not.toThrow();
        });

        it('should configure with file path', () => {
            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'info' }
                }
            };

            // Write test config file
            fs.writeFileSync(testConfigPath, JSON.stringify(config));

            expect(() => {
                logger.configure(testConfigPath);
            }).not.toThrow();
        });

        it('should handle configuration with options', () => {
            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'info' }
                }
            };

            const opts = { testOption: 'value' };

            expect(() => {
                logger.configure(config, opts);
            }).not.toThrow();
        });

        it('should handle replaceConsole option', () => {
            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'info' }
                },
                replaceConsole: true
            };

            expect(() => {
                logger.configure(config);
            }).not.toThrow();
        });

        it('should handle lineDebug option', () => {
            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'info' }
                },
                lineDebug: true
            };

            logger.configure(config);
            expect(process.env.LOGGER_LINE).toBe(true);
        });

        it('should handle rawMessage option', () => {
            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'info' }
                },
                rawMessage: true
            };

            logger.configure(config);
            expect(process.env.RAW_MESSAGE).toBe(true);
        });

        it('should handle property replacement', () => {
            const config = {
                appenders: {
                    console: {
                        type: 'console',
                        layout: {
                            type: 'pattern',
                            pattern: '${env:NODE_ENV} - %m'
                        }
                    }
                },
                categories: {
                    default: { appenders: ['console'], level: 'info' }
                }
            };

            process.env.NODE_ENV = 'test';

            expect(() => {
                logger.configure(config);
            }).not.toThrow();
        });
    });

    describe('basic functionality', () => {
        it('should have shutdown method', () => {
            expect(typeof logger.shutdown).toBe('function');
            expect(() => logger.shutdown()).not.toThrow();
        });

        it('should have connectLogger method', () => {
            expect(typeof logger.connectLogger).toBe('function');
        });

        it('should have levels property', () => {
            expect(logger.levels).toBeDefined();
        });

        it('should have addLayout method', () => {
            expect(typeof logger.addLayout).toBe('function');
        });
    });

    describe('error handling', () => {
        it('should handle invalid config file path', () => {
            expect(() => {
                logger.configure('/nonexistent/path/config.json');
            }).toThrow();
        });

        it('should handle invalid JSON in config file', () => {
            const invalidConfigPath = path.join(process.cwd(), 'invalid-config.json');
            fs.writeFileSync(invalidConfigPath, 'invalid json content');

            expect(() => {
                logger.configure(invalidConfigPath);
            }).toThrow();

            // Clean up
            fs.unlinkSync(invalidConfigPath);
        });
    });

    describe('logging functionality', () => {
        it('should log messages without throwing errors', () => {
            const testLogger = logger.getLogger('test-logging');

            expect(() => {
                testLogger.info('info message');
                testLogger.debug('debug message');
                testLogger.warn('warn message');
                testLogger.error('error message');
                testLogger.trace('trace message');
                testLogger.fatal('fatal message');
            }).not.toThrow();
        });

        it('should handle log method (alias for info)', () => {
            const testLogger = logger.getLogger('test-log-method');

            expect(() => {
                testLogger.log('log message');
            }).not.toThrow();
        });

        it('should handle logger with environment variables', () => {
            process.env.RAW_MESSAGE = 'true';
            const testLogger = logger.getLogger('test-raw');

            expect(() => {
                testLogger.info('raw message');
            }).not.toThrow();
        });

        it('should handle logger with line debug', () => {
            process.env.LOGGER_LINE = 'true';
            const testLogger = logger.getLogger('test-line');

            expect(() => {
                testLogger.info('line debug message');
            }).not.toThrow();
        });
    });
});
