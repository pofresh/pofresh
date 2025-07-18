import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'test/**/*.js',
      'packages/*/test/**/*.js',
      'plugin/*/test/**/*.js'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'packages/*/lib/**/*.js',
        'plugin/*/lib/**/*.js'
      ],
      exclude: [
        'test/**',
        '**/*.test.js',
        '**/*.spec.js'
      ]
    }
  }
});