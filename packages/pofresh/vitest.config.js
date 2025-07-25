import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.{test,spec}.js'],
        exclude: ['node_modules/**', 'dist/**', 'coverage/**', '**/fixtures/**', '**/mock-*/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['lib/**/*.js'],
            exclude: ['test/**', '**/*.{test,spec}.js', '**/fixtures/**', '**/templates/**']
        },
        // 主框架包需要更长的超时时间，因为有复杂的应用启动和关闭流程
        testTimeout: 15000,
        hookTimeout: 15000,
        // 允许测试文件中的process.exit调用
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true
            }
        }
    }
});
