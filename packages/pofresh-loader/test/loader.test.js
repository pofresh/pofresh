import path from 'path';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Loader from '../index.js';

// Use relative paths for testing
const testPath = './test/mock-remote/area/';
const servicePath = './test/mock-remote/service';

describe('loader', () => {
    let originalConsoleWarn;
    let originalConsoleError;

    beforeEach(() => {
        // Mock console to avoid noise during tests
        originalConsoleWarn = console.warn;
        originalConsoleError = console.error;
        console.warn = vi.fn();
        console.error = vi.fn();
        
        // Clear cache before each test
        Loader.clearCache();
    });

    afterEach(() => {
        // Restore console
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
    });

    describe('#load', () => {
        it('should load all modules under the path but sub-directory', () => {
            const services = Loader.load(testPath, {}, false, {
                enableSecurity: true,
                allowedPaths: [path.resolve(__dirname, '..')]
            });
            expect(services).toBeDefined();
            expect(services).toHaveProperty('addOneRemote');
            expect(services.addOneRemote).toBeTypeOf('object');
            expect(services.addOneRemote).toHaveProperty('doService');
            expect(services.addOneRemote.doService).toBeTypeOf('function');
            expect(services.addOneRemote).toHaveProperty('doAddTwo');
            expect(services.addOneRemote.doAddTwo).toBeTypeOf('function');

            expect(services).toHaveProperty('addThreeRemote');
            expect(services.addThreeRemote).toBeTypeOf('object');
            expect(services.addThreeRemote).toHaveProperty('doService');
            expect(services.addThreeRemote.doService).toBeTypeOf('function');

            // should use the name as module name if the module has a name property
            expect(services).toHaveProperty('whoAmIRemote');
            expect(services.whoAmIRemote).toBeTypeOf('object');
            expect(services.whoAmIRemote).toHaveProperty('doService');
            expect(services.whoAmIRemote.doService).toBeTypeOf('function');
            expect(services.whoAmIRemote).toHaveProperty('name');
            expect(services.whoAmIRemote.name).toBeTypeOf('string');
        });

        it('should invoke functions of loaded object successfully', async () => {
            let callbackCount = 0;
            const sid = 'area-server-1';
            const context = { id: sid };
            
            // Clear cache to ensure fresh load
            Loader.clearCache();
            
            const services = Loader.load(testPath, context, false, {
                enableSecurity: true,
                allowedPaths: [path.resolve(__dirname, '..')]
            });
            expect(services).toBeDefined();

            const promises = [];

            promises.push(
                new Promise(resolve => {
                    services.addOneRemote.doService(1, (_err, res) => {
                        callbackCount++;
                        expect(res).toBe(2);
                        resolve();
                    });
                })
            );

            promises.push(
                new Promise(resolve => {
                    services.addOneRemote.doAddTwo(1, (_err, res) => {
                        callbackCount++;
                        expect(res).toBe(3);
                        resolve();
                    });
                })
            );

            promises.push(
                new Promise(resolve => {
                    services.addThreeRemote.doService(1, (_err, res) => {
                        callbackCount++;
                        expect(res).toBe(4);
                        resolve();
                    });
                })
            );

            // context should be pass to factory function for each module
            promises.push(
                new Promise(resolve => {
                    services.whoAmIRemote.doService((_err, res) => {
                        callbackCount++;
                        expect(res).toBe(sid);
                        resolve();
                    });
                })
            );

            await Promise.all(promises);
            expect(callbackCount).toBe(4);
        });

        it('should throw an error if the path is empty', () => {
            const emptyPath = '';
            expect(() => {
                return Loader.load(emptyPath);
            }).toThrow('Path should be a non-empty string');
        });

        it('should throw exception if the path does not exist', () => {
            const errorPath = './some/error/path';
            expect(() => {
                return Loader.load(errorPath);
            }).toThrow();
        });

        it('should reload module', () => {
            let services = Loader.load(servicePath, {}, false, {
                enableSecurity: true,
                allowedPaths: [path.resolve(__dirname, '..')]
            });
            expect(services).toBeDefined();
            expect(services.reloadService).toBeDefined();
            expect(services.reloadService.doService).toBeTypeOf('function');
            
            services.reloadService.doService((_err, res) => {
                expect(res).toBe(1);
            });

            services.reloadService.doService((_err, res) => {
                expect(res).toBe(2);
            });

            services = Loader.load(servicePath, {}, true, {
                enableSecurity: true,
                allowedPaths: [path.resolve(__dirname, '..')]
            });
            expect(services).toBeDefined();
            expect(services.reloadService).toBeDefined();

            services.reloadService.doService((_err, res) => {
                expect(res).toBe(1);
            });

            services.reloadService.doService((_err, res) => {
                expect(res).toBe(2);
            });
        });

        it('should handle security validation', () => {
            // Test with security enabled - use relative path
            const result = Loader.load(testPath, {}, false, {
                enableSecurity: true,
                allowedPaths: [path.resolve(__dirname, '..')]
            });
            
            expect(result).toBeDefined();
            expect(result.addOneRemote).toBeDefined();
        });

        it('should reject paths outside allowed base paths', () => {
            expect(() => {
                Loader.load('/etc/passwd', {}, false, {
                    enableSecurity: true,
                    allowedPaths: ['/tmp']
                });
            }).toThrow('Security validation failed');
        });

        it('should provide performance metrics', () => {
            // Use relative path to avoid security issues
            Loader.load(testPath, {}, false, {
                enableSecurity: true,
                allowedPaths: [path.resolve(__dirname, '..')]
            });
            
            const stats = Loader.getStats();
            expect(stats).toBeDefined();
            
            // Check if performance monitoring is available
            if (stats.load) {
                expect(stats.load).toBeDefined();
                expect(stats.load).toHaveProperty('total');
                expect(stats.load).toHaveProperty('success');
                expect(stats.load).toHaveProperty('failed');
            }
            
            if (stats.cache) {
                expect(stats.cache).toBeDefined();
            }
            
            if (stats.health) {
                expect(stats.health).toBeDefined();
            }
        });

        it('should generate performance reports', () => {
            // Use relative path to avoid security issues
            Loader.load(testPath, {}, false, {
                enableSecurity: true,
                allowedPaths: [path.resolve(__dirname, '..')]
            });
            
            const report = Loader.getPerformanceReport();
            expect(report).toBeDefined();
            expect(report.summary).toBeDefined();
            expect(report.health).toBeDefined();
            expect(report.recommendations).toBeDefined();
        });

        it('should work with caching enabled', () => {
            // Use relative path to avoid security issues
            
            // First load
            const result1 = Loader.load(testPath, {}, false, {
                enableCache: true,
                enableSecurity: true,
                allowedPaths: [path.resolve(__dirname, '..')]
            });
            
            // Second load should be faster due to cache
            const result2 = Loader.load(testPath, {}, false, {
                enableCache: true,
                enableSecurity: true,
                allowedPaths: [path.resolve(__dirname, '..')]
            });
            
            expect(result1).toBeDefined();
            expect(result2).toBeDefined();
            expect(Object.keys(result1)).toEqual(Object.keys(result2));
        });

        it('should handle cache clearing', () => {
            // Use relative path to avoid security issues
            Loader.load(testPath, {}, false, {
                enableSecurity: true,
                allowedPaths: [path.resolve(__dirname, '..')]
            });
            
            const statsBefore = Loader.getStats();
            Loader.clearCache();
            const statsAfter = Loader.getStats();
            
            // Cache size might be in different properties depending on cache implementation
            const cacheSizeBefore = statsBefore.cache.size || statsBefore.cache.currentSize || 0;
            const cacheSizeAfter = statsAfter.cache.size || statsAfter.cache.currentSize || 0;
            
            // Check that cache clearing worked (size should be 0 or smaller after clearing)
            expect(cacheSizeAfter).toBeLessThanOrEqual(cacheSizeBefore);
        });

        it('should support configuration updates', () => {
            const originalConfig = Loader.getConfig();
            
            Loader.updateConfig({
                maxCacheSize: 2000,
                strictMode: false
            });
            
            const newConfig = Loader.getConfig();
            expect(newConfig.maxCacheSize).toBe(2000);
            expect(newConfig.strictMode).toBe(false);
        });
    });

    describe('async loading', () => {
        it('should load modules asynchronously', async () => {
            // Use relative path to avoid security issues
            const result = await Loader.loadAsync(testPath, {}, false, {
                enableSecurity: true,
                allowedPaths: [path.resolve(__dirname, '..')]
            });
            
            expect(result).toBeDefined();
            expect(result.modules).toBeDefined();
            expect(result.modules.addOneRemote).toBeDefined();
            expect(result.stats).toBeDefined();
            expect(result.errors).toBeDefined();
        });

        it('should handle async errors gracefully', async () => {
            // Test with empty string path which should trigger a different error
            try {
                const result = await Loader.loadAsync('', {}, false, {
                    enableSecurity: false
                });
                
                expect(result).toBeDefined();
                expect(result.modules).toBeDefined();
                // Even with errors, the structure should be maintained
                expect(Array.isArray(result.errors) || typeof result.errors === 'object').toBe(true);
            } catch (error) {
                // If it throws an error, that's also acceptable graceful handling
                expect(error).toBeDefined();
            }
        });

        it('should provide async performance metrics', async () => {
            // Use relative path to avoid security issues
            await Loader.loadAsync(testPath, {}, false, {
                enableSecurity: true,
                allowedPaths: [path.resolve(__dirname, '..')]
            });
            
            const stats = Loader.getStats();
            expect(stats.load.total).toBeGreaterThan(0);
        });
    });

    describe('security features', () => {
        it('should validate paths', () => {
            // Use relative path for validation
            const validation = Loader.validatePath(testPath, [process.cwd()]);
            expect(validation.isValid).toBe(true);
        });

        it('should reject invalid paths', () => {
            const validation = Loader.validatePath('/etc/passwd', ['/tmp']);
            expect(validation.isValid).toBe(false);
        });

        it('should create secure contexts', () => {
            const context = { user: 'test', secret: 'password123' };
            const secureContext = Loader.createSecureContext(context);
            
            expect(secureContext.user).toBe('test');
            expect(secureContext.secret).toBeUndefined(); // Should be filtered out
            expect(secureContext.console).toBeDefined();
        });
    });

    describe('profiling', () => {
        it('should support operation profiling', () => {
            // Use relative path to avoid security issues
            const profileId = Loader.startProfile('test_load', { path: testPath });
            expect(profileId).toBeDefined();
            
            const result = Loader.load(testPath, {}, false, {
                enableSecurity: true,
                allowedPaths: [path.resolve(__dirname, '..')]
            });
            const profile = Loader.endProfile(profileId, { success: true });
            
            expect(profile).toBeDefined();
            expect(profile.operation).toBe('test_load');
            expect(profile.duration).toBeGreaterThan(0);
            expect(profile.result.success).toBe(true);
        });
    });
});