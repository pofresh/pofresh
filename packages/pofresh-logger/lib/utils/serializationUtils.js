const util = require('util');

/**
 * 对象序列化工具类 - 提供高效的对象序列化和循环引用检测
 */
class SerializationUtils {
    /**
     * 序列化对象为JSON字符串，处理循环引用
     * @param {Object} obj - 要序列化的对象
     * @param {number} [space=2] - JSON格式化空格数
     * @returns {string} 序列化后的字符串
     */
    static serializeObject(obj, space = 2) {
        try {
            return JSON.stringify(obj, this.circularReplacer(), space);
        } catch (err) {
            return util.inspect(obj, {
                depth: this.getOptimalDepth(obj),
                colors: false,
                breakLength: 80,
                compact: this.messageSize(obj) > 1000
            });
        }
    }

    /**
     * 创建循环引用检测的replacer函数
     * @returns {function} JSON replacer函数
     */
    static circularReplacer() {
        const seen = new WeakSet();
        return (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            return value;
        };
    }

    /**
     * 计算对象的消息大小
     * @param {Object} obj - 要计算的对象
     * @returns {number} 对象的字节长度
     */
    static messageSize(obj) {
        try {
            return Buffer.byteLength(JSON.stringify(obj));
        } catch {
            return 0;
        }
    }

    /**
     * 根据对象大小获取最佳的深度
     * @param {Object} obj - 要检查的对象
     * @returns {number} 推荐的深度值
     */
    static getOptimalDepth(obj) {
        const size = this.messageSize(obj);
        if (size < 1000) {
            return 5; // 小对象可以深度检查
        }
        if (size < 5000) {
            return 3; // 中等对象
        }
        return 1; // 大对象只浅层检查
    }

    /**
     * 处理日志参数，将对象转换为字符串
     * @param {...*} args - 要处理的参数
     * @returns {Array} 处理后的参数数组
     */
    static processArguments(args) {
        return args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                return this.serializeObject(arg);
            }
            return arg;
        });
    }

    /**
     * 检查是否为有效的日志级别
     * @param {string} level - 日志级别
     * @returns {boolean} 是否为有效级别
     */
    static isValidLogLevel(level) {
        const validLevels = ['log', 'debug', 'info', 'warn', 'error', 'trace', 'fatal'];
        return validLevels.includes(level);
    }

    /**
     * 映射日志级别到Winston级别
     * @param {string} level - 原始级别
     * @returns {string} Winston级别
     */
    static mapLogLevel(level) {
        const levelMap = {
            log: 'info',
            fatal: 'error',
            trace: 'debug'
        };
        return levelMap[level] || level;
    }
}

module.exports = SerializationUtils;
