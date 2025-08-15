/**
 * Message utility functions with optimized performance and enhanced error handling
 */

const {
    TYPE_REQUEST,
    TYPE_RESPONSE,
    TYPE_NOTIFY,
    TYPE_PUSH,
    MSG_FLAG_BYTES,
    MSG_COMPRESS_GZIP_ENCODE_MASK,
    MSG_TYPE_MASK
} = require('./constants');
const { getAllocBuffer, copyArray } = require('./buffer-utils');
const { strencode } = require('./string-codec');

// Cache for frequently used constants
const ID_REQUIRED_TYPES = new Set([TYPE_REQUEST, TYPE_RESPONSE]);
const ROUTE_REQUIRED_TYPES = new Set([TYPE_REQUEST, TYPE_NOTIFY, TYPE_PUSH]);

/**
 * Check if message has an ID with optimized performance
 * @param {number} type - Message type
 * @returns {boolean} - True if message has ID
 */
function msgHasId(type) {
    return ID_REQUIRED_TYPES.has(type);
}

/**
 * Check if message has a route with optimized performance
 * @param {number} type - Message type
 * @returns {boolean} - True if message has route
 */
function msgHasRoute(type) {
    return ROUTE_REQUIRED_TYPES.has(type);
}

/**
 * Calculate bytes needed for message ID with optimized performance
 * @param {number} id - Message ID
 * @returns {number} - Number of bytes needed
 */
function calculateMsgIdBytes(id) {
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 0) {
        throw new TypeError('Message ID must be a non-negative integer');
    }

    if (id === 0) {
        return 1;
    }

    let len = 0;
    let tempId = id;
    do {
        len += 1;
        tempId >>>= 7; // Use unsigned right shift
    } while (tempId > 0);
    return len;
}

/**
 * Encode message flag with optimized performance
 * @param {number} type - Message type
 * @param {boolean} compressRoute - Whether to compress route
 * @param {Buffer|Uint8Array} buffer - Target buffer
 * @param {number} offset - Buffer offset
 * @param {boolean} compressGzip - Whether to compress with gzip
 * @returns {number} - New offset
 */
function encodeMsgFlag(type, compressRoute, buffer, offset, compressGzip) {
    // Validate message type
    if (type < TYPE_REQUEST || type > TYPE_PUSH) {
        throw new Error(`Unknown message type: ${type}`);
    }

    // Optimized flag encoding with bitwise operations
    let flag = (type << 1) | (compressRoute ? 1 : 0);
    if (compressGzip) {
        flag |= MSG_COMPRESS_GZIP_ENCODE_MASK;
    }

    buffer[offset] = flag;
    return offset + MSG_FLAG_BYTES;
}

/**
 * Encode message ID with optimized performance
 * @param {number} id - Message ID
 * @param {Buffer|Uint8Array} buffer - Target buffer
 * @param {number} offset - Buffer offset
 * @returns {number} - New offset
 */
function encodeMsgId(id, buffer, offset) {
    // Validate inputs
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 0) {
        throw new TypeError('Message ID must be a non-negative integer');
    }

    if (!buffer) {
        throw new TypeError('Buffer is required');
    }

    if (typeof offset !== 'number' || offset < 0) {
        throw new TypeError('Offset must be a non-negative number');
    }

    // Optimized variable-length integer encoding
    let tempId = id;
    do {
        let byte = tempId & 0x7f;
        tempId >>>= 7;

        if (tempId !== 0) {
            byte |= 0x80; // Set continuation bit
        }

        if (offset >= buffer.length) {
            throw new RangeError('Buffer overflow while encoding message ID');
        }

        buffer[offset++] = byte;
    } while (tempId !== 0);

    return offset;
}

/**
 * Decode message ID with optimized performance
 * @param {Buffer|Uint8Array} buffer - Source buffer
 * @param {number} offset - Buffer offset
 * @returns {Object} - {id: decoded ID, newOffset: new offset}
 */
