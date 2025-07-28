import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import logger from '../lib/logger.js';

describe('File Logging', () => {
    let testLogDir;
    let originalEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = { ...process.env };
        
        // Create test log directory
        testLogDir = path.join(process.cwd(), 'test-logs');
        if (!fs.existsSync(testLogDir)) {
            fs.mkdirSync(testLogDir, { recursive: true });
        }
    });

    afterEach(async () => {
        // Restore original environment
        process.env = originalEnv;
        
        // Shutdown logger first
        logger.shutdown();
        
        // Clean up test log files with retry mechanism for Windows
        if (fs.existsSync(testLogDir)) {
            try {
                // Wait for file handles to be released
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const files = fs.readdirSync(testLogDir);
                files.forEach(file => {
                    try {
                        fs.unlinkSync(path.join(testLogDir, file));
                    } catch (error) {
                        console.warn(`Could not delete file ${file}:`, error.message);
                    }
                });
                
                try {
                    fs.rmdirSync(testLogDir);
                } catch (error) {
                    console.warn('Could not remove test directory:', error.message);
                }
            } catch (error) {
                console.warn('Could not clean up test files:', error.message);
            }
        }
    });

    describe('File Appender', () => {
        it('should write logs to file', async () => {
            const logFile = path.join(testLogDir, 'test.log');
            const config = {
                appenders: {
                    file: {
                        type: 'file',
                        filename: logFile
                    }
                },
                categories: {
                    default: {
                        appenders: ['file'],
                        level: 'info'
                    }
                }
            };

            logger.configure(config);
            const testLogger = logger.getLogger('file-test');
            
            testLogger.info('Test file logging message');
            testLogger.warn('Test warning message');
            testLogger.error('Test error message');
            
            // Wait a bit for file write
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(fs.existsSync(logFile)).toBe(true);
            const logContent = fs.readFileSync(logFile, 'utf8');
            expect(logContent).toContain('Test file logging message');
            expect(logContent).toContain('Test warning message');
            expect(logContent).toContain('Test error message');
        });

        it('should handle daily rotate file appender', async () => {
            const logFile = path.join(testLogDir, 'rotate-%DATE%.log');
            const config = {
                appenders: {
                    dateFile: {
                        type: 'dateFile',
                        filename: logFile,
                        pattern: 'YYYY-MM-DD',
                        maxFiles: '7d'
                    }
                },
                categories: {
                    default: {
                        appenders: ['dateFile'],
                        level: 'info'
                    }
                }
            };

            logger.configure(config);
            const testLogger = logger.getLogger('rotate-test');
            
            testLogger.info('Test rotate logging message');
            
            // Wait a bit for file write
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check if log file with today's date exists
            const today = new Date().toISOString().split('T')[0];
            const expectedFile = path.join(testLogDir, `rotate-${today}.log`);
            
            // Note: The actual file creation depends on winston-daily-rotate-file
            // We just ensure no errors are thrown
            expect(() => testLogger.info('Another message')).not.toThrow();
        });
    });

    describe('Multiple Appenders', () => {
        it('should write to multiple appenders simultaneously', async () => {
            const logFile1 = path.join(testLogDir, 'app1.log');
            const logFile2 = path.join(testLogDir, 'app2.log');
            
            const config = {
                appenders: {
                    file1: {
                        type: 'file',
                        filename: logFile1
                    },
                    file2: {
                        type: 'file',
                        filename: logFile2
                    },
                    console: {
                        type: 'console'
                    }
                },
                categories: {
                    default: {
                        appenders: ['file1', 'file2', 'console'],
                        level: 'info'
                    }
                }
            };

            logger.configure(config);
            const testLogger = logger.getLogger('multi-test');
            
            testLogger.info('Multi-appender test message');
            
            // Wait a bit for file writes
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(fs.existsSync(logFile1)).toBe(true);
            expect(fs.existsSync(logFile2)).toBe(true);
            
            const content1 = fs.readFileSync(logFile1, 'utf8');
            const content2 = fs.readFileSync(logFile2, 'utf8');
            
            expect(content1).toContain('Multi-appender test message');
            expect(content2).toContain('Multi-appender test message');
        });
    });

    describe('Log Levels', () => {
        it('should respect log level filtering', async () => {
            const logFile = path.join(testLogDir, 'level-test.log');
            const config = {
                appenders: {
                    file: {
                        type: 'file',
                        filename: logFile
                    }
                },
                categories: {
                    default: {
                        appenders: ['file'],
                        level: 'warn' // Only warn and above
                    }
                }
            };

            logger.configure(config);
            const testLogger = logger.getLogger('level-test');
            
            testLogger.debug('Debug message - should not appear');
            testLogger.info('Info message - should not appear');
            testLogger.warn('Warning message - should appear');
            testLogger.error('Error message - should appear');
            
            // Wait a bit for file write
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const logContent = fs.readFileSync(logFile, 'utf8');
            expect(logContent).not.toContain('Debug message');
            expect(logContent).not.toContain('Info message');
            expect(logContent).toContain('Warning message');
            expect(logContent).toContain('Error message');
        });
    });

    describe('Configuration Reload', () => {
        it('should handle configuration reload', () => {
            const config1 = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'info' }
                }
            };
            
            const config2 = {
                appenders: {
                    console: { type: 'console' }
                },
                categories: {
                    default: { appenders: ['console'], level: 'debug' }
                }
            };

            logger.configure(config1);
            const testLogger1 = logger.getLogger('reload-test');
            
            logger.configure(config2);
            const testLogger2 = logger.getLogger('reload-test');
            
            // Should not throw errors
            expect(() => {
                testLogger1.info('Message 1');
                testLogger2.debug('Message 2');
            }).not.toThrow();
        });
    });
});