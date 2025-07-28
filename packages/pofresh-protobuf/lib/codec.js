/**
 * Enhanced codec for protobuf encoding/decoding with better error handling
 * @module codec
 */

const { MAX_SAFE_INTEGER } = require('./constant');
const util = require('./util');

const codec = module.exports;

/**
 * Encode an unsigned 32-bit integer using varint encoding
 * @param {number} num - The number to encode
 * @returns {Array<number>} Array of bytes representing the encoded number
 * @throws {Error} If the input is invalid
 */
codec.encodeUInt32 = function (num) {
    if (typeof num !== 'number') {
        throw new Error(`Expected number, got ${typeof num}`);
    }
    
    let n = Math.floor(num);
    if (n < 0) {
        throw new Error(`UInt32 must be non-negative, got ${num}`);
    }
    
    if (n > 0xFFFFFFFF) {
        throw new Error(`UInt32 overflow: ${num} exceeds maximum value`);
    }

    const result = [];
    do {
        let tmp = n & 0x7F; // Get lower 7 bits
        n >>>= 7; // Unsigned right shift by 7 bits
        
        if (n !== 0) {
            tmp |= 0x80; // Set continuation bit
        }
        result.push(tmp);
    } while (n !== 0);

    return result;
};

/**
 * Encode a signed 32-bit integer using zigzag encoding then varint
 * @param {number} num - The number to encode
 * @returns {Array<number>} Array of bytes representing the encoded number
 * @throws {Error} If the input is invalid
 */
codec.encodeSInt32 = function (num) {
    if (typeof num !== 'number') {
        throw new Error(`Expected number, got ${typeof num}`);
    }
    
    let n = Math.floor(num);
    if (n < -0x80000000 || n > 0x7FFFFFFF) {
        throw new Error(`SInt32 overflow: ${num} exceeds valid range`);
    }
    
    // Zigzag encoding: maps signed integers to unsigned integers
    // Positive numbers: n * 2
    // Negative numbers: (-n) * 2 - 1
    const zigzag = n >= 0 ? n * 2 : (-n) * 2 - 1;
    return codec.encodeUInt32(zigzag);
};

/**
 * Encode an unsigned 64-bit integer (using BigInt for precision)
 * @param {number|bigint} num - The number to encode
 * @returns {Array<number>} Array of bytes representing the encoded number
 * @throws {Error} If the input is invalid
 */
codec.encodeUInt64 = function (num) {
    let n;
    if (typeof num === 'bigint') {
        n = num;
    } else if (typeof num === 'number') {
        if (num > MAX_SAFE_INTEGER) {
            console.warn(`Number ${num} exceeds MAX_SAFE_INTEGER, precision may be lost`);
        }
        n = BigInt(Math.floor(num));
    } else {
        throw new Error(`Expected number or bigint, got ${typeof num}`);
    }
    
    if (n < 0n) {
        throw new Error(`UInt64 must be non-negative, got ${num}`);
    }
    
    const result = [];
    do {
        let tmp = Number(n & 0x7Fn); // Get lower 7 bits
        n >>= 7n; // Right shift by 7 bits
        
        if (n !== 0n) {
            tmp |= 0x80; // Set continuation bit
        }
        result.push(tmp);
    } while (n !== 0n);

    return result;
};

/**
 * Encode a boolean value
 * @param {boolean} value - The boolean to encode
 * @returns {Array<number>} Array containing single byte (0 or 1)
 * @throws {Error} If the input is invalid
 */
codec.encodeBool = function (value) {
    if (typeof value !== 'boolean') {
        throw new Error(`Expected boolean, got ${typeof value}`);
    }
    return [value ? 1 : 0];
};

/**
 * Encode a tag (field number and wire type)
 * @param {number} fieldNumber - The field number
 * @param {number} wireType - The wire type
 * @returns {Array<number>} Array of bytes representing the encoded tag
 * @throws {Error} If the inputs are invalid
 */
codec.encodeTag = function (fieldNumber, wireType) {
    if (typeof fieldNumber !== 'number' || fieldNumber <= 0) {
        throw new Error(`Invalid field number: ${fieldNumber}`);
    }
    if (typeof wireType !== 'number' || wireType < 0 || wireType > 5) {
        throw new Error(`Invalid wire type: ${wireType}`);
    }
    
    const tag = (fieldNumber << 3) | wireType;
    return codec.encodeUInt32(tag);
};