function decodeMsgId(buffer, offset) {
    if (!buffer) {
        throw new TypeError('Buffer is required');
    }

    if (typeof offset !== 'number' || offset < 0) {
        throw new TypeError('Offset must be a non-negative number');
    }

    const bufferLength = buffer.length || buffer.byteLength || 0;
    if (offset >= bufferLength) {
        throw new Error('Buffer overflow while decoding message ID');
    }

    let id = 0;
    let shift = 0;
    let byte;

    do {
        byte = buffer[offset++];
        id |= (byte & 0x7f) << shift;
        shift += 7;

        // Prevent infinite loop and overflow
        if (shift > 35) {
            throw new Error('Message ID too large or malformed');
        }
    } while (byte >= 128);

    return { id, newOffset: offset };
}

/**
 * Encode message route with optimized performance
 * @param {boolean} compressRoute - Whether to compress route
 * @param {number|string|Buffer|Uint8Array} route - Route code, string, or pre-encoded buffer
 * @param {Buffer|Uint8Array} buffer - Target buffer
 * @param {number} offset - Buffer offset
 * @returns {number} - New offset
 */
function encodeMsgRoute(compressRoute, route, buffer, offset) {
    const { MSG_ROUTE_CODE_MAX } = require('./constants');

    // Validate inputs
    if (!buffer) {
        throw new TypeError('Buffer is required');
    }

    if (typeof offset !== 'number' || offset < 0) {
        throw new TypeError('Offset must be a non-negative number');
    }

    if (compressRoute) {
        // Compressed route handling (2 bytes)
        if (typeof route !== 'number' || !Number.isInteger(route) || route < 0) {
            throw new TypeError('Compressed route must be a non-negative integer');
        }

        if (route > MSG_ROUTE_CODE_MAX) {
            throw new RangeError(`Route number ${route} exceeds maximum ${MSG_ROUTE_CODE_MAX}`);
        }

        if (offset + 2 > (buffer.length || buffer.byteLength || 0)) {
            throw new RangeError('Buffer overflow while encoding compressed route');
        }

        // Optimized 16-bit encoding
        buffer[offset++] = (route >> 8) & 0xff;
        buffer[offset++] = route & 0xff;
    } else {
        // Uncompressed route handling
        if (offset >= (buffer.length || buffer.byteLength || 0)) {
            throw new RangeError('Buffer overflow while encoding route length');
        }

        if (route != null) {
            let routeBuffer;

            // Fast path for pre-encoded buffers
            if (route instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(route))) {
                routeBuffer = route;
            } else if (typeof route === 'string') {
                routeBuffer = strencode(route);
            } else {
                throw new TypeError('Route must be a string or buffer');
            }

            const routeLength = routeBuffer.length;
            if (routeLength > 255) {
                throw new RangeError(`Route too long: ${routeLength} bytes. Maximum is 255 bytes`);
            }

            if (offset + 1 + routeLength > (buffer.length || buffer.byteLength || 0)) {
                throw new RangeError('Buffer overflow while encoding route');
            }

            // Optimized route encoding
            buffer[offset++] = routeLength & 0xff;
            copyArray(buffer, offset, routeBuffer, 0, routeLength);
            offset += routeLength;
        } else {
            buffer[offset++] = 0;
        }
    }

    return offset;
}

/**
 * Decode message route with optimized performance
 * @param {boolean} compressRoute - Whether route is compressed
 * @param {Buffer|Uint8Array} buffer - Source buffer
 * @param {number} offset - Buffer offset
 * @returns {Object} - {route: decoded route, newOffset: new offset}
 */
function decodeMsgRoute(compressRoute, buffer, offset) {
    if (!buffer) {
        throw new TypeError('Buffer is required');
    }

    if (typeof offset !== 'number' || offset < 0) {
        throw new TypeError('Offset must be a non-negative number');
    }

    const bufferLength = buffer.length || buffer.byteLength || 0;

    if (compressRoute) {
        // Compressed route decoding (2 bytes)
        if (offset + 2 > bufferLength) {
            throw new Error('Incomplete compressed route: need 2 bytes, got less');
        }

        const route = ((buffer[offset++] << 8) | buffer[offset++]) >>> 0;
        return { route, newOffset: offset };
    } else {
        // Uncompressed route decoding
        if (offset >= bufferLength) {
            throw new Error('Missing route length byte');
        }

        const routeLength = buffer[offset++];
        if (routeLength > 0) {
            if (offset + routeLength > bufferLength) {
                throw new Error(`Incomplete route: expected ${routeLength} bytes, got ${bufferLength - offset}`);
            }

            const routeBuffer = getAllocBuffer(routeLength);
            copyArray(routeBuffer, 0, buffer, offset, routeLength);
            const route = require('./string-codec').strdecode(routeBuffer);
            offset += routeLength;

            return { route, newOffset: offset };
        } else {
            return { route: '', newOffset: offset };
        }
    }
}

