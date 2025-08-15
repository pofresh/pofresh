import { describe, it, expect } from 'vitest';
import Loader from '../index.js';

describe('Basic Loader Functionality', () => {
    it('should handle basic configuration', () => {
        const config = Loader.getConfig();
        expect(config).toBeDefined();
        expect(config.strictMode).toBe(false);
    });

    it('should update configuration', () => {
        Loader.updateConfig({
            maxCacheSize: 2000,
            strictMode: false
        });

        const config = Loader.getConfig();
        expect(config.maxCacheSize).toBe(2000);
    });

    it('should provide basic stats', () => {
        const stats = Loader.getStats();
        expect(stats).toBeDefined();
        expect(stats.load).toBeDefined();
        expect(stats.cache).toBeDefined();
    });

    it('should clear cache', () => {
        expect(() => {
            Loader.clearCache();
        }).not.toThrow();
    });

    it('should create secure context', () => {
        const context = { user: 'test', secret: 'password123' };
        const secureContext = Loader.createSecureContext(context);

        expect(secureContext.user).toBe('test');
        expect(secureContext.secret).toBeUndefined();
    });

    it('should validate paths with allowed paths', () => {
        const isValid = Loader.validatePath('./test/path', [process.cwd()]);
        expect(typeof isValid).toBe('object');
        expect(isValid.isValid).toBeDefined();
    });
});
