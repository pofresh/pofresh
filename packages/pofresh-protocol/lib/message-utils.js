/**
 * Message utility functions
 */

const {
    TYPE_REQUEST,
    TYPE_RESPONSE,
    TYPE_NOTIFY,
    TYPE_PUSH,
    MSG_FLAG_BYTES,
    MSG_COMPRESS_GZIP_ENCODE_MASK
} = require('./constants');
const { copyArray } = require('./buffer-utils');
const { strencode } = require('./string-codec');

/**
 * Check if message has an ID
 * @param {number} type - Message type
 * @returns {boolean} - True if message has ID
 */
function msgHasId(type) {
    return type === TYPE_REQUEST || type === TYPE_RESPONSE;
}

/**
 * Check if message has a route
 * @param {number} type - Message type
 * @returns {boolean} - True if message has route
 */
function msgHasRoute(type) {
    return type === TYPE_REQUEST || type === TYPE_NOTIFY || type === TYPE_PUSH;
}

/**
 * Calculate bytes needed for message ID
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
 * Encode message flag
 * @param {number} type - Message type
 * @param {boolean} compressRoute - Whether to compress route
 * @param {Buffer|Uint8Array} buffer - Target buffer
 * @param {number} offset - Buffer offset
 * @param {boolean} compressGzip - Whether to compress with gzip
 * @returns {number} - New offset
 */
function encodeMsgFlag(type, compressRoute, buffer, offset, compressGzip) {
    if (![TYPE_REQUEST, TYPE_NOTIFY, TYPE_RESPONSE, TYPE_PUSH].includes(type)) {
        throw new Error('Unknown message type: ' + type);
    }

    buffer[offset] = (type << 1) | (compressRoute ? 1 : 0);

    if (compressGzip) {
        buffer[offset] = buffer[offset] | MSG_COMPRESS_GZIP_ENCODE_MASK;
    }

    return offset + MSG_FLAG_BYTES;
}

/**
 * Encode message ID
 * @param {number} id - Message ID
 * @param {Buffer|Uint8Array} buffer - Target buffer
 * @param {number} offset - Buffer offset
 * @returns {number} - New offset
 */
function encodeMsgId(id, buffer, offset) {
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 0) {
        throw new TypeError('Message ID must be a non-negative integer');
    }

    if (!buffer) {
        throw new TypeError('Buffer is required');
    }

    if (typeof offset !== 'number' || offset < 0) {
        throw new TypeError('Offset must be a non-negative number');
    }

    let tempId = id;
    do {
        let byte = tempId & 0x7F;
        tempId >>>= 7; // Use unsigned right shift

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
 * Encode message route
 * @param {boolean} compressRoute - Whether to compress route
 * @param {number|string|Buffer|Uint8Array} route - Route code, string, or pre-encoded buffer
 * @param {Buffer|Uint8Array} buffer - Target buffer
 * @param {number} offset - Buffer offset
 * @returns {number} - New offset
 */
function encodeMsgRoute(compressRoute, route, buffer, offset) {
    const { MSG_ROUTE_CODE_MAX } = require('./constants');

    if (!buffer) {
        throw new TypeError('Buffer is required');
    }

    if (typeof offset !== 'number' || offset < 0) {
        throw new TypeError('Offset must be a non-negative number');
    }

    if (compressRoute) {
        if (typeof route !== 'number' || !Number.isInteger(route) || route < 0) {
            throw new TypeError('Compressed route must be a non-negative integer');
        }

        if (route > MSG_ROUTE_CODE_MAX) {
            throw new RangeError(`Route number ${route} exceeds maximum ${MSG_ROUTE_CODE_MAX}`);
        }

        if (offset + 2 > buffer.length) {
            throw new RangeError('Buffer overflow while encoding compressed route');
        }

        buffer[offset++] = (route >> 8) & 0xFF;
        buffer[offset++] = route & 0xFF;
    } else {
        if (offset >= buffer.length) {
            throw new RangeError('Buffer overflow while encoding route length');
        }

        if (route != null) {
            let routeBuffer;

            // Handle pre-encoded route buffer
            if (route instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(route))) {
                routeBuffer = route;
            } else if (typeof route === 'string') {
                routeBuffer = strencode(route);
            } else {
                throw new TypeError('Route must be a string or buffer');
            }

            if (routeBuffer.length > 255) {
                throw new RangeError(`Route too long: ${routeBuffer.length} bytes. Maximum is 255 bytes`);
            }

            if (offset + 1 + routeBuffer.length > buffer.length) {
                throw new RangeError('Buffer overflow while encoding route');
            }

            buffer[offset++] = routeBuffer.length & 0xFF;
            copyArray(buffer, offset, routeBuffer, 0, routeBuffer.length);
            offset += routeBuffer.length;
        } else {
            buffer[offset++] = 0;
        }
    }

    return offset;
}

/**
 * Encode message body
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

    if (offset + msgLength > buffer.length) {
        throw new RangeError('Buffer overflow while encoding message body');
    }

    copyArray(buffer, offset, msg, 0, msgLength);
    return offset + msgLength;
}

module.exports = {
    msgHasId,
    msgHasRoute,
    calculateMsgIdBytes,
    encodeMsgFlag,
    encodeMsgId,
    encodeMsgRoute,
    encodeMsgBody
};
