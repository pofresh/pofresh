import { describe, expect, it } from 'vitest';
import FilterService from '../../../lib/common/service/filterService.js';
import timeoutFilter from '../../../lib/filters/handler/timeout.js';

const mockSession = {
    key: '123'
};

const WAIT_TIME = 100;
describe('#serialFilter', () => {
    it('should do before filter ok', done => {
        const service = new FilterService();
        const filter = timeoutFilter();
        service.before(filter);

        service.beforeFilter({}, mockSession, () => {
            expect(mockSession).toBeDefined();

            expect(mockSession.__timeout__).toBeDefined();
            done();
        });
    });

    it('should do after filter by doing before filter ok', done => {
        const service = new FilterService();
        const filter = timeoutFilter();
        let _session;
        service.before(filter);

        service.beforeFilter(null, mockSession, () => {
            expect(mockSession).toBeDefined();
            expect(mockSession.__timeout__).toBeDefined();
            _session = mockSession;
        });

        service.after(filter);

        service.afterFilter(null, null, mockSession, null, () => {
            expect(mockSession).toBeDefined();
            expect(mockSession).toBe(_session);
        });

        setTimeout(done, WAIT_TIME);
    });
});
