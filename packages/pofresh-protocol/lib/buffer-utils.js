/**
 * Buffer utility functions for cross-platform compatibility
 */

/**
 * Create a buffer with specified length
 * @param {number} length - Buffer length
 * @returns {Buffer|Uint8Array} - New buffer
 */
function getAllocBuffer(length) {
    if (typeof length !== 'number' || length < 0 || !Number.isInteger(length)) {
        throw new TypeError('Length must be a non-negative integer');
    }

    if (length > 0x7FFFFFFF) {
        throw new RangeError('Length exceeds maximum buffer size');
    }

    if (typeof Buffer !== 'undefined') {
        return Buffer.alloc(length);
    } else {
        return new Uint8Array(length);
    }
}

/**
 * Create a buffer from existing data
 * @param {Buffer|Uint8Array|ArrayBuffer|Array|string} data - Source data
 * @returns {Buffer|Uint8Array} - New buffer
 */
function getFromBuffer(data) {
    if (data == null) {
        throw new TypeError('Data cannot be null or undefined');
    }

    if (typeof Buffer !== 'undefined') {
        if (Buffer.isBuffer(data)) {
            return data;
        }
        return Buffer.from(data);
    } else {
        if (data instanceof Uint8Array) {
            return data;
        }
        if (data instanceof ArrayBuffer) {
            return new Uint8Array(data);
        }
        if (Array.isArray(data)) {
            return new Uint8Array(data);
        }
        if (typeof data === 'string') {
            // Convert string to UTF-8 bytes
            const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
            if (encoder) {
                return encoder.encode(data);
            }
            // Fallback for environments without TextEncoder
            const bytes = [];
            for (let i = 0; i < data.length; i++) {
                const code = data.charCodeAt(i);
                if (code < 128) {
                    bytes.push(code);
                } else {
                    // Simple ASCII-only fallback
                    bytes.push(63); // '?' character
                }
            }
            return new Uint8Array(bytes);
        }
        return new Uint8Array(data);
    }
}

/**
 * Copy data from source to destination buffer
 * @param {Buffer|Uint8Array} dest - Destination buffer
 * @param {number} doffset - Destination offset
 * @param {Buffer|Uint8Array} src - Source buffer
 * @param {number} soffset - Source offset
 * @param {number} length - Number of bytes to copy
 */
function copyArray(dest, doffset, src, soffset, length) {
    if (!dest || !src) {
        throw new TypeError('Destination and source buffers are required');
    }

    if (typeof doffset !== 'number' || typeof soffset !== 'number' || typeof length !== 'number') {
        throw new TypeError('Offsets and length must be numbers');
    }

    if (doffset < 0 || soffset < 0 || length < 0) {
        throw new RangeError('Offsets and length must be non-negative');
    }

    if (length === 0) {
        return; // Nothing to copy
    }

    const destLength = dest.length || dest.byteLength || 0;
    const srcLength = src.length || src.byteLength || 0;

    if (doffset + length > destLength) {
        throw new RangeError('Destination buffer overflow');
    }

    if (soffset + length > srcLength) {
        throw new RangeError('Source buffer overflow');
    }

    if (typeof src.copy === 'function' && typeof dest.set !== 'function') {
        // Buffer to Buffer
        src.copy(dest, doffset, soffset, soffset + length);
    } else if (typeof dest.set === 'function' && src.subarray) {
        // Uint8Array optimized copy
        dest.set(src.subarray(soffset, soffset + length), doffset);
    } else {
        // Fallback byte-by-byte copy
        for (let index = 0; index < length; index++) {
            dest[doffset + index] = src[soffset + index];
        }
    }
}

module.exports = {
    getAllocBuffer,
    getFromBuffer,
    copyArray
};
