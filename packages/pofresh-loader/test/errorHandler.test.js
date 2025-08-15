import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LoaderError, ErrorHandler, ERROR_CODES } from '../lib/util/errorHandler.js';

describe('ErrorHandler', () => {
    let errorHandler;

    beforeEach(() => {
        errorHandler = new ErrorHandler({
            logger: console,
            enableRecovery: true,
            enableLogging: false // Disable logging for tests
        });
    });

    afterEach(() => {
        errorHandler.clearHistory();
    });

    describe('LoaderError', () => {
        it('should create LoaderError with proper structure', () => {
            const error = new LoaderError('Test message', 'TEST_CODE', { detail: 'test' });

            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('LoaderError');
            expect(error.message).toBe('Test message');
            expect(error.code).toBe('TEST_CODE');
            expect(error.details).toEqual({ detail: 'test' });
            expect(typeof error.timestamp).toBe('number');
            expect(error.stack).toBeDefined();
        });

        it('should serialize to JSON correctly', () => {
            const error = new LoaderError('Test message', 'TEST_CODE', { detail: 'test' });
            const json = error.toJSON();

            expect(json.name).toBe('LoaderError');
            expect(json.message).toBe('Test message');
            expect(json.code).toBe('TEST_CODE');
            expect(json.details).toEqual({ detail: 'test' });
        });
    });

    describe('handleError', () => {
        it('should handle string error', () => {
            const result = errorHandler.handleError('Test error', 'TEST_ERROR');

            expect(result.error).toBeInstanceOf(LoaderError);
            expect(result.error.message).toBe('Test error');
            expect(result.error.code).toBe('TEST_ERROR');
            expect(result.handled).toBe(true);
        });

        it('should handle Error object', () => {
            const originalError = new Error('Original error');
            const result = errorHandler.handleError(originalError, 'ORIGINAL_ERROR');

            expect(result.error).toBeInstanceOf(LoaderError);
            expect(result.error.message).toBe('Original error');
            expect(result.error.details.originalError).toBeDefined();
        });

        it('should handle LoaderError object', () => {
            const loaderError = new LoaderError('Loader error', 'LOADER_ERROR');
            const result = errorHandler.handleError(loaderError);

            expect(result.error).toBe(loaderError);
            expect(result.handled).toBe(true);
        });

        it('should provide recovery for recoverable errors', () => {
            const result = errorHandler.handleError(
                'File not found',
                'FS_FILE_NOT_FOUND',
                {},
                { recoveryStrategy: 'skip' }
            );

            expect(result.recovered).toBe(true);
            expect(result.recoveryResult.strategy).toBe('skip');
        });

        it('should not recover from critical errors', () => {
            const result = errorHandler.handleError('Critical error', 'SECURITY_PATH_VIOLATION');

            expect(result.recovered).toBe(false);
            expect(result.shouldContinue).toBe(false);
        });

        it('should update metrics', () => {
            errorHandler.handleError('Test error', 'TEST_ERROR');
            const metrics = errorHandler.getMetrics();

            expect(metrics.totalErrors).toBe(1);
            expect(metrics.errorsByCode.get('TEST_ERROR')).toBe(1);
        });
    });

    describe('recovery strategies', () => {
        it('should handle retry strategy', () => {
            const result = errorHandler.handleError(
                'Network error',
                'FS_READ_ERROR',
                {},
                { recoveryStrategy: 'retry' }
            );

            expect(result.recoveryResult.strategy).toBe('retry');
            expect(result.recoveryResult.maxRetries).toBe(3);
        });

        it('should handle fallback strategy with function', () => {
            const fallback = vi.fn(() => ({ fallback: true }));
            const result = errorHandler.handleError(
                'Module load failed',
                'MODULE_LOAD_FAILED',
                {},
                { recoveryStrategy: 'fallback', fallback }
            );

            expect(fallback).toHaveBeenCalled();
            expect(result.recovered).toBe(true);
            expect(result.recoveryResult.result).toEqual({ fallback: true });
        });

        it('should handle skip strategy', () => {
            const result = errorHandler.handleError(
                'Warning',
                'MODULE_NAME_CONFLICT',
                {},
                { recoveryStrategy: 'skip' }
            );

            expect(result.recovered).toBe(true);
            expect(result.recoveryResult.strategy).toBe('skip');
        });
    });

    describe('error classification', () => {
        it('should correctly classify error severity', () => {
            const critical = errorHandler.handleError('Critical', 'SECURITY_PATH_VIOLATION');
            expect(critical.severity).toBe('critical');

            const error = errorHandler.handleError('Error', 'FS_PATH_NOT_FOUND');
            expect(error.severity).toBe('error');

            const warning = errorHandler.handleError('Warning', 'CACHE_MEMORY_LIMIT');
            expect(warning.severity).toBe('warning');
        });
    });

    describe('metrics', () => {
        it('should track recovery rate', () => {
            errorHandler.handleError('Error 1', 'FS_FILE_NOT_FOUND', {}, { recoveryStrategy: 'skip' });
            errorHandler.handleError('Error 2', 'FS_FILE_NOT_FOUND', {}, { recoveryStrategy: 'skip' });
            errorHandler.handleError('Error 3', 'FS_FILE_NOT_FOUND'); // Gets default recovery strategy

            const metrics = errorHandler.getMetrics();
            // All three errors get recovery attempts (FS_FILE_NOT_FOUND has default 'skip' strategy)
            expect(metrics.recoveryAttempts).toBe(3);
            // All skip strategies succeed
            expect(metrics.recoverySuccesses).toBe(3);
            expect(metrics.recoveryRate).toBe(1);
        });

        it('should clear history', () => {
            errorHandler.handleError('Test', 'TEST_ERROR');
            expect(errorHandler.getMetrics().totalErrors).toBe(1);

            errorHandler.clearHistory();
            expect(errorHandler.getMetrics().totalErrors).toBe(0);
        });
    });
});
