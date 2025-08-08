import path from 'path';
import { describe, expect, it } from 'vitest';

import pofresh from '../index.js';

const mockBase = path.join(process.cwd(), 'test');
describe('pofresh', () => {
    describe('#createApp', () => {
        it('should create and get app, be the same instance', () => {
            const app = pofresh.createApp({ base: mockBase });
            expect(app).toBeDefined();

            const app2 = pofresh.app;
            expect(app2).toBeDefined();
            expect(app).toBe(app2);
        });
    });
});
