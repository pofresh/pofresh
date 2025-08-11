import { describe, it } from 'vitest';
import { expect } from 'vitest';
import serialFilter from '../../../lib/filters/handler/serial.js';
import FilterService from '../../../lib/common/service/filterService.js';

const mockSession = {
    key: '123'
};

const WAIT_TIME = 100;
describe('#serialFilter', () => {
    it('should do before filter ok', done => {
        const service = new FilterService();
        const filter = serialFilter();
        service.before(filter);

        service.beforeFilter(null, mockSession, () => {
            expect(mockSession).toBeDefined();

            expect(mockSession.__serialTask__).toBeDefined();
            done();
        });
    });

    it('should do after filter by doing before filter ok', done => {
        const service = new FilterService();
        const filter = serialFilter();
        let _session;
        service.before(filter);
        service.after(filter);

        service.beforeFilter(null, mockSession, () => {
            expect(mockSession).toBeDefined();
            expect(mockSession.__serialTask__).toBeDefined();
            _session = mockSession;
        });

        service.afterFilter(null, null, mockSession, null, () => {
            expect(mockSession).toBeDefined();
            // expect(mockSession).toBe(_session);
        });

        setTimeout(done, WAIT_TIME);
    });
});
