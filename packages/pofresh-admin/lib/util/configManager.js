/**
 * Configuration management utilities for pofresh-admin
 * Copyright(c) 2024
 * MIT Licensed
 */

const fs = require('fs');
const path = require('path');

const logger = require('pofresh-logger').getLogger('pofresh-admin', 'ConfigManager');

class ConfigManager {
    constructor() {
        this.cache = new Map();
        this.watchers = new Map();
    }

    /**
     * 加载配置文件
     * @param {string} configPath 配置文件路径
     * @param {boolean} useCache 是否使用缓存
     * @param {boolean} watchFile 是否监听文件变化
     * @returns {Object} 配置对象
     */
    loadConfig(configPath, useCache = true, watchFile = false) {
        if (!configPath || typeof configPath !== 'string') {
            throw new Error('Config path must be a non-empty string');
        }

        const absolutePath = path.resolve(configPath);

        // 检查缓存
        if (useCache && this.cache.has(absolutePath)) {
            return this.cache.get(absolutePath);
        }

        // 检查文件是否存在
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Config file not found: ${absolutePath}`);
        }

        try {
            // 清除require缓存
            delete require.cache[absolutePath];

            const config = require(absolutePath);

            if (useCache) {
                this.cache.set(absolutePath, config);
            }

            // 设置文件监听
            if (watchFile && !this.watchers.has(absolutePath)) {
                this.watchConfigFile(absolutePath);
            }

            return config;
        } catch (err) {
            throw new Error(`Failed to load config from ${absolutePath}: ${err.message}`);
        }
    }

    /**
     * 监听配置文件变化
     * @param {string} configPath 配置文件路径
     */
    watchConfigFile(configPath) {
        try {
            const watcher = fs.watch(configPath, eventType => {
                if (eventType === 'change') {
                    logger.info(`Config file changed: ${configPath}`);
                    this.invalidateCache(configPath);
                }
            });

            this.watchers.set(configPath, watcher);

            watcher.on('error', err => {
                logger.error(`Error watching config file ${configPath}:`, err);
                this.watchers.delete(configPath);
            });
        } catch (err) {
            logger.error(`Failed to watch config file ${configPath}:`, err);
        }
    }

    /**
     * 使缓存失效
     * @param {string} configPath 配置文件路径
     */
    invalidateCache(configPath) {
        const absolutePath = path.resolve(configPath);
        this.cache.delete(absolutePath);
        delete require.cache[absolutePath];
    }

    /**
     * 清除所有缓存
     */
    clearCache() {
        for (const configPath of this.cache.keys()) {
            delete require.cache[configPath];
        }
        this.cache.clear();
    }

    /**
     * 停止所有文件监听
     */
    stopWatching() {
        for (const [configPath, watcher] of this.watchers) {
            try {
                watcher.close();
            } catch (err) {
                logger.error(`Error closing watcher for ${configPath}:`, err);
            }
        }
        this.watchers.clear();
    }

    /**
     * 加载管理员用户配置
     * @param {string} env 环境名称
     * @returns {Array} 管理员用户列表
     */
    loadAdminUsers(env) {
        if (!env || typeof env !== 'string') {
            throw new Error('Environment must be a non-empty string');
        }

        const appBase = path.dirname(require.main.filename);
        const adminUserPath = path.join(appBase, '/config/adminUser.json');
        const presentPath = path.join(appBase, 'config', env, 'adminUser.json');

        let adminUsers = null;

        // 尝试加载环境特定的配置
        if (fs.existsSync(presentPath)) {
            adminUsers = this.loadConfig(presentPath, true, true);
        } else if (fs.existsSync(adminUserPath)) {
            const config = this.loadConfig(adminUserPath, true, true);
            adminUsers = config[env];
        }

        if (!(adminUsers && Array.isArray(adminUsers))) {
            return [];
        }

        return adminUsers;
    }

    /**
     * 验证配置对象
     * @param {Object} config 配置对象
     * @param {Object} schema 验证模式
     * @returns {Error|null} 验证错误或null
     */
    validateConfig(config, schema) {
        if (!config || typeof config !== 'object') {
            return new Error('Config must be an object');
        }

        if (!schema || typeof schema !== 'object') {
            return new Error('Schema must be an object');
        }

        for (const [key, validator] of Object.entries(schema)) {
            if (validator.required && (config[key] === undefined || config[key] === null)) {
                return new Error(`Missing required config property: ${key}`);
            }

            if (config[key] !== undefined && validator.type) {
                const actualType = typeof config[key];
                if (actualType !== validator.type) {
                    return new Error(
                        `Invalid type for config property ${key}: ` + `expected ${validator.type}, got ${actualType}`
                    );
                }
            }

            if (config[key] !== undefined && validator.validate) {
                const validationResult = validator.validate(config[key]);
                if (validationResult !== true) {
                    return new Error(`Validation failed for config property ${key}: ${validationResult}`);
                }
            }
        }

        return null;
    }

    /**
     * 销毁配置管理器
     */
    destroy() {
        this.stopWatching();
        this.clearCache();
    }
}

// 创建单例实例
const configManager = new ConfigManager();

// 进程退出时清理资源
process.on('exit', () => {
    configManager.destroy();
});

process.on('SIGINT', () => {
    configManager.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    configManager.destroy();
    process.exit(0);
});

module.exports = configManager;
