/**
 * String encoding and decoding utilities with optimized performance
 */

const { getAllocBuffer, copyArray } = require('./buffer-utils');

// Cache TextEncoder for better performance
let textEncoder = null;
if (typeof TextEncoder !== 'undefined') {
    textEncoder = new TextEncoder();
}

// Cache TextDecoder for better performance
let textDecoder = null;
if (typeof TextDecoder !== 'undefined') {
    textDecoder = new TextDecoder('utf-8');
}

/**
 * Encode string to buffer with optimized performance
 * @param  {String} str string to encode
 * @return {Buffer|Uint8Array} encoded buffer
 */
function strencode(str) {
    if (typeof str !== 'string') {
        throw new TypeError('Expected string input');
    }

    // Fast path: use Buffer in Node.js
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str, 'utf8');
    }

    // Fast path: use TextEncoder in browsers
    if (textEncoder) {
        return textEncoder.encode(str);
    }

    // Fallback: optimized UTF-8 encoding with better performance
    const length = str.length;
    const byteArray = new Uint8Array(length * 4); // Conservative estimate
    let offset = 0;

    for (let i = 0; i < length; i++) {
        let charCode = str.charCodeAt(i);

        // Handle surrogate pairs for characters > U+FFFF
        if (charCode >= 0xd800 && charCode <= 0xdbff && i + 1 < length) {
            const lowSurrogate = str.charCodeAt(i + 1);
            if (lowSurrogate >= 0xdc00 && lowSurrogate <= 0xdfff) {
                charCode = 0x10000 + ((charCode & 0x3ff) << 10) + (lowSurrogate & 0x3ff);
                i++; // Skip the low surrogate
            }
        }

        // Optimized UTF-8 encoding
        if (charCode <= 0x7f) {
            // 1-byte sequence (ASCII)
            byteArray[offset++] = charCode;
        } else if (charCode <= 0x7ff) {
            // 2-byte sequence
            byteArray[offset++] = 0xc0 | (charCode >> 6);
            byteArray[offset++] = 0x80 | (charCode & 0x3f);
        } else if (charCode <= 0xffff) {
            // 3-byte sequence
            byteArray[offset++] = 0xe0 | (charCode >> 12);
            byteArray[offset++] = 0x80 | ((charCode >> 6) & 0x3f);
            byteArray[offset++] = 0x80 | (charCode & 0x3f);
        } else {
            // 4-byte sequence
            byteArray[offset++] = 0xf0 | (charCode >> 18);
            byteArray[offset++] = 0x80 | ((charCode >> 12) & 0x3f);
            byteArray[offset++] = 0x80 | ((charCode >> 6) & 0x3f);
            byteArray[offset++] = 0x80 | (charCode & 0x3f);
        }
    }

    // Return exact-sized buffer
    const result = new Uint8Array(offset);
    copyArray(result, 0, byteArray, 0, offset);
    return result;
}

/**
 * Decode buffer to string
 * @param  {Buffer|Uint8Array} buffer string data
 * @return {String} decoded string
 */
function strdecode(buffer) {
    if (!buffer || (buffer.length || buffer.byteLength || 0) === 0) {
        return '';
    }

    // Fast path: use Buffer in Node.js
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(buffer)) {
        return buffer.toString('utf8');
    }

    // Fast path: use TextDecoder in browsers
    if (textDecoder) {
        return textDecoder.decode(buffer);
    }

    // Fallback: optimized UTF-8 decoding with better error handling
    const bytes = new Uint8Array(buffer);
    const length = bytes.length;
    const codePoints = [];
    let offset = 0;

    while (offset < length) {
        const byte1 = bytes[offset++];
        let codePoint;

        // Optimized UTF-8 decoding
        if (byte1 < 0x80) {
            // 1-byte sequence (ASCII)
            codePoint = byte1;
        } else if ((byte1 & 0xe0) === 0xc0) {
            // 2-byte sequence
            if (offset >= length) break;
            const byte2 = bytes[offset++];
            if ((byte2 & 0xc0) !== 0x80) {
                codePoint = 0xfffd; // Replacement character
            } else {
                codePoint = ((byte1 & 0x1f) << 6) | (byte2 & 0x3f);
            }
        } else if ((byte1 & 0xf0) === 0xe0) {
            // 3-byte sequence
            if (offset + 1 >= length) break;
            const byte2 = bytes[offset++];
            const byte3 = bytes[offset++];
            if ((byte2 & 0xc0) !== 0x80 || (byte3 & 0xc0) !== 0x80) {
                codePoint = 0xfffd; // Replacement character
            } else {
                codePoint = ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f);
            }
        } else if ((byte1 & 0xf8) === 0xf0) {
            // 4-byte sequence
            if (offset + 2 >= length) break;
            const byte2 = bytes[offset++];
            const byte3 = bytes[offset++];
            const byte4 = bytes[offset++];
            if ((byte2 & 0xc0) !== 0x80 || (byte3 & 0xc0) !== 0x80 || (byte4 & 0xc0) !== 0x80) {
                codePoint = 0xfffd; // Replacement character
            } else {
                codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f);
            }
        } else {
            // Invalid start byte
            codePoint = 0xfffd; // Replacement character
        }

        // Convert code point to UTF-16 (handle surrogate pairs)
        if (codePoint <= 0xffff) {
            codePoints.push(codePoint);
        } else {
            // Convert to surrogate pair
            codePoint -= 0x10000;
            codePoints.push(0xd800 + (codePoint >> 10));
            codePoints.push(0xdc00 + (codePoint & 0x3ff));
        }
    }

    return String.fromCharCode.apply(null, codePoints);
}

/**
 * Calculate string byte length without encoding
 * @param  {String} str string to measure
 * @return {Number} byte length when encoded as UTF-8
 */
function getStringByteLength(str) {
    if (typeof str !== 'string') {
        throw new TypeError('Expected string input');
    }

    if (typeof Buffer !== 'undefined') {
        return Buffer.byteLength(str, 'utf8');
    }

    // Estimate based on character count (conservative)
    return str.length * 4;
}

/**
 * Check if string is ASCII only
 * @param  {String} str string to check
 * @return {Boolean} true if string is ASCII only
 */
function isAsciiString(str) {
    if (typeof str !== 'string') {
        throw new TypeError('Expected string input');
    }

    for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 0x7f) {
            return false;
        }
    }
    return true;
}

module.exports = {
    strencode,
    strdecode,
    getStringByteLength,
    isAsciiString
};
