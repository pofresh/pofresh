/**
 * Message protocol implementation
 */

const {
    TYPE_REQUEST,
    TYPE_NOTIFY,
    TYPE_RESPONSE,
    TYPE_PUSH,
    MSG_FLAG_BYTES,
    MSG_ROUTE_CODE_BYTES,
    MSG_ROUTE_LEN_BYTES,
    MSG_COMPRESS_ROUTE_MASK,
    MSG_COMPRESS_GZIP_MASK,
    MSG_TYPE_MASK
} = require('./constants');
const { getAllocBuffer, getFromBuffer, copyArray } = require('./buffer-utils');
const { strencode, strdecode } = require('./string-codec');
const {
    msgHasId,
    msgHasRoute,
    calculateMsgIdBytes,
    encodeMsgFlag,
    encodeMsgId,
    encodeMsgRoute,
    encodeMsgBody
} = require('./message-utils');

class Message {
    static TYPE_REQUEST = TYPE_REQUEST;
    static TYPE_NOTIFY = TYPE_NOTIFY;
    static TYPE_RESPONSE = TYPE_RESPONSE;
    static TYPE_PUSH = TYPE_PUSH;

    /**
     * Message protocol encode.
     *
     * @param  {Number} id            message id
     * @param  {Number} type          message type
     * @param  {Number} compressRoute whether compress route
     * @param  {Number|String} route  route code or route string
     * @param  {Buffer} msg           message body bytes
     * @param  {Buffer} compressGzip  compressGzip
     * @return {Buffer}               encode result
     */
    static encode(id, type, compressRoute, route, msg, compressGzip) {
        // Validate message type
        if (typeof type !== 'number' || !Number.isInteger(type)) {
            throw new TypeError('Message type must be an integer');
        }

        if (type < TYPE_REQUEST || type > TYPE_PUSH) {
            throw new RangeError(`Invalid message type: ${type}. Must be between ${TYPE_REQUEST} and ${TYPE_PUSH}`);
        }

        // Validate message ID for types that require it
        if (msgHasId(type)) {
            if (typeof id !== 'number' || !Number.isInteger(id) || id < 0) {
                throw new TypeError('Message ID must be a non-negative integer');
            }
            if (id > 0x7FFFFFFF) {
                throw new RangeError('Message ID too large');
            }
        }

        // Calculate message max length
        const idBytes = msgHasId(type) ? calculateMsgIdBytes(id) : 0;
        let msgLen = MSG_FLAG_BYTES + idBytes;
        let encodedRoute = null;

        if (msgHasRoute(type)) {
            if (compressRoute) {
                if (typeof route !== 'number' || !Number.isInteger(route) || route < 0) {
                    throw new TypeError('Compressed route must be a non-negative integer');
                }
                msgLen += MSG_ROUTE_CODE_BYTES;
            } else {
                msgLen += MSG_ROUTE_LEN_BYTES;
                if (route != null) {
                    if (typeof route !== 'string') {
                        throw new TypeError('Uncompressed route must be a string');
                    }
                    encodedRoute = strencode(route);
                    if (encodedRoute.length > 255) {
                        throw new RangeError(`Route too long: ${encodedRoute.length} bytes. Maximum is 255 bytes`);
                    }
                    msgLen += encodedRoute.length;
                }
            }
        }

        // Validate message body
        const msgBodyLength = msg ? (msg.length || msg.byteLength || 0) : 0;
        if (msgBodyLength > 0x7FFFFFFF) {
            throw new RangeError('Message body too large');
        }
        msgLen += msgBodyLength;

        const buffer = getAllocBuffer(msgLen);
        let offset = 0;

        // Add flag
        offset = encodeMsgFlag(type, compressRoute, buffer, offset, compressGzip);

        // Add message id
        if (msgHasId(type)) {
            offset = encodeMsgId(id, buffer, offset);
        }

        // Add route
        if (msgHasRoute(type)) {
            offset = encodeMsgRoute(compressRoute, encodedRoute || route, buffer, offset);
        }

        // Add body
        if (msg && msgBodyLength > 0) {
            encodeMsgBody(msg, buffer, offset);
        }

        return buffer;
    }

    /**
     * Message protocol decode.
     *
     * @param  {Buffer|Uint8Array} buffer message bytes
     * @return {Object}            message object
     */
    static decode(buffer) {
        if (!buffer) {
            throw new TypeError('Buffer is required for decoding');
        }

        const bytes = getFromBuffer(buffer);
        const bytesLen = bytes.length || bytes.byteLength || 0;

        if (bytesLen === 0) {
            throw new Error('Empty buffer cannot be decoded');
        }

        let offset = 0;
        let id = 0;
        let route = null;

        // Parse flag
        if (offset >= bytesLen) {
            throw new Error('Incomplete message: missing flag byte');
        }

        const flag = bytes[offset++];
        const compressRoute = flag & MSG_COMPRESS_ROUTE_MASK;
        const type = (flag >> 1) & MSG_TYPE_MASK;
        const compressGzip = (flag >> 4) & MSG_COMPRESS_GZIP_MASK;

        // Validate message type
        if (type < TYPE_REQUEST || type > TYPE_PUSH) {
            throw new Error(`Invalid message type: ${type}`);
        }

        // Parse ID
        if (msgHasId(type)) {
            let shift = 0;
            let byte;
            do {
                if (offset >= bytesLen) {
                    throw new Error('Incomplete message: truncated message ID');
                }
                byte = bytes[offset++];
                id += (byte & 0x7F) << shift;
                shift += 7;

                // Prevent infinite loop and overflow
                if (shift > 35) {
                    throw new Error('Message ID too large');
                }
            } while (byte >= 128);
        }

        // Parse route
        if (msgHasRoute(type)) {
            if (compressRoute) {
                if (offset + 1 >= bytesLen) {
                    throw new Error('Incomplete message: truncated compressed route');
                }
                route = (bytes[offset++] << 8) | bytes[offset++];
            } else {
                if (offset >= bytesLen) {
                    throw new Error('Incomplete message: missing route length');
                }
                const routeLen = bytes[offset++];
                if (offset + routeLen > bytesLen) {
                    throw new Error(`Incomplete message: truncated route. Expected ${routeLen} bytes, got ${bytesLen - offset}`);
                }

                if (routeLen > 0) {
                    const routeBuffer = getAllocBuffer(routeLen);
                    copyArray(routeBuffer, 0, bytes, offset, routeLen);
                    route = strdecode(routeBuffer);
                } else {
                    route = '';
                }
                offset += routeLen;
            }
        }

        // Parse body
        const bodyLen = bytesLen - offset;
        let body = null;

        if (bodyLen > 0) {
            body = getAllocBuffer(bodyLen);
            copyArray(body, 0, bytes, offset, bodyLen);
        } else {
            body = getAllocBuffer(0);
        }

        return {
            id,
            type,
            compressRoute,
            route,
            body,
            compressGzip
        };
    }
}

module.exports = Message;
