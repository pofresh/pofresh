/**
 * String encoding and decoding utilities
 */

const { copyArray } = require('./buffer-utils');

/**
 * Encode string to buffer
 * @param  {String} str string to encode
 * @return {Buffer|Uint8Array} encoded buffer
 */
function strencode(str) {
    if (typeof str !== 'string') {
        throw new TypeError('Expected string input');
    }

    if (typeof Buffer !== 'undefined') {
        // encoding defaults to 'utf8'
        return Buffer.from(str, 'utf8');
    }
    // Use TextEncoder for proper UTF-8 encoding in browsers
    if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(str);
    }

    // Fallback manual UTF-8 encoding with proper surrogate pair handling
    const byteArray = new Uint8Array(str.length * 4); // Increased buffer size for safety
    let offset = 0;

    for (let i = 0; i < str.length; i++) {
        let charCode = str.charCodeAt(i);

        // Handle surrogate pairs for characters > U+FFFF
        if (charCode >= 0xd8_00 && charCode <= 0xdb_ff && i + 1 < str.length) {
            const lowSurrogate = str.charCodeAt(i + 1);
            if (lowSurrogate >= 0xdc_00 && lowSurrogate <= 0xdf_ff) {
                charCode = 0x1_00_00 + ((charCode & 0x3_ff) << 10) + (lowSurrogate & 0x3_ff);
                i++; // Skip the low surrogate
            }
        }

        if (charCode <= 0x7f) {
            byteArray[offset++] = charCode;
        } else if (charCode <= 0x7_ff) {
            byteArray[offset++] = 0xc0 | (charCode >> 6);
            byteArray[offset++] = 0x80 | (charCode & 0x3f);
        } else if (charCode <= 0xff_ff) {
            byteArray[offset++] = 0xe0 | (charCode >> 12);
            byteArray[offset++] = 0x80 | ((charCode >> 6) & 0x3f);
            byteArray[offset++] = 0x80 | (charCode & 0x3f);
        } else {
            byteArray[offset++] = 0xf0 | (charCode >> 18);
            byteArray[offset++] = 0x80 | ((charCode >> 12) & 0x3f);
            byteArray[offset++] = 0x80 | ((charCode >> 6) & 0x3f);
            byteArray[offset++] = 0x80 | (charCode & 0x3f);
        }
    }

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
    if (!buffer || buffer.length === 0) {
        return '';
    }

    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(buffer)) {
        // encoding defaults to 'utf8'
        return buffer.toString('utf8');
    }
    // Use TextDecoder for proper UTF-8 decoding in browsers
    if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder('utf-8').decode(buffer);
    }

    // Fallback manual UTF-8 decoding with proper error handling
    const bytes = new Uint8Array(buffer);
    const codePoints = [];
    let offset = 0;
    const end = bytes.length;

    while (offset < end) {
        const byte1 = bytes[offset++];
        let codePoint;

        if (byte1 < 0x80) {
            // 1-byte sequence (ASCII)
            codePoint = byte1;
        } else if ((byte1 & 0xe0) === 0xc0) {
            // 2-byte sequence
            if (offset >= end) break;
            const byte2 = bytes[offset++];
            if ((byte2 & 0xc0) !== 0x80) {
                // Invalid continuation byte
                codePoint = 0xff_fd; // Replacement character
            } else {
                codePoint = ((byte1 & 0x1f) << 6) | (byte2 & 0x3f);
            }
        } else if ((byte1 & 0xf0) === 0xe0) {
            // 3-byte sequence
            if (offset + 1 >= end) break;
            const byte2 = bytes[offset++];
            const byte3 = bytes[offset++];
            if ((byte2 & 0xc0) !== 0x80 || (byte3 & 0xc0) !== 0x80) {
                codePoint = 0xff_fd; // Replacement character
            } else {
                codePoint = ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f);
            }
        } else if ((byte1 & 0xf8) === 0xf0) {
            // 4-byte sequence
            if (offset + 2 >= end) break;
            const byte2 = bytes[offset++];
            const byte3 = bytes[offset++];
            const byte4 = bytes[offset++];
            if ((byte2 & 0xc0) !== 0x80 || (byte3 & 0xc0) !== 0x80 || (byte4 & 0xc0) !== 0x80) {
                codePoint = 0xff_fd; // Replacement character
            } else {
                codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f);
            }
        } else {
            // Invalid start byte
            codePoint = 0xff_fd; // Replacement character
        }

        // Convert code point to UTF-16 (handle surrogate pairs)
        if (codePoint <= 0xff_ff) {
            codePoints.push(codePoint);
        } else {
            // Convert to surrogate pair
            codePoint -= 0x1_00_00;
            codePoints.push(0xd8_00 + (codePoint >> 10));
            codePoints.push(0xdc_00 + (codePoint & 0x3_ff));
        }
    }

    return String.fromCharCode.apply(null, codePoints);
}

module.exports = {
    strencode,
    strdecode
};