/**
 * Decode an unsigned 32-bit integer from varint encoding
 * @param {Array<number>} bytes - Array of bytes to decode
 * @returns {number} The decoded number
 * @throws {Error} If the input is invalid
 */
codec.decodeUInt32 = function (bytes) {
    if (!Array.isArray(bytes) || bytes.length === 0) {
        throw new Error('Invalid bytes array for decodeUInt32');
    }

    let result = 0;
    let shift = 0;

    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        if (typeof byte !== 'number' || byte < 0 || byte > 255) {
            throw new Error(`Invalid byte value at index ${i}: ${byte}`);
        }
        
        result |= (byte & 0x7F) << shift;
        
        if ((byte & 0x80) === 0) {
            return result >>> 0; // Ensure unsigned 32-bit result
        }
        
        shift += 7;
        if (shift >= 32) {
            throw new Error('UInt32 varint too long');
        }
    }

    throw new Error('Incomplete varint');
};

/**
 * Decode a signed 32-bit integer from zigzag varint encoding
 * @param {Array<number>} bytes - Array of bytes to decode
 * @returns {number} The decoded number
 * @throws {Error} If the input is invalid
 */
codec.decodeSInt32 = function (bytes) {
    const n = codec.decodeUInt32(bytes);
    // Zigzag decoding: even numbers are positive, odd numbers are negative
    return (n >>> 1) ^ (-(n & 1));
};

/**
 * Decode an unsigned 64-bit integer from varint encoding
 * @param {Array<number>} bytes - Array of bytes to decode
 * @returns {bigint} The decoded number as BigInt
 * @throws {Error} If the input is invalid
 */
codec.decodeUInt64 = function (bytes) {
    if (!Array.isArray(bytes) || bytes.length === 0) {
        throw new Error('Invalid bytes array for decodeUInt64');
    }

    let result = 0n;
    let shift = 0n;

    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        if (typeof byte !== 'number' || byte < 0 || byte > 255) {
            throw new Error(`Invalid byte value at index ${i}: ${byte}`);
        }
        
        result |= BigInt(byte & 0x7F) << shift;
        
        if ((byte & 0x80) === 0) {
            return result;
        }
        
        shift += 7n;
        if (shift >= 64n) {
            throw new Error('UInt64 varint too long');
        }
    }

    throw new Error('Incomplete varint');
};

/**
 * Decode a boolean value
 * @param {Array<number>} bytes - Array containing single byte
 * @returns {boolean} The decoded boolean
 * @throws {Error} If the input is invalid
 */
codec.decodeBool = function (bytes) {
    if (!Array.isArray(bytes) || bytes.length !== 1) {
        throw new Error('Boolean must be encoded as single byte');
    }
    const byte = bytes[0];
    if (typeof byte !== 'number' || (byte !== 0 && byte !== 1)) {
        throw new Error(`Invalid boolean byte: ${byte}`);
    }
    return byte === 1;
};

/**
 * Decode a tag to get field number and wire type
 * @param {Array<number>} bytes - Array of bytes representing the tag
 * @returns {{fieldNumber: number, wireType: number}} The decoded tag
 * @throws {Error} If the input is invalid
 */
codec.decodeTag = function (bytes) {
    const tag = codec.decodeUInt32(bytes);
    const wireType = tag & 0x7;
    const fieldNumber = tag >>> 3;
    
    if (fieldNumber === 0) {
        throw new Error('Invalid field number: 0');
    }
    
    return { fieldNumber, wireType };
};

// Legacy compatibility functions
codec.encodeSInt32 = codec.encodeSInt32 || function (num) {
    let n = parseInt(num);
    if (isNaN(n)) {
        return null;
    }
    n = n < 0 ? Math.abs(n) * 2 - 1 : n * 2;
    return codec.encodeUInt32(n);
};

// Legacy compatibility - keep old function names
const Encoder = codec;
Encoder.encodeUInt32 = codec.encodeUInt32;
Encoder.encodeSInt32 = codec.encodeSInt32;
Encoder.decodeUInt32 = codec.decodeUInt32;
Encoder.decodeSInt32 = codec.decodeSInt32;
