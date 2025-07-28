/**
 * Utility functions for protobuf operations
 * @module util
 */

const { SIMPLE_TYPES, MAX_SAFE_INTEGER } = require('./constant');

const util = module.exports;

/**
 * Check if a type is a simple protobuf type
 * @param {string} type - The type to check
 * @returns {boolean} True if the type is simple
 */
util.isSimpleType = function (type) {
    return SIMPLE_TYPES.has(type);
};

/**
 * Validate if a value is a valid number
 * @param {*} value - The value to validate
 * @returns {boolean} True if valid number
 */
util.isValidNumber = function (value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

/**
 * Validate if a value is a valid string
 * @param {*} value - The value to validate
 * @returns {boolean} True if valid string
 */
util.isValidString = function (value) {
    return typeof value === 'string';
};

/**
 * Validate if a value is a valid boolean
 * @param {*} value - The value to validate
 * @returns {boolean} True if valid boolean
 */
util.isValidBoolean = function (value) {
    return typeof value === 'boolean';
};

/**
 * Convert value to integer with validation
 * @param {*} value - The value to convert
 * @returns {number} The integer value
 * @throws {Error} If value cannot be converted to valid integer
 */
util.toInt = function (value) {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
        throw new Error(`Cannot convert '${value}' to integer`);
    }
    return num;
};

/**
 * Convert value to float with validation
 * @param {*} value - The value to convert
 * @returns {number} The float value
 * @throws {Error} If value cannot be converted to valid float
 */
util.toFloat = function (value) {
    const num = parseFloat(value);
    if (isNaN(num)) {
        throw new Error(`Cannot convert '${value}' to float`);
    }
    return num;
};

/**
 * Check if running in Node.js environment
 * @returns {boolean} True if in Node.js
 */
util.isNode = function () {
    return typeof process !== 'undefined' && process.versions && process.versions.node;
};

/**
 * Check if running in browser environment
 * @returns {boolean} True if in browser
 */
util.isBrowser = function () {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
};

/**
 * Create a buffer with cross-environment compatibility
 * @param {number} size - The buffer size
 * @returns {Buffer|Uint8Array} The created buffer
 */
util.createBuffer = function (size) {
    if (util.isNode()) {
        return Buffer.alloc(size);
    } else {
        return new Uint8Array(size);
    }
};

/**
 * Copy buffer with cross-environment compatibility
 * @param {Buffer|Uint8Array} source - Source buffer
 * @param {Buffer|Uint8Array} target - Target buffer
 * @param {number} targetStart - Target start position
 * @param {number} sourceStart - Source start position
 * @param {number} sourceEnd - Source end position
 */
util.copyBuffer = function (source, target, targetStart, sourceStart, sourceEnd) {
    if (util.isNode() && Buffer.isBuffer(source) && Buffer.isBuffer(target)) {
        source.copy(target, targetStart, sourceStart, sourceEnd);
    } else {
        const length = sourceEnd - sourceStart;
        for (let i = 0; i < length; i++) {
            target[targetStart + i] = source[sourceStart + i];
        }
    }
};

util.equal = function (obj0, obj1) {
    // Handle null and undefined cases
    if (obj0 === obj1) {
        return true;
    }
    
    if (obj0 == null || obj1 == null) {
        return false;
    }
    
    // Handle different types
    if (typeof obj0 !== typeof obj1) {
        return false;
    }
    
    // Handle arrays
    if (Array.isArray(obj0) && Array.isArray(obj1)) {
        if (obj0.length !== obj1.length) {
            return false;
        }
        for (let i = 0; i < obj0.length; i++) {
            if (!util.equal(obj0[i], obj1[i])) {
                return false;
            }
        }
        return true;
    }
    
    // Handle objects
    if (typeof obj0 === 'object') {
        const keys0 = Object.keys(obj0);
        const keys1 = Object.keys(obj1);
        
        if (keys0.length !== keys1.length) {
            return false;
        }
        
        for (const key of keys0) {
            if (!(key in obj1)) {
                return false;
            }
            if (!util.equal(obj0[key], obj1[key])) {
                return false;
            }
        }
        return true;
    }
    
    // Handle primitive types
    return obj0 === obj1;
};
