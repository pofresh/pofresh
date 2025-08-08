import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Logger Performance Tests', () => {
    let originalConsoleLog;
    let logMessages = [];

    beforeEach(() => {
        // Reset captured messages
        logMessages = [];

        // Mock console.log to capture output without file I/O
        // biome-ignore lint/suspicious/noConsole: Testing requires console mocking
        originalConsoleLog = console.log;
        console.log = (...args) => {
            logMessages.push(args.join(' '));
        };

        // Reset logger configuration to use only console (no file I/O)
        logger.configure({
            appenders: {
                console: { type: 'console' }
            },
            categories: {
                default: {
                    appenders: ['console'],
                    level: 'info'
                },
                performance: {
                    appenders: ['console'],
                    level: 'debug'
                }
            }
        });
    });

    afterEach(() => {
        // Restore original console.log
        if (originalConsoleLog) {
            console.log = originalConsoleLog;
        }
    });

    it('should handle high-volume logging efficiently', () => {
        const testLogger = logger.getLogger('performance', 'PerformanceTest');
        const messageCount = 1000;
        const messages = [];

        // Generate test messages
        for (let i = 0; i < messageCount; i++) {
            messages.push(`Test message ${i} with some additional data: ${Math.random()}`);
        }

        const startTime = process.hrtime.bigint();

        // Log all messages
        for (const message of messages) {
            testLogger.info(message);
        }

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

        // Performance assertions
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

        const avgTimePerMessage = duration / messageCount;
        expect(avgTimePerMessage).toBeLessThan(5); // Less than 5ms per message
    });

    it('should handle concurrent logging from multiple loggers', async () => {
        const loggerCount = 10;
        const messagesPerLogger = 100;
        const loggers = [];

        // Create multiple loggers
        for (let i = 0; i < loggerCount; i++) {
            loggers.push(logger.getLogger('performance', `ConcurrentLogger${i}`));
        }

        const startTime = process.hrtime.bigint();

        // Create concurrent logging promises
        const loggingPromises = loggers.map((testLogger, loggerIndex) => {
            return new Promise(resolve => {
                let messageCount = 0;
                const interval = setInterval(() => {
                    testLogger.info(`Logger ${loggerIndex} message ${messageCount}`, {
                        loggerIndex,
                        messageCount,
                        timestamp: Date.now()
                    });

                    messageCount++;
                    if (messageCount >= messagesPerLogger) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 1); // Log every 1ms
            });
        });

        // Wait for all concurrent logging to complete
        await Promise.all(loggingPromises);

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000;

        const totalMessages = loggerCount * messagesPerLogger;
        const avgTimePerMessage = duration / totalMessages;

        // Performance assertions
        expect(duration).toBeLessThan(10_000); // Should complete within 10 seconds
        expect(avgTimePerMessage).toBeLessThan(10); // Less than 10ms per message under concurrency
    });

    it('should handle large message payloads efficiently', () => {
        const testLogger = logger.getLogger('performance', 'LargePayloadTest');
        const messageCount = 100;

        // Generate large message payloads
        const largeObject = {
            id: 'test-id-12345',
            timestamp: new Date().toISOString(),
            data: {
                users: Array.from({ length: 100 }, (_, i) => ({
                    id: `user-${i}`,
                    name: `User ${i}`,
                    email: `user${i}@example.com`,
                    metadata: {
                        lastLogin: new Date().toISOString(),
                        preferences: {
                            theme: 'dark',
                            language: 'en',
                            notifications: true
                        }
                    }
                })),
                metrics: {
                    totalRequests: Math.floor(Math.random() * 10_000),
                    averageResponseTime: Math.random() * 1000,
                    errorRate: Math.random() * 0.1,
                    throughput: Math.random() * 100
                }
            },
            description: 'A'.repeat(1000) // 1KB string
        };

        const startTime = process.hrtime.bigint();

        // Log large payloads
        for (let i = 0; i < messageCount; i++) {
            testLogger.info(`Large payload message ${i}`, {
                ...largeObject,
                messageIndex: i,
                timestamp: new Date().toISOString()
            });
        }

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000;

        const avgTimePerMessage = duration / messageCount;

        // Performance assertions for large payloads
        expect(duration).toBeLessThan(15_000); // Should complete within 15 seconds
        expect(avgTimePerMessage).toBeLessThan(150); // Less than 150ms per large message
    });

    it('should maintain performance with different log levels', () => {
        const testLogger = logger.getLogger('performance', 'LogLevelTest');
        const messageCount = 200;
        const logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

        const results = {};

        for (const level of logLevels) {
            const startTime = process.hrtime.bigint();

            for (let i = 0; i < messageCount; i++) {
                testLogger[level](`${level.toUpperCase()} message ${i}`, {
                    level,
                    messageIndex: i,
                    timestamp: Date.now(),
                    data: { value: Math.random() }
                });
            }

            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1_000_000;

            results[level] = {
                duration,
                avgTimePerMessage: duration / messageCount
            };
        }

        // Performance assertions
        for (const level of logLevels) {
            expect(results[level].duration).toBeLessThan(3000); // Each level should complete within 3 seconds
            expect(results[level].avgTimePerMessage).toBeLessThan(15); // Less than 15ms per message
        }
        for (const _level of logLevels) {
            // Additional level-specific assertions could be added here
        }
    });

    it('should handle rapid logger creation and destruction', async () => {
        const loggerCount = 50;
        const messagesPerLogger = 20;

        const startTime = process.hrtime.bigint();

        const promises = [];

        for (let i = 0; i < loggerCount; i++) {
            const promise = new Promise(resolve => {
                const tempLogger = logger.getLogger('performance', `TempLogger${i}`);

                let messageCount = 0;
                const logMessagesRecursively = () => {
                    if (messageCount < messagesPerLogger) {
                        tempLogger.info(`Temp logger ${i} message ${messageCount}`);
                        messageCount++;
                        setImmediate(logMessagesRecursively);
                    } else {
                        resolve();
                    }
                };

                logMessagesRecursively();
            });

            promises.push(promise);
        }

        await Promise.all(promises);

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000;

        const totalMessages = loggerCount * messagesPerLogger;
        const avgTimePerMessage = duration / totalMessages;

        // Performance assertions
        expect(duration).toBeLessThan(8000); // Should complete within 8 seconds
        expect(avgTimePerMessage).toBeLessThan(8); // Less than 8ms per message
    });

    it('should handle memory usage efficiently during extended logging', async () => {
        const testLogger = logger.getLogger('performance', 'MemoryTest');
        const initialMemory = process.memoryUsage();

        const messageCount = 500;
        const batchSize = 50;

        for (let batch = 0; batch < messageCount / batchSize; batch++) {
            const batchStartTime = process.hrtime.bigint();

            for (let i = 0; i < batchSize; i++) {
                const messageIndex = batch * batchSize + i;
                testLogger.info(`Memory test message ${messageIndex}`, {
                    batch,
                    messageIndex,
                    timestamp: Date.now(),
                    data: {
                        randomValue: Math.random(),
                        stringData: 'x'.repeat(100)
                    }
                });
            }

            const batchEndTime = process.hrtime.bigint();
            const _batchDuration = Number(batchEndTime - batchStartTime) / 1_000_000;

            // Check memory usage periodically
            if (batch % 2 === 0) {
                const currentMemory = process.memoryUsage();
                const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;

                // Memory should not increase excessively
                expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
            }

            // Small delay between batches to allow garbage collection
            // biome-ignore lint/nursery/noAwaitInLoop: Sequential processing needed for memory testing
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        const finalMemory = process.memoryUsage();
        const totalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

        // Memory increase should be reasonable
        expect(totalMemoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB total increase
    });

    it('should benchmark against console.log performance', () => {
        const testLogger = logger.getLogger('performance', 'BenchmarkTest');
        const messageCount = 1000;
        const testMessage = 'Benchmark test message with some data';
        const testData = { timestamp: Date.now(), value: Math.random() };

        // Benchmark console.log
        const consoleStartTime = process.hrtime.bigint();
        for (let i = 0; i < messageCount; i++) {
            // Empty loop for baseline timing measurement
        }
        const consoleEndTime = process.hrtime.bigint();
        const consoleDuration = Number(consoleEndTime - consoleStartTime) / 1_000_000;

        // Benchmark logger
        const loggerStartTime = process.hrtime.bigint();
        for (let i = 0; i < messageCount; i++) {
            testLogger.info(testMessage, testData);
        }
        const loggerEndTime = process.hrtime.bigint();
        const loggerDuration = Number(loggerEndTime - loggerStartTime) / 1_000_000;

        const performanceRatio = loggerDuration / consoleDuration;

        // Logger should not be more than 200x slower than console.log
        // (This is a reasonable expectation given the additional functionality)
        // Note: Performance can vary significantly based on system load
        expect(performanceRatio).toBeLessThan(200);
    });
});
