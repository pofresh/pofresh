/**
 * 颜色处理工具类 - 提供终端颜色格式化功能
 */
class ColorUtils {
    /**
     * ANSI颜色样式定义
     */
    static get styles() {
        return {
            // 文本样式
            bold: [1, 22],
            italic: [3, 23],
            underline: [4, 24],
            inverse: [7, 27],
            // 灰度
            white: [37, 39],
            grey: [90, 39],
            black: [90, 39],
            // 颜色
            blue: [34, 39],
            cyan: [36, 39],
            green: [32, 39],
            magenta: [35, 39],
            red: [31, 39],
            yellow: [33, 39]
        };
    }

    /**
     * 日志级别颜色映射
     */
    static get levelColors() {
        return {
            all: 'grey',
            trace: 'blue',
            debug: 'cyan',
            info: 'green',
            warn: 'yellow',
            error: 'red',
            fatal: 'magenta',
            off: 'grey'
        };
    }

    /**
     * 开始颜色格式化
     * @param {string} style - 样式名称
     * @returns {string} ANSI开始颜色代码
     */
    static colorizeStart(style) {
        return style ? `\x1B[${this.styles[style][0]}m` : '';
    }

    /**
     * 结束颜色格式化
     * @param {string} style - 样式名称
     * @returns {string} ANSI结束颜色代码
     */
    static colorizeEnd(style) {
        return style ? `\x1B[${this.styles[style][1]}m` : '';
    }

    /**
     * 为文本添加颜色
     * @param {string} str - 要着色的文本
     * @param {string} style - 样式名称
     * @returns {string} 着色后的文本
     */
    static colorize(str, style) {
        if (!str || !style) {
            return str || '';
        }
        return `${this.colorizeStart(style)}${str}${this.colorizeEnd(style)}`;
    }

    /**
     * 根据日志级别获取颜色
     * @param {string} level - 日志级别
     * @returns {string} 颜色名称
     */
    static getLevelColor(level) {
        return this.levelColors[level] || this.levelColors.info;
    }

    /**
     * 检查样式是否有效
     * @param {string} style - 样式名称
     * @returns {boolean} 是否为有效样式
     */
    static isValidStyle(style) {
        return this.styles[style] !== undefined;
    }
}

module.exports = ColorUtils;
