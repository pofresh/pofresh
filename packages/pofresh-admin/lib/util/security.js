/**
 * Security utilities for pofresh-admin
 * Copyright(c) 2024
 * MIT Licensed
 */

const crypto = require('crypto');
const path = require('path');

const logger = require('pofresh-logger').getLogger('pofresh-admin', 'Security');

class Security {
    /**
     * 验证输入是否安全
     * @param {*} input 输入值
     * @param {Object} options 验证选项
     * @returns {Object} 验证结果
     */
    static validateInput(input, options = {}) {
        const result = {
            isValid: true,
            errors: [],
            sanitized: input
        };

        // 类型检查
        if (options.type && typeof input !== options.type) {
            result.isValid = false;
            result.errors.push(`Expected type ${options.type}, got ${typeof input}`);
            return result;
        }

        // 字符串验证
        if (typeof input === 'string') {
            result.sanitized = this.sanitizeString(input, options);

            // 长度检查
            if (options.maxLength && input.length > options.maxLength) {
                result.isValid = false;
                result.errors.push(`String too long: ${input.length} > ${options.maxLength}`);
            }

            if (options.minLength && input.length < options.minLength) {
                result.isValid = false;
                result.errors.push(`String too short: ${input.length} < ${options.minLength}`);
            }

            // 模式匹配
            if (options.pattern && !options.pattern.test(input)) {
                result.isValid = false;
                result.errors.push('String does not match required pattern');
            }

            // 危险字符检查
            if (options.checkDangerous !== false && this.containsDangerousChars(input)) {
                result.isValid = false;
                result.errors.push('String contains potentially dangerous characters');
            }
        }

        // 数字验证
        if (typeof input === 'number') {
            if (options.min !== undefined && input < options.min) {
                result.isValid = false;
                result.errors.push(`Number too small: ${input} < ${options.min}`);
            }

            if (options.max !== undefined && input > options.max) {
                result.isValid = false;
                result.errors.push(`Number too large: ${input} > ${options.max}`);
            }

            if (options.integer && !Number.isInteger(input)) {
                result.isValid = false;
                result.errors.push('Number must be an integer');
            }
        }

        // 对象验证
        if (typeof input === 'object' && input !== null) {
            if (options.maxProperties && Object.keys(input).length > options.maxProperties) {
                result.isValid = false;
                result.errors.push(`Too many properties: ${Object.keys(input).length} > ${options.maxProperties}`);
            }

            if (options.requiredProperties) {
                for (const prop of options.requiredProperties) {
                    if (!(prop in input)) {
                        result.isValid = false;
                        result.errors.push(`Missing required property: ${prop}`);
                    }
                }
            }
        }

        return result;
    }

