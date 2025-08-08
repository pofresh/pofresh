import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.js'],
        exclude: ['node_modules/**', 'dist/**', 'tests/fixtures/**', 'scripts/**'],
        globals: true,
        environment: 'node',
        testTimeout: 10_000,
        hookTimeout: 10_000
    },
    resolve: {
        alias: {
            '@': new URL('./lib', import.meta.url).pathname,
            '@fixtures': new URL('./tests/fixtures', import.meta.url).pathname
        }
    }
});
