import logger from '../lib/logger.js';

describe('Environment and Special Features', () => {
    let originalEnv;
    let consoleSpy;

    beforeEach(() => {
        originalEnv = { ...process.env };
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Clean environment
        delete process.env.RAW_MESSAGE;
        delete process.env.LOGGER_LINE;
    });

    afterEach(() => {
        process.env = originalEnv;
        consoleSpy.mockRestore();
        logger.shutdown();
    });

    describe('Raw Message Mode', () => {
        it('should enable raw message mode via environment variable', () => {
            process.env.RAW_MESSAGE = 'true';

            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'info' }
                }
            };

            logger.configure(config);
            const testLogger = logger.getLogger('raw-test');

            testLogger.info('Raw message test');

            // In raw mode, the message should be simpler
            expect(() => testLogger.info('test')).not.toThrow();
        });

        it('should enable raw message mode via configuration', () => {
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

            const testLogger = logger.getLogger('raw-config-test');
            testLogger.info('Raw config message');
        });

        it('should handle raw message with different log levels', () => {
            process.env.RAW_MESSAGE = 'true';

            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'debug' }
                }
            };

            logger.configure(config);
            const testLogger = logger.getLogger('raw-levels');

            expect(() => {
                testLogger.debug('Debug raw');
                testLogger.info('Info raw');
                testLogger.warn('Warn raw');
                testLogger.error('Error raw');
            }).not.toThrow();
        });
    });

    describe('Line Debug Mode', () => {
        it('should enable line debug mode via environment variable', () => {
            process.env.LOGGER_LINE = 'true';

            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'info' }
                }
            };

            logger.configure(config);
            const testLogger = logger.getLogger('line-test');

            testLogger.info('Line debug test');

            // Should include line number information
            expect(() => testLogger.info('test')).not.toThrow();
        });

        it('should enable line debug mode via configuration', () => {
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

            const testLogger = logger.getLogger('line-config-test');
            testLogger.info('Line config message');
        });

        it('should work with line debug and raw message together', () => {
            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'info' }
                },
                lineDebug: true,
                rawMessage: true
            };

            logger.configure(config);
            expect(process.env.LOGGER_LINE).toBe(true);
            expect(process.env.RAW_MESSAGE).toBe(true);

            const testLogger = logger.getLogger('combined-test');

            expect(() => {
                testLogger.info('Combined mode test');
            }).not.toThrow();
        });
    });

    describe('Console Replacement', () => {
        it('should replace console when configured', () => {
            const originalConsole = { ...console };

            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'info' }
                },
                replaceConsole: true
            };

            logger.configure(config);

            // Console methods should be replaced
            expect(console.log).not.toBe(originalConsole.log);
            expect(console.info).not.toBe(originalConsole.info);
            expect(console.warn).not.toBe(originalConsole.warn);
            expect(console.error).not.toBe(originalConsole.error);

            // Test replaced console methods
            expect(() => {
                console.log('Replaced log');
                console.info('Replaced info');
                console.warn('Replaced warn');
                console.error('Replaced error');
            }).not.toThrow();
        });

        it('should not replace console when not configured', () => {
            const originalConsole = { ...console };

            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'info' }
                },
                replaceConsole: false
            };

            logger.configure(config);

            // Console methods should remain unchanged
            expect(console.log).toBe(originalConsole.log);
            expect(console.info).toBe(originalConsole.info);
            expect(console.warn).toBe(originalConsole.warn);
            expect(console.error).toBe(originalConsole.error);
        });
    });

    describe('Property Replacement', () => {
        it('should replace environment variables in configuration', () => {
            process.env.TEST_LOG_LEVEL = 'debug';
            process.env.TEST_APP_NAME = 'test-app';

            const config = {
                appenders: {
                    console: {
                        type: 'console',
                        layout: {
                            type: 'pattern',
                            pattern: '${env:TEST_APP_NAME} - %m'
                        }
                    }
                },
                categories: {
                    default: {
                        appenders: ['console'],
                        level: '${env:TEST_LOG_LEVEL}'
                    }
                }
            };

            expect(() => {
                logger.configure(config);
            }).not.toThrow();

            const testLogger = logger.getLogger('env-replace-test');
            testLogger.debug('Environment replacement test');
        });

        it('should handle missing environment variables gracefully', () => {
            const config = {
                appenders: {
                    console: {
                        type: 'console',
                        layout: {
                            type: 'pattern',
                            pattern: '${env:NONEXISTENT_VAR} - %m'
                        }
                    }
                },
                categories: {
                    default: {
                        appenders: ['console'],
                        level: 'info'
                    }
                }
            };

            expect(() => {
                logger.configure(config);
            }).not.toThrow();

            const testLogger = logger.getLogger('missing-env-test');
            testLogger.info('Missing environment variable test');
        });

        it('should replace command line arguments', () => {
            // Mock process.argv
            const originalArgv = process.argv;
            process.argv = ['node', 'script.js', '--logLevel=warn', '--appName=test'];

            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: {
                        appenders: ['console'],
                        level: '${args:logLevel}'
                    }
                }
            };

            expect(() => {
                logger.configure(config);
            }).not.toThrow();

            const testLogger = logger.getLogger('args-test');
            testLogger.warn('Command line args test');

            // Restore original argv
            process.argv = originalArgv;
        });
    });

    describe('Logger Categories', () => {
        it('should handle multiple categories with different levels', () => {
            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: {
                        appenders: ['console'],
                        level: 'info'
                    },
                    debug: {
                        appenders: ['console'],
                        level: 'debug'
                    },
                    error: {
                        appenders: ['console'],
                        level: 'error'
                    }
                }
            };

            logger.configure(config);

            const defaultLogger = logger.getLogger('default');
            const debugLogger = logger.getLogger('debug');
            const errorLogger = logger.getLogger('error');

            expect(() => {
                defaultLogger.info('Default category info');
                debugLogger.debug('Debug category debug');
                errorLogger.error('Error category error');
            }).not.toThrow();
        });

        it('should fall back to default category for unknown categories', () => {
            const config = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: {
                        appenders: ['console'],
                        level: 'info'
                    }
                }
            };

            logger.configure(config);

            const unknownLogger = logger.getLogger('unknown-category');

            expect(() => {
                unknownLogger.info('Unknown category test');
            }).not.toThrow();
        });
    });
});