    /**
     * 清理字符串
     * @param {string} str 输入字符串
     * @param {Object} options 清理选项
     * @returns {string} 清理后的字符串
     */
    static sanitizeString(str, options = {}) {
        if (typeof str !== 'string') {
            return str;
        }

        let sanitized = str;

        // 移除控制字符
        if (options.removeControlChars !== false) {
            sanitized = sanitized.replace(/[\cA-\cZ\x7F-\x9F]/g, '');
        }

        // HTML转义
        if (options.escapeHtml) {
            sanitized = sanitized
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;');
        }

        // 移除SQL注入字符
        if (options.removeSqlChars) {
            sanitized = sanitized.replace(/[';"\\]/g, '');
        }

        // 修剪空白字符
        if (options.trim !== false) {
            sanitized = sanitized.trim();
        }

        return sanitized;
    }

    /**
     * 检查字符串是否包含危险字符
     * @param {string} str 输入字符串
     * @returns {boolean} 是否包含危险字符
     */
    static containsDangerousChars(str) {
        if (typeof str !== 'string') {
            return false;
        }

        // 检查控制字符
        if (/[\cA-\cZ\x7F-\x9F]/.test(str)) {
            return true;
        }

        const dangerousPatterns = [
            /<script[^>]*>.*?<\/script>/gi,  // Script标签
            /javascript:/gi,                  // JavaScript协议
            /on\w+\s*=/gi,                   // 事件处理器
            /eval\s*\(/gi,                   // eval函数
            /expression\s*\(/gi,             // CSS表达式
            /vbscript:/gi,                   // VBScript协议
            /data:text\/html/gi,             // Data URL
            /<iframe[^>]*>/gi,               // iframe标签
            /<object[^>]*>/gi,               // object标签
            /<embed[^>]*>/gi,                // embed标签
            /\\x[0-9a-f]{2}/gi,             // 十六进制编码
            /\\u[0-9a-f]{4}/gi,             // Unicode编码
            /%[0-9a-f]{2}/gi                 // URL编码的特殊字符
        ];

        return dangerousPatterns.some(pattern => pattern.test(str));
    }

    /**
     * 验证文件路径安全性
     * @param {string} filePath 文件路径
     * @param {Object} options 验证选项
     * @returns {Object} 验证结果
     */
    static validateFilePath(filePath, options = {}) {
        const result = {
            isValid: true,
            errors: [],
            normalizedPath: null
        };

        if (!filePath || typeof filePath !== 'string') {
            result.isValid = false;
            result.errors.push('File path must be a non-empty string');
            return result;
        }

        try {
            // 规范化路径
            result.normalizedPath = path.normalize(filePath);

            // 检查路径遍历攻击
            if (result.normalizedPath.includes('..')) {
                result.isValid = false;
                result.errors.push('Path traversal detected');
            }

            // 检查绝对路径（如果不允许）
            if (options.allowAbsolute !== true && path.isAbsolute(result.normalizedPath)) {
                result.isValid = false;
                result.errors.push('Absolute paths not allowed');
            }

            // 检查允许的扩展名
            if (options.allowedExtensions) {
                const ext = path.extname(result.normalizedPath).toLowerCase();
                if (!options.allowedExtensions.includes(ext)) {
                    result.isValid = false;
                    result.errors.push(`File extension not allowed: ${ext}`);
                }
            }

            // 检查禁止的扩展名
            if (options.forbiddenExtensions) {
                const ext = path.extname(result.normalizedPath).toLowerCase();
                if (options.forbiddenExtensions.includes(ext)) {
                    result.isValid = false;
                    result.errors.push(`File extension forbidden: ${ext}`);
                }
            }

            // 检查基础目录限制
            if (options.baseDirectory) {
                const basePath = path.resolve(options.baseDirectory);
                const fullPath = path.resolve(basePath, result.normalizedPath);

                if (!fullPath.startsWith(basePath)) {
                    result.isValid = false;
                    result.errors.push('Path outside allowed directory');
                }
            }

        } catch (err) {
            result.isValid = false;
            result.errors.push(`Path validation error: ${err.message}`);
        }

        return result;
    }

    /**
     * 生成安全的随机字符串
     * @param {number} length 字符串长度
     * @param {Object} options 生成选项
     * @returns {string} 随机字符串
     */
    static generateSecureRandom(length = 32, options = {}) {
        const charset = options.charset || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const bytes = crypto.randomBytes(length);
        let result = '';

        for (let i = 0; i < length; i++) {
            result += charset[bytes[i] % charset.length];
        }

        return result;
    }

    /**
     * 创建安全的哈希
     * @param {string} data 要哈希的数据
     * @param {string} algorithm 哈希算法
     * @param {string} salt 盐值
     * @returns {string} 哈希值
     */
    static createHash(data, algorithm = 'sha256', salt = '') {
        if (typeof data !== 'string') {
            throw new Error('Data must be a string');
        }

        const hash = crypto.createHash(algorithm);
        hash.update(salt + data);
        return hash.digest('hex');
    }

    /**
     * 验证哈希
     * @param {string} data 原始数据
     * @param {string} hash 哈希值
     * @param {string} algorithm 哈希算法
     * @param {string} salt 盐值
     * @returns {boolean} 是否匹配
     */
    static verifyHash(data, hash, algorithm = 'sha256', salt = '') {
        try {
            const computedHash = this.createHash(data, algorithm, salt);
            return computedHash === hash;
        } catch (err) {
            logger.error('Hash verification error:', err);
            return false;
        }
    }

    /**
     * 限制脚本执行的安全上下文
     * @param {Object} context 基础上下文
     * @returns {Object} 安全上下文
     */
    static createSecureContext(context = {}) {
        // 创建受限的上下文
        const secureContext = {
            // 安全的内置对象
            Math: Math,
            Date: Date,
            JSON: JSON,
            parseInt: parseInt,
            parseFloat: parseFloat,
            isNaN: isNaN,
            isFinite: isFinite,

            // 受限的console
            console: {
                log: (...args) => logger.info('Script log:', ...args),
                warn: (...args) => logger.warn('Script warn:', ...args),
                error: (...args) => logger.error('Script error:', ...args)
            },

            // 受限的setTimeout
            setTimeout: (fn, delay) => {
                if (typeof fn !== 'function') {
                    throw new Error('setTimeout callback must be a function');
                }
                if (delay > 5000) {
                    throw new Error('setTimeout delay cannot exceed 5 seconds');
                }
                return setTimeout(fn, delay);
            }
        };

        // 添加用户提供的安全上下文
        Object.assign(secureContext, context);

        return secureContext;
    }

    /**
     * 检查脚本内容是否安全
     * @param {string} script 脚本内容
     * @returns {Object} 检查结果
     */
    static validateScript(script) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (typeof script !== 'string') {
            result.isValid = false;
            result.errors.push('Script must be a string');
            return result;
        }

        // 检查危险的全局对象和函数
        const dangerousPatterns = [
            /\brequire\s*\(/g,           // require函数
            /\bprocess\b/g,             // process对象
            /\bglobal\b/g,              // global对象
            /\b__dirname\b/g,           // __dirname
            /\b__filename\b/g,          // __filename
            /\bmodule\b/g,              // module对象
            /\bexports\b/g,             // exports对象
            /\bBuffer\b/g,              // Buffer对象
            /\bchild_process\b/g,       // child_process模块
            /\bfs\b/g,                  // fs模块
            /\bnet\b/g,                 // net模块
            /\bhttp\b/g,                // http模块
            /\bhttps\b/g,               // https模块
            /\bos\b/g,                  // os模块
            /\bpath\b/g,                // path模块
            /\burl\b/g,                 // url模块
            /\beval\s*\(/g,             // eval函数
            /\bFunction\s*\(/g,         // Function构造器
            /\bsetInterval\s*\(/g,      // setInterval
            /\bsetImmediate\s*\(/g      // setImmediate
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(script)) {
                result.isValid = false;
                result.errors.push(`Dangerous pattern detected: ${pattern.source}`);
            }
        }

        // 检查可疑的模式
        const suspiciousPatterns = [
            /\btry\s*{[^}]*catch/g,     // try-catch可能用于隐藏错误
            /\bthrow\s+/g,              // throw语句
            /\bdelete\s+/g,             // delete操作符
            /\bwith\s*\(/g,             // with语句
            /\barguments\b/g            // arguments对象
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(script)) {
                result.warnings.push(`Suspicious pattern detected: ${pattern.source}`);
            }
        }

        return result;
    }

    /**
     * 创建速率限制器
     * @param {Object} options 限制选项
     * @returns {Function} 速率限制检查函数
     */
    static createRateLimiter(options = {}) {
        const {
            maxRequests = 100,
            windowMs = 60000, // 1分钟
            keyGenerator = (req) => req.ip || 'default'
        } = options;

        const requests = new Map();

        // 清理过期记录
        setInterval(() => {
            const now = Date.now();
            for (const [key, data] of requests) {
                if (now - data.resetTime > windowMs) {
                    requests.delete(key);
                }
            }
        }, windowMs);

        return (req) => {
            const key = keyGenerator(req);
            const now = Date.now();

            if (!requests.has(key)) {
                requests.set(key, {
                    count: 1,
                    resetTime: now
                });
                return { allowed: true, remaining: maxRequests - 1 };
            }

            const data = requests.get(key);

            if (now - data.resetTime > windowMs) {
                // 重置窗口
                data.count = 1;
                data.resetTime = now;
                return { allowed: true, remaining: maxRequests - 1 };
            }

            if (data.count >= maxRequests) {
                return {
                    allowed: false,
                    remaining: 0,
                    resetTime: data.resetTime + windowMs
                };
            }

            data.count++;
            return {
                allowed: true,
                remaining: maxRequests - data.count
            };
        };
    }
}

module.exports = Security;
