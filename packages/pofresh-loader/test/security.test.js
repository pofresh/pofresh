import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecurityValidator, SECURITY_CONFIG } from '../lib/util/security.js';

describe('SecurityValidator', () => {
    let securityValidator;
    const testDir = '/tmp/test';

    beforeEach(() => {
        securityValidator = new SecurityValidator({
            allowedBasePaths: ['/tmp', '/app/modules'],
            strictMode: true
        });
    });

    afterEach(() => {
        // Reset stats
        securityValidator.getStats();
    });

    describe('path validation', () => {
        it('should validate valid paths', () => {
            const result = securityValidator.validatePath('/tmp/module.js', {
                allowedBasePaths: ['/tmp']
            });

            expect(result.isValid).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        it('should reject path traversal attempts', () => {
            const result = securityValidator.validatePath('/tmp/../etc/passwd');

            expect(result.isValid).toBe(false);
            expect(result.violations.some(v => v.code === 'PATH_TRAVERSAL')).toBe(true);
        });

        it('should reject absolute paths when not allowed', () => {
            const result = securityValidator.validatePath('/etc/module.js');

            expect(result.isValid).toBe(false);
            expect(result.violations.some(v => v.code === 'ABSOLUTE_PATH')).toBe(true);
        });

        it('should reject invalid file extensions', () => {
            const result = securityValidator.validatePath('/tmp/module.txt');

            expect(result.isValid).toBe(false);
            expect(result.violations.some(v => v.code === 'INVALID_EXTENSION')).toBe(true);
        });

        it('should validate allowed base paths', () => {
            const result = securityValidator.validatePath('/app/modules/user.js', {
                allowedBasePaths: ['/app/modules']
            });

            expect(result.isValid).toBe(true);
        });

        it('should reject paths outside allowed base paths', () => {
            const result = securityValidator.validatePath('/tmp/other.js', {
                allowedBasePaths: ['/app/modules']
            });

            expect(result.isValid).toBe(false);
            expect(result.violations.some(v => v.code === 'PATH_NOT_ALLOWED')).toBe(true);
        });

        it('should handle empty paths', () => {
            const result = securityValidator.validatePath('');

            expect(result.isValid).toBe(false);
            expect(result.violations.some(v => v.code === 'INVALID_PATH_TYPE')).toBe(true);
        });
    });

    describe('content validation', () => {
        it('should validate safe JavaScript content', () => {
            const safeContent = `
                function safeFunction() {
                    const x = 1;
                    return x + 1;
                }
                module.exports = { safeFunction };
            `;

            const result = securityValidator.validateContent(safeContent, '/tmp/safe.js');

            expect(result.isValid).toBe(true);
        });

        it('should detect forbidden patterns', () => {
            const dangerousContent = `
                const fs = require('fs');
                function dangerous() {
                    fs.readFileSync('/etc/passwd');
                }
            `;

            const result = securityValidator.validateContent(dangerousContent, '/tmp/dangerous.js');

            expect(result.isValid).toBe(false);
            expect(result.violations.some(v => v.code === 'FORBIDDEN_PATTERN')).toBe(true);
        });

        it('should detect eval usage', () => {
            const evalContent = 'const result = eval("2 + 2");';

            const result = securityValidator.validateContent(evalContent, '/tmp/eval.js');

            expect(result.isValid).toBe(false);
            expect(result.violations.some(v => v.code === 'FORBIDDEN_PATTERN')).toBe(true);
        });

        it('should detect Function constructor usage', () => {
            const funcContent = 'const func = new Function("return 2 + 2");';

            const result = securityValidator.validateContent(funcContent, '/tmp/func.js');

            expect(result.isValid).toBe(false);
            expect(result.violations.some(v => v.code === 'FORBIDDEN_PATTERN')).toBe(true);
        });

        it('should check file size limits', () => {
            const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB

            const result = securityValidator.validateContent(largeContent, '/tmp/large.js');

            expect(result.isValid).toBe(false);
            expect(result.violations.some(v => v.code === 'FILE_TOO_LARGE')).toBe(true);
        });

        it('should validate JavaScript syntax', () => {
            const invalidSyntax = 'function broken( { return x; }'; // Missing closing parenthesis

            const result = securityValidator.validateContent(invalidSyntax, '/tmp/invalid.js');

            expect(result.isValid).toBe(false);
            expect(result.violations.some(v => v.code === 'SYNTAX_ERROR')).toBe(true);
        });
    });

    describe('module validation', () => {
        it('should validate safe module objects', () => {
            const safeModule = {
                safeFunction: () => 'safe',
                safeValue: 42
            };

            const result = securityValidator.validateModule(safeModule, '/tmp/safe.js');

            expect(result.isValid).toBe(true);
        });

        it('should detect modules with dangerous properties', () => {
            const dangerousModule = {
                normal: 'value',
                constructor: function () {
                    /* dangerous */
                }
            };

            const result = securityValidator.validateModule(dangerousModule, '/tmp/dangerous.js');

            expect(result.isValid).toBe(false);
            expect(result.violations.some(v => v.code === 'DANGEROUS_PROPERTY')).toBe(true);
        });

        it('should validate function modules', () => {
            const safeFunction = context => {
                return { result: 'safe' };
            };

            const result = securityValidator.validateModule(safeFunction, '/tmp/safe.js');

            expect(result.isValid).toBe(true);
        });
    });

    describe('secure context creation', () => {
        it('should create secure context with safe globals', () => {
            const context = { user: 'test', secret: 'password123' };
            const secureContext = securityValidator.createSecureContext(context);

            expect(secureContext.console).toBeDefined();
            expect(secureContext.Math).toBeDefined();
            expect(secureContext.JSON).toBeDefined();
            expect(secureContext.user).toBe('test');
            expect(secureContext.secret).toBeUndefined(); // Should be filtered out
        });

        it('should freeze context in strict mode', () => {
            const context = { user: 'test' };
            const secureContext = securityValidator.createSecureContext(context);

            expect(() => {
                secureContext.newProperty = 'test';
            }).toThrow();
        });
    });

    describe('statistics', () => {
        it('should track validation statistics', () => {
            securityValidator.validatePath('/tmp/safe.js');
            securityValidator.validatePath('/tmp/../dangerous.js');

            const stats = securityValidator.getStats();

            expect(stats.totalValidations).toBe(2);
            expect(stats.passedValidations).toBe(1);
            expect(stats.failedValidations).toBe(1);
            expect(stats.passRate).toBe(0.5);
        });

        it('should track violations by type', () => {
            securityValidator.validatePath('/tmp/../dangerous.js');
            securityValidator.validatePath('/etc/module.js');

            const stats = securityValidator.getStats();
            const violations = stats.violationsByType;

            expect(violations['PATH_TRAVERSAL']).toBe(1);
            expect(violations['ABSOLUTE_PATH']).toBe(1);
        });
    });

    describe('configuration', () => {
        it('should use custom configuration', () => {
            const customValidator = new SecurityValidator({
                allowedExtensions: ['.js', '.json'],
                maxFileSize: 500,
                strictMode: false
            });

            const result = customValidator.validateContent('x'.repeat(600), '/tmp/test.json');

            expect(result.isValid).toBe(true); // Should allow .json extension
            expect(result.details.size).toBe(600);

            customValidator.getStats(); // Reset for cleanup
        });
    });

    describe('edge cases', () => {
        it('should handle null and undefined content', () => {
            const result = securityValidator.validateContent(null, '/tmp/null.js');

            expect(result.isValid).toBe(true);
            expect(result.details.size).toBe(0);
        });

        it('should handle very long lines', () => {
            const longLine = 'x'.repeat(300) + '; // Long line comment';
            const content = longLine + '\n' + 'console.log("test");';

            const result = securityValidator.validateContent(content, '/tmp/longline.js');

            expect(result.isValid).toBe(true);
            expect(result.violations.some(v => v.code === 'LONG_LINES')).toBe(true);
        });

        it('should detect deeply nested code', () => {
            const nestedCode = `
                function level1() {
                    if (true) {
                        if (true) {
                            if (true) {
                                if (true) {
                                    if (true) {
                                        if (true) {
                                            return 'deep';
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `;

            const result = securityValidator.validateContent(nestedCode, '/tmp/nested.js');

            expect(result.violations.some(v => v.code === 'DEEP_NESTING')).toBe(true);
        });
    });
});
