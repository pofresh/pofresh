import { describe, expect, it } from 'vitest';
import FilterService from '../../../lib/common/service/filterService.js';
import serialFilter from '../../../lib/filters/handler/serial.js';

const mockSession = {
    key: '123'
};

const WAIT_TIME = 100;
describe('#serialFilter', () => {
    it('should do before filter ok', async () => {
        const service = new FilterService();
        const filter = serialFilter();
        service.before(filter);

        service.beforeFilter(null, mockSession, () => {
            expect(mockSession).toBeDefined();
            expect(mockSession.__serialTask__).toBeDefined();
        });
    });

    it('should do after filter by doing before filter ok', async () => {
        const service = new FilterService();
        const filter = serialFilter();
        let _session;
        service.before(filter);
        service.after(filter);

        await new Promise(resolve => {
            service.beforeFilter(null, mockSession, () => {
                expect(mockSession).toBeDefined();
                expect(mockSession.__serialTask__).toBeDefined();
                _session = mockSession;
            });

            service.afterFilter(null, null, mockSession, null, () => {
                expect(mockSession).toBeDefined();
                // expect(mockSession).toBe(_session);
                resolve();
            });
        });
    });
});
