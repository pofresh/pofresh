/**
 * Create a buffer with specified length
 * @param {number} length - Buffer length
 * @returns {Buffer|Uint8Array} - New buffer
 */
function getAllocBuffer(length) {
    if (typeof length !== 'number' || length < 0 || !Number.isInteger(length)) {
        throw new TypeError('Length must be a non-negative integer');
    }

    if (length > 0x7f_ff_ff_ff) {
        throw new RangeError('Length exceeds maximum buffer size');
    }

    // Use Buffer.alloc for better memory management in Node.js
    if (typeof Buffer !== 'undefined') {
        return Buffer.alloc(length);
    }
    return new Uint8Array(length);
}

/**
 * Create a buffer from existing data with optimized performance
 * @param {Buffer|Uint8Array|ArrayBuffer|Array|string} data - Source data
 * @returns {Buffer|Uint8Array} - New buffer
 */
function getFromBuffer(data) {
    if (data == null) {
        throw new TypeError('Data cannot be null or undefined');
    }

    // Fast path for Buffer instances
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
        return data;
    }

    // Fast path for Uint8Array instances
    if (data instanceof Uint8Array) {
        return data;
    }

    // Fast path for ArrayBuffer
    if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    }

    // Fast path for Array
    if (Array.isArray(data)) {
        return new Uint8Array(data);
    }

    // String handling with optimized encoding
    if (typeof data === 'string') {
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(data);
        }

        // Fallback: optimized ASCII-only encoding for better performance
        const bytes = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            const code = data.charCodeAt(i);
            bytes[i] = code < 128 ? code : 63; // Replace non-ASCII with '?'
        }
        return bytes;
    }

    // Handle TypedArray and other array-like objects
    if (data.buffer && data.byteLength) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }

    throw new TypeError('Unsupported data type for buffer conversion');
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
    }
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

/**
 * Copy data from source to destination buffer with optimized performance
 * @param {Buffer|Uint8Array} dest - Destination buffer
 * @param {number} doffset - Destination offset
 * @param {Buffer|Uint8Array} src - Source buffer
 * @param {number} soffset - Source offset
 * @param {number} length - Number of bytes to copy
 */
function copyArray(dest, doffset, src, soffset, length) {
    if (!(dest && src)) {
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

    // Fastest path: Buffer to Buffer copy
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(dest) && Buffer.isBuffer(src)) {
        src.copy(dest, doffset, soffset, soffset + length);
        return;
    }

    // Fast path: Uint8Array to Uint8Array
    if (typeof dest.set === 'function' && typeof src.subarray === 'function') {
        dest.set(src.subarray(soffset, soffset + length), doffset);
        return;
    }

    // Fallback: optimized byte-by-byte copy
    for (let index = 0; index < length; index++) {
        dest[doffset + index] = src[soffset + index];
    }
}

/**
 * Efficient buffer slice operation that maintains buffer type
 * @param {Buffer|Uint8Array} buffer - Source buffer
 * @param {number} start - Start index
 * @param {number} end - End index (optional)
 * @returns {Buffer|Uint8Array} - Sliced buffer
 */
function sliceBuffer(buffer, start, end) {
    if (!buffer) {
        throw new TypeError('Buffer is required');
    }

    if (typeof start !== 'number' || start < 0) {
        throw new TypeError('Start index must be a non-negative number');
    }

    const bufferLength = buffer.length || buffer.byteLength || 0;
    const endIndex = end !== undefined ? end : bufferLength;

    if (endIndex > bufferLength) {
        throw new RangeError('End index exceeds buffer length');
    }

    if (start > endIndex) {
        throw new RangeError('Start index cannot be greater than end index');
    }

    const length = endIndex - start;

    if (length === 0) {
        return typeof Buffer !== 'undefined' ? Buffer.alloc(0) : new Uint8Array(0);
    }

    // Use optimized slice methods
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(buffer)) {
        return buffer.slice(start, endIndex);
    }

    if (typeof buffer.subarray === 'function') {
        return buffer.subarray(start, endIndex);
    }

    // Fallback for array-like objects
    const result = typeof Buffer !== 'undefined' ? Buffer.alloc(length) : new Uint8Array(length);
    copyArray(result, 0, buffer, start, length);
    return result;
}

/**
 * Check if two buffers are equal in content
 * @param {Buffer|Uint8Array} buf1 - First buffer
 * @param {Buffer|Uint8Array} buf2 - Second buffer
 * @returns {boolean} - True if buffers are equal
 */
function bufferEquals(buf1, buf2) {
    if (!buf1 || !buf2) {
        return false;
    }

    const len1 = buf1.length || buf1.byteLength || 0;
    const len2 = buf2.length || buf2.byteLength || 0;

    if (len1 !== len2) {
        return false;
    }

    // Fast path for same object
    if (buf1 === buf2) {
        return true;
    }

    // Use Buffer.equals if available
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(buf1) && Buffer.isBuffer(buf2)) {
        return buf1.equals(buf2);
    }

    // Manual comparison for other types
    for (let i = 0; i < len1; i++) {
        if (buf1[i] !== buf2[i]) {
            return false;
        }
    }

    return true;
}

module.exports = {
    getAllocBuffer,
    getFromBuffer,
    copyArray,
    sliceBuffer,
    bufferEquals
};
