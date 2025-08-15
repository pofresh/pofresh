const fs = require('fs');
const path = require('path');

/**
 * 配置处理工具类 - 提供配置文件加载和验证功能
 */
class ConfigUtils {
    /**
     * 获取文件的修改时间
     * @param {string} filename - 文件路径
     * @returns {Date|null} 修改时间，文件不存在时返回null
     */
    static getMTime(filename) {
        try {
            const stats = fs.statSync(filename);
            return stats.mtime;
        } catch (error) {
            throw new Error(`Cannot find file with given path: ${filename}. Error: ${error.message}`);
        }
    }

    /**
     * 加载配置文件
     * @param {string} filename - 配置文件路径
     * @returns {Object|null} 配置对象，文件不存在时返回null
     */
    static loadConfigurationFile(filename) {
        if (!filename) {
            return null;
        }

        try {
            const content = fs.readFileSync(filename, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            throw new Error(`Failed to load configuration file ${filename}: ${error.message}`);
        }
    }

    /**
     * 验证日志配置
     * @param {Object} config - 配置对象
     * @returns {Object} 验证结果 {valid: boolean, errors: string[]}
     */
    static validateConfig(config) {
        const errors = [];

        // 验证必需字段
        if (!config) {
            errors.push('Configuration cannot be null or undefined');
            return { valid: false, errors };
        }

        // 验证appenders
        if (config.appenders) {
            if (typeof config.appenders !== 'object') {
                errors.push('Appenders must be an object');
            } else {
                for (const appenderName of Object.keys(config.appenders)) {
                    const appender = config.appenders[appenderName];
                    if (!appender.type) {
                        errors.push(`Appender ${appenderName} is missing type`);
                    }
                    if (appender.type === 'file' && !appender.filename) {
                        errors.push(`File appender ${appenderName} is missing filename`);
                    }
                    if (appender.type === 'dateFile' && !appender.filename) {
                        errors.push(`DateFile appender ${appenderName} is missing filename`);
                    }
                }
            }
        }

        // 验证categories
        if (config.categories) {
            if (typeof config.categories !== 'object') {
                errors.push('Categories must be an object');
            } else if (!config.categories.default) {
                errors.push('Default category is required');
            } else if (!config.categories.default.level) {
                errors.push('Default category is missing level');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 替换配置中的属性
     * @param {Object|Array} configObj - 配置对象或数组
     * @param {Object} opts - 选项对象
     * @returns {Object|Array} 处理后的配置
     */
    static replaceProperties(configObj, opts) {
        if (Array.isArray(configObj)) {
            return configObj.map(item => this.replaceProperties(item, opts));
        }

        if (typeof configObj === 'object' && configObj !== null) {
            const result = {};
            for (const [key, value] of Object.entries(configObj)) {
                if (Object.hasOwn(configObj, key)) {
                    if (typeof value === 'string') {
                        result[key] = this.doReplace(value, opts);
                    } else if (typeof value === 'object') {
                        result[key] = this.replaceProperties(value, opts);
                    } else {
                        result[key] = value;
                    }
                }
            }
            return result;
        }

        return configObj;
    }

    /**
     * 执行属性替换
     * @param {string} src - 源字符串
     * @param {Object} opts - 选项对象
     * @returns {string} 替换后的字符串
     */
    static doReplace(src, opts) {
        if (!src) {
            return src;
        }

        const pattern = /\$\{(.*?)\}/g;
        let result = '';
        let lastIndex = 0;
        let match;

        while ((match = pattern.exec(src)) !== null) {
            const [fullMatch, expression] = match;
            const [scope, name, defaultValue] = expression.split(':');

            result += src.substring(lastIndex, match.index);
            lastIndex = pattern.lastIndex;

            const value = this.getPropertyValue(scope, name, opts, defaultValue);
            result += value;
        }

        result += src.substring(lastIndex);
        return result;
    }

    /**
     * 获取属性值
     * @param {string} scope - 作用域
     * @param {string} name - 属性名
     * @param {Object} opts - 选项对象
     * @param {string} defaultValue - 默认值
     * @returns {string} 属性值
     */
    static getPropertyValue(scope, name, opts, defaultValue) {
        const handlers = {
            env: key => process.env[key],
            args: key => process.argv[key],
            opts: key => opts?.[key]
        };

        const handler = handlers[scope];
        if (typeof handler === 'function') {
            const value = handler(name);
            return value !== undefined ? value : defaultValue || '';
        }

        return defaultValue || '';
    }

    /**
     * 检查文件是否存在且可读
     * @param {string} filename - 文件路径
     * @returns {boolean} 文件是否存在且可读
     */
    static canReadFile(filename) {
        try {
            fs.accessSync(filename, fs.constants.R_OK);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 获取绝对路径
     * @param {string} filename - 文件路径
     * @returns {string} 绝对路径
     */
    static getAbsolutePath(filename) {
        return path.isAbsolute(filename) ? filename : path.join(process.cwd(), filename);
    }
}

module.exports = ConfigUtils;
