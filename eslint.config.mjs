import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    {
        ignores: ['**/node_modules/', '**/dist/', '*.log']
    },
    {
        files: ['**/*.{js,mjs,cjs}'],
        plugins: { js },
        extends: ['js/recommended'],
        languageOptions: { globals: { ...globals.node, ...globals.vitest, ...globals.browser } }
    },
    { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
    { files: ['**/test/**/*.js'], languageOptions: { sourceType: 'module' } },
    {
        rules: {
            // === 代码格式化规则 ===
            indent: ['error', 4], // 强制 4 空格缩进
            quotes: ['error', 'single'], // 强制使用单引号
            semi: ['error', 'always'], // 强制使用分号
            'comma-dangle': ['error', 'never'], // 禁止尾随逗号
            'max-len': ['error', { code: 120 }], // 限制行长度为 120 字符

            // === 空格和间距规则 ===
            'object-curly-spacing': ['error', 'always'], // 对象花括号内必须有空格 { key: value }
            'array-bracket-spacing': ['error', 'never'], // 数组方括号内不允许空格 [1, 2, 3]
            'space-before-function-paren': [
                'error',
                {
                    anonymous: 'always',
                    named: 'never',
                    asyncArrow: 'always'
                }
            ], // 函数名和括号间不允许空格 function()
            'keyword-spacing': 'error', // 关键字前后必须有空格
            'space-infix-ops': 'error', // 操作符前后必须有空格
            'no-trailing-spaces': 'error', // 禁止行尾空格
            'eol-last': 'error', // 文件末尾必须有换行符
            'no-multiple-empty-lines': ['error', { max: 2 }], // 最多允许 2 个连续空行

            // === 变量和命名规则 ===
            'no-console': 0, // 允许使用 console（游戏服务器需要日志）
            camelcase: ['error', { properties: 'always' }], // 强制驼峰命名法
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }], // 禁止未使用变量，下划线开头的参数除外
            'prefer-const': 'error', // 优先使用 const
            'no-var': 'error', // 禁止使用 var，使用 let/const

            // === 安全和最佳实践规则 ===
            eqeqeq: 'error', // 强制使用 === 和 !==
            'no-eval': 'error', // 禁止使用 eval()
            'no-implied-eval': 'error', // 禁止隐式 eval()
            'no-new-func': 'error', // 禁止使用 Function 构造函数
            'no-prototype-builtins': 'warn' // 警告直接调用原型方法
        }
    }
]);
