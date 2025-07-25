/**
 * Pofresh 游戏服务器框架 ESLint 配置
 * 针对 Node.js 游戏服务器开发优化的代码检查规则
 */
module.exports = {
    // 运行环境配置
    env: {
        node: true, // Node.js 全局变量和作用域
        es6: true // ES6 语法支持
    },

    // 继承 ESLint 推荐规则
    extends: ['eslint:recommended'],

    // 解析器选项
    parserOptions: {
        ecmaVersion: 2018, // 支持 ES2018 语法特性
        sourceType: 'module' // 使用 ES6 模块语法
    },

    // 自定义规则配置
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
        'space-before-function-paren': ['error', 'never'], // 函数名和括号间不允许空格 function()
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
    },

    // 忽略检查的文件和目录
    ignorePatterns: [
        'node_modules/', // 第三方依赖
        'dist/', // 构建输出目录
        'coverage/', // 测试覆盖率报告
        '*.min.js' // 压缩文件
    ]
};
