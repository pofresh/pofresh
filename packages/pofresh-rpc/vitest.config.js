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
        // RPC包需要更长的超时时间，因为涉及网络通信和连接建立
        testTimeout: 15000,
        hookTimeout: 15000,
        // 使用独立进程运行测试，避免网络连接冲突
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true
            }
        }
    }
});