/**
 * Encode message body with optimized performance
 * @param {Buffer|Uint8Array} msg - Message body
 * @param {Buffer|Uint8Array} buffer - Target buffer
 * @param {number} offset - Buffer offset
 * @returns {number} - New offset
 */
function encodeMsgBody(msg, buffer, offset) {
    if (!msg) {
        return offset;
    }

    if (!buffer) {
        throw new TypeError('Buffer is required');
    }

    if (typeof offset !== 'number' || offset < 0) {
        throw new TypeError('Offset must be a non-negative number');
    }

    const msgLength = msg.length || msg.byteLength || 0;

    if (msgLength === 0) {
        return offset;
    }

    if (offset + msgLength > (buffer.length || buffer.byteLength || 0)) {
        throw new RangeError('Buffer overflow while encoding message body');
    }

    copyArray(buffer, offset, msg, 0, msgLength);
    return offset + msgLength;
}

/**
 * Decode message body with optimized performance
 * @param {Buffer|Uint8Array} buffer - Source buffer
 * @param {number} offset - Buffer offset
 * @param {number} length - Message body length
 * @returns {Object} - {body: decoded body, newOffset: new offset}
 */
function decodeMsgBody(buffer, offset, length) {
    if (!buffer) {
        throw new TypeError('Buffer is required');
    }

    if (typeof offset !== 'number' || offset < 0) {
        throw new TypeError('Offset must be a non-negative number');
    }

    if (typeof length !== 'number' || length < 0) {
        throw new TypeError('Message body length must be non-negative');
    }

    const bufferLength = buffer.length || buffer.byteLength || 0;

    if (offset + length > bufferLength) {
        throw new Error(`Incomplete message body: expected ${length} bytes, got ${bufferLength - offset}`);
    }

    if (length === 0) {
        return { body: getAllocBuffer(0), newOffset: offset };
    }

    const body = getAllocBuffer(length);
    copyArray(body, 0, buffer, offset, length);
    return { body, newOffset: offset + length };
}

/**
 * Calculate total message size for pre-allocation
 * @param {number} id - Message ID
 * @param {number} type - Message type
 * @param {boolean} compressRoute - Whether to compress route
 * @param {number|string|null} route - Route code or string
 * @param {Buffer|Uint8Array|null} body - Message body
 * @returns {number} - Total message size in bytes
 */
function calculateMessageSize(id, type, compressRoute, route, body) {
    let size = MSG_FLAG_BYTES;

    // Add message ID size if required
    if (msgHasId(type)) {
        size += calculateMsgIdBytes(id);
    }

    // Add route size if required
    if (msgHasRoute(type)) {
        if (compressRoute) {
            size += 2; // Compressed route is 2 bytes
        } else {
            size += 1; // Route length byte
            if (route != null) {
                if (typeof route === 'string') {
                    size += require('./string-codec').getStringByteLength(route);
                } else if (route instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(route))) {
                    size += route.length || route.byteLength || 0;
                }
            }
        }
    }

    // Add body size
    if (body) {
        size += body.length || body.byteLength || 0;
    }

    return size;
}

module.exports = {
    // Basic checks
    msgHasId,
    msgHasRoute,
    
    // ID handling
    calculateMsgIdBytes,
    encodeMsgId,
    decodeMsgId,
    
    // Flag handling
    encodeMsgFlag,
    
    // Route handling
    encodeMsgRoute,
    decodeMsgRoute,
    
    // Body handling
    encodeMsgBody,
    decodeMsgBody,
    
    // Utility functions
    calculateMessageSize
};
