import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('globalChannel component', () => {
    let globalChannelComponent;
    let mockApp;

    beforeEach(async () => {
        // Mock app object
        mockApp = {
            set: vi.fn(),
            get: vi.fn()
        };

        // Mock the service
        vi.doMock('../../lib/service/globalChannelService', () => {
            return class MockGlobalChannelService {
                constructor(app, opts) {
                    this.app = app;
                    this.opts = opts;
                }
            };
        });

        // Import component after mocking
        globalChannelComponent = await import('../../lib/components/globalChannel.js');
    });

    it('should export a function', () => {
        expect(typeof globalChannelComponent.default).toBe('function');
    });

    it('should create and configure global channel service', () => {
        const opts = { testOption: 'value' };
        const service = globalChannelComponent.default(mockApp, opts);

        expect(service).toBeDefined();
        expect(service.name).toBe('__globalChannel__');
        expect(mockApp.set).toHaveBeenCalledWith('globalChannelService', service, true);
    });

    it('should pass app and options to service constructor', () => {
        const opts = { redis: { host: 'localhost' } };
        const service = globalChannelComponent.default(mockApp, opts);

        expect(service.app).toBe(mockApp);
        expect(service.opts).toBe(opts);
    });

    it('should return service instance', () => {
        const service = globalChannelComponent.default(mockApp, {});

        expect(service).toBeDefined();
        expect(typeof service).toBe('object');
        expect(service.name).toBe('__globalChannel__');
    });
});
