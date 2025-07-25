import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.{test,spec}.js', 'test/**/*-test.js'],
        exclude: ['node_modules/**', 'dist/**', 'coverage/**', '**/fixtures/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['lib/**/*.js'],
            exclude: ['test/**', '**/*.{test,spec}.js', '**/fixtures/**', '**/templates/**']
        },
        // Admin包需要更长的超时时间，因为涉及控制台服务和网络通信
        testTimeout: 12000,
        hookTimeout: 12000,
        // 使用独立进程运行测试，避免网络端口冲突
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true
            }
        }
    }
});
