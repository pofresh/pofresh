const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const logger = require('pofresh-logger').getLogger('pofresh-security', 'security.js');

/**
 * Security utilities for password generation and validation
 * Provides secure password handling, session ID generation, and input validation
 */

// Regex patterns for security validation
const MALICIOUS_PATTERNS = [
    /<script/i,
    /javascript:/i,
    /on\w+\s=/i,
    /eval\s*\(/i,
    /document\./i,
    /window\./i,
    /alert\s*\(/i
];

/**
 * Password generation options
 * @typedef {Object} PasswordOptions
 * @property {number} length - Password length (default: 16)
 * @property {string} charset - Character set for password generation
 */

/**
 * Generate a secure random password
 * @param {PasswordOptions} options - Password generation options
 * @returns {string} Generated password
 */
function generateSecurePassword({ length = 16, charset } = {}) {
    const defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const safeCharset = charset || defaultCharset;

    if (length <= 0) {
        throw new Error('Password length must be positive');
    }

    const password = [];
    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, safeCharset.length);
        password.push(safeCharset[randomIndex]);
    }

    return password.join('');
}

/**
 * Hash password using bcrypt with fallback to crypto
 * @param {string} password - Plain text password
 * @param {Object} options - Hashing options
 * @returns {string} Hashed password
 */
function hashPassword(password, { saltRounds = 12 } = {}) {
    if (typeof password !== 'string') {
        throw new TypeError('Password must be a string');
    }

    try {
        // Try to use bcrypt if available
        const bcrypt = require('bcrypt');
        return bcrypt.hashSync(password, saltRounds);
    } catch (_e) {
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
function verifyPassword(password, hash) {
    if (typeof password !== 'string' || typeof hash !== 'string') {
        return false;
    }

    try {
        // Try bcrypt format
        if (hash.startsWith('$2b$') || hash.startsWith('$2a$')) {
            const bcrypt = require('bcrypt');
            return bcrypt.compareSync(password, hash);
        }
    } catch (_e) {
        // Fallback to crypto format
        const [salt, originalHash] = hash.split(':');
        if (!(salt && originalHash)) {
            return false;
        }

        const newHash = crypto.pbkdf2Sync(password, salt, 10_000, 64, 'sha512').toString('hex');
        return originalHash === newHash;
    }

    return false;
}

/**
 * Generate secure session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate and store admin passwords from config
 * @param {string} configPath - Path to adminUser.json
 * @param {Object} options - Generation options
 * @param {boolean} options.overwrite - Whether to overwrite existing passwords
 */
async function generateAdminPasswords(configPath, { overwrite = false } = {}) {
    try {
        const configPathResolved = path.resolve(configPath);
        const config = JSON.parse(await fs.readFile(configPathResolved, 'utf8'));

        const passwords = {};
        const updatedConfig = config.map(user => {
            if (
                user.password === '{{GENERATE_SECURE_PASSWORD}}' ||
                (overwrite && user.password && !user.password.startsWith('$'))
            ) {
                const newPassword = generateSecurePassword({ length: 16 });
                user.password = hashPassword(newPassword);
                passwords[user.username] = newPassword;
            }
            return user;
        });

        // Write updated config
        await fs.writeFile(configPathResolved, JSON.stringify(updatedConfig, null, 2));

        // Write passwords to secure log
        const logPath = path.join(process.cwd(), 'logs', 'admin-passwords.log');
        const logDir = path.dirname(logPath);

        await fs.mkdir(logDir, { recursive: true, mode: 0o700 });

        const logEntry = {
            timestamp: new Date().toISOString(),
            passwords,
            note: 'Generated on first startup. Change these passwords immediately.'
        };

        await fs.writeFile(logPath, JSON.stringify(logEntry, null, 2), {
            mode: 0o600
        });

        logger.warn('Admin passwords generated and stored in %s', logPath);
        logger.warn('IMPORTANT: Change these passwords immediately after first login!');
    } catch (error) {
        logger.error('Failed to generate admin passwords: %s', error.message);
        throw error;
    }
}

/**
 * Validate port number
 * @param {number|string} port - Port to validate
 * @returns {boolean} Port validity
 */
function isValidPort(port) {
    const portNum = Number.parseInt(port, 10);
    return !Number.isNaN(portNum) && portNum > 0 && portNum <= 65_535;
}

/**
 * Sanitize user input to prevent command injection
 * @param {*} input - User input
 * @param {Object} options - Sanitization options
 * @param {boolean} options.allowLetters - Whether to allow letters
 * @param {boolean} options.allowNumbers - Whether to allow numbers
 * @param {boolean} options.allowSpaces - Whether to allow spaces
 * @param {boolean} options.allowUnderscore - Whether to allow underscores
 * @returns {string} Sanitized input
 */
function sanitizeInput(
    input,
    { allowLetters = true, allowNumbers = true, allowSpaces = true, allowUnderscore = true } = {}
) {
    if (typeof input !== 'string') {
        return String(input);
    }

    let sanitized = input;

    // Remove potential command injection characters
    if (!allowSpaces) {
        sanitized = sanitized.replace(/\s+/g, '');
    }
    if (!allowUnderscore) {
        sanitized = sanitized.replace(/_/g, '');
    }
    if (!allowLetters) {
        sanitized = sanitized.replace(/[a-zA-Z]/g, '');
    }
    if (!allowNumbers) {
        sanitized = sanitized.replace(/[0-9]/g, '');
    }

    // Remove other dangerous characters
    sanitized = sanitized.replace(/[;&|`$(){}[\]]/g, '');

    return sanitized;
}

/**
 * Generate a secure token for API access
 * @param {number} length - Token length
 * @returns {string} Secure token
 */
function generateApiToken(length = 32) {
    return crypto.randomBytes(length).toString('base64url');
}

/**
 * Validate if a string contains potentially malicious content
 * @param {string} input - String to validate
 * @returns {boolean} True if input appears safe
 */
function isInputSafe(input) {
    if (typeof input !== 'string') {
        return false;
    }

    // Check for common attack patterns
    return !MALICIOUS_PATTERNS.some(pattern => pattern.test(input));
}

module.exports = {
    generateSecurePassword,
    hashPassword,
    verifyPassword,
    generateSessionId,
    generateAdminPasswords,
    isValidPort,
    sanitizeInput,
    generateApiToken,
    isInputSafe
};
