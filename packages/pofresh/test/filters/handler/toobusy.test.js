import { describe, expect, it } from 'vitest';
import FilterService from '../../../lib/common/service/filterService.js';
import toobusyFilter from '../../../lib/filters/handler/toobusy.js';

const mockSession = {
    key: '123'
};

describe('#toobusyFilter', () => {
    it('should do before filter ok', () => {
        const service = new FilterService();
        const filter = toobusyFilter();
        service.before(filter);

        service.beforeFilter(null, mockSession, err => {
            expect(err).toBeUndefined();
            expect(mockSession).toBeDefined();
        });
    });

    it('should do before filter error because of too busy', () => {
        const service = new FilterService();
        const filter = toobusyFilter(10, 100);
        service.before(filter);

        let exit = false;

        function load() {
            service.beforeFilter(null, mockSession, (err, _resp) => {
                expect(mockSession).toBeDefined();
                if (err) {
                    exit = true;
                }
            });

            if (exit) {
                return;
            }
            const start = new Date();
            while (Date.now() - start < 250) {
                for (let i = 0; i < 1e5; ) {
                    i++;
                }
            }
            setTimeout(load, 0);
        }

        load();
    }, 5000);
});
