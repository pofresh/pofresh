const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('pofresh-logger').getLogger('pofresh-security', __filename);

/**
 * Security utilities for password generation and validation
 */
class SecurityUtils {
    /**
     * Generate a secure random password
     * @param {number} length - Password length (default: 16)
     * @returns {string} Generated password
     */
    static generateSecurePassword(length = 16) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';

        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, charset.length);
            password += charset[randomIndex];
        }

        return password;
    }

    /**
     * Hash password using bcrypt (fallback to crypto if bcrypt unavailable)
     * @param {string} password - Plain text password
     * @returns {string} Hashed password
     */
    static hashPassword(password) {
        try {
            // Try to use bcrypt if available
            const bcrypt = require('bcrypt');
            const saltRounds = 12;
            return bcrypt.hashSync(password, saltRounds);
        } catch (e) {
            // Fallback to crypto-based hashing
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.pbkdf2Sync(password, salt, 10_000, 64, 'sha512').toString('hex');
            return `${salt}:${hash}`;
        }
    }

    /**
     * Verify password against hash
     * @param {string} password - Plain text password
     * @param {string} hash - Stored hash
     * @returns {boolean} Password validity
     */
    static verifyPassword(password, hash) {
        try {
            // Try bcrypt format
            if (hash.startsWith('$2b$') || hash.startsWith('$2a$')) {
                const bcrypt = require('bcrypt');
                return bcrypt.compareSync(password, hash);
            }
        } catch (e) {
            // Fallback to crypto format
            const [salt, originalHash] = hash.split(':');
            const newHash = crypto.pbkdf2Sync(password, salt, 10_000, 64, 'sha512').toString('hex');
            return originalHash === newHash;
        }
    }

    /**
     * Generate secure session ID
     * @returns {string} Session ID
     */
    static generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Generate and store admin passwords
     * @param {string} configPath - Path to adminUser.json
     */
    static generateAdminPasswords(configPath) {
        try {
            const config = require(configPath);
            const passwords = {};

            config.forEach(user => {
                if (user.password === '{{GENERATE_SECURE_PASSWORD}}') {
                    const newPassword = SecurityUtils.generateSecurePassword();
                    user.password = SecurityUtils.hashPassword(newPassword);
                    passwords[user.username] = newPassword;
                }
            });

            // Write updated config
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            // Write passwords to secure log
            const logPath = path.join(process.cwd(), 'logs', 'admin-passwords.log');
            const logDir = path.dirname(logPath);

            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
            }

            const logEntry = {
                timestamp: new Date().toISOString(),
                passwords,
                note: 'Generated on first startup. Change these passwords immediately.'
            };

            fs.writeFileSync(logPath, JSON.stringify(logEntry, null, 2), {
                mode: 0o600
            });

            logger.warn('Admin passwords generated and stored in %s', logPath);
            logger.warn('IMPORTANT: Change these passwords immediately after first login!');
        } catch (error) {
            logger.error('Failed to generate admin passwords: %j', error.message);
        }
    }

    /**
     * Validate port number
     * @param {number|string} port - Port to validate
     * @returns {boolean} Port validity
     */
    static isValidPort(port) {
        const portNum = Number.parseInt(port, 10);
        return !isNaN(portNum) && portNum > 0 && portNum <= 65_535;
    }

    /**
     * Sanitize user input
     * @param {string} input - User input
     * @returns {string} Sanitized input
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') {
            return String(input);
        }
        // Remove potential command injection characters
        return input.replace(/[;&|`$(){}[]]/g, '');
    }
}

module.exports = SecurityUtils;
