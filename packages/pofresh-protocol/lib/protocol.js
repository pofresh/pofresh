/**
 * Protocol module for pofresh framework
 * Provides encoding/decoding for network packages and messages
 */

const PKG_HEAD_BYTES = 4;
const MSG_FLAG_BYTES = 1;
const MSG_ROUTE_CODE_BYTES = 2;
const MSG_ROUTE_LEN_BYTES = 1;

const MSG_ROUTE_CODE_MAX = 0xffff;

const MSG_COMPRESS_ROUTE_MASK = 0x1;
const MSG_COMPRESS_GZIP_MASK = 0x1;
const MSG_COMPRESS_GZIP_ENCODE_MASK = 1 << 4;
const MSG_TYPE_MASK = 0x7;

// Package types
const TYPE_HANDSHAKE = 1;
const TYPE_HANDSHAKE_ACK = 2;
const TYPE_HEARTBEAT = 3;
const TYPE_DATA = 4;
const TYPE_KICK = 5;

// Message types
const TYPE_REQUEST = 0;
const TYPE_NOTIFY = 1;
const TYPE_RESPONSE = 2;
const TYPE_PUSH = 3;

/**
 * Create a buffer with specified length
 * @param {number} length - Buffer length
 * @returns {Buffer|Uint8Array} - New buffer
 */
function getAllocBuffer(length) {
    if (typeof Buffer !== 'undefined') {
        return Buffer.alloc(length);
    } else {
        return new Uint8Array(length);
    }
}

/**
 * Create a buffer from existing data
 * @param {Buffer|Uint8Array|string} data - Source data
 * @returns {Buffer|Uint8Array} - New buffer
 */
function getFromBuffer(data) {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(data);
    } else {
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
    if (typeof src.copy === 'function') {
        // Buffer
        src.copy(dest, doffset, soffset, soffset + length);
    } else {
        // Uint8Array
        for (let index = 0; index < length; index++) {
            dest[doffset++] = src[soffset++];
        }
    }
}

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
    let len = 0;
    do {
        len += 1;
        id >>= 7;
    } while (id > 0);
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
    do {
        let tmp = id % 128;
        const next = Math.floor(id / 128);

        if (next !== 0) {
            tmp = tmp + 128;
        }
        buffer[offset++] = tmp;

        id = next;
    } while (id !== 0);

    return offset;
}

/**
 * Encode message route
 * @param {boolean} compressRoute - Whether to compress route
 * @param {number|string} route - Route code or string
 * @param {Buffer|Uint8Array} buffer - Target buffer
 * @param {number} offset - Buffer offset
 * @returns {number} - New offset
 */
function encodeMsgRoute(compressRoute, route, buffer, offset) {
    if (compressRoute) {
        if (route > MSG_ROUTE_CODE_MAX) {
            throw new Error('Route number is overflow');
        }

        buffer[offset++] = (route >> 8) & 0xff;
        buffer[offset++] = route & 0xff;
    } else {
        if (route) {
            buffer[offset++] = route.length & 0xff;
            copyArray(buffer, offset, route, 0, route.length);
            offset += route.length;
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
    copyArray(buffer, offset, msg, 0, msg.length);
    return offset + msg.length;
}

class Package {
    static TYPE_HANDSHAKE = TYPE_HANDSHAKE;
    static TYPE_HANDSHAKE_ACK = TYPE_HANDSHAKE_ACK;
    static TYPE_HEARTBEAT = TYPE_HEARTBEAT;
    static TYPE_DATA = TYPE_DATA;
    static TYPE_KICK = TYPE_KICK;

    /**
     * Package protocol encode.
     *
     * Pofresh package format:
     * +------+-------------+------------------+
     * | type | body length |       body       |
     * +------+-------------+------------------+
     *
     * Head: 4bytes
     *   0: package type,
     *      1 - handshake,
     *      2 - handshake ack,
     *      3 - heartbeat,
     *      4 - data
     *      5 - kick
     *   1 - 3: big-endian body length
     * Body: body length bytes
     *
     * @param  {Number}    type   package type
     * @param  {ByteArray} body   body content in bytes
     * @return {ByteArray}        new byte array that contains encode result
     */
    static encode(type, body) {
        const length = body ? body.length : 0;
        const buffer = getAllocBuffer(PKG_HEAD_BYTES + length);
        let index = 0;
        buffer[index++] = type & 0xff;
        buffer[index++] = (length >> 16) & 0xff;
        buffer[index++] = (length >> 8) & 0xff;
        buffer[index++] = length & 0xff;
        if (body) {
            copyArray(buffer, index, body, 0, length);
        }
        return buffer;
    }

    /**
     * Package protocol decode.
     * See encode for package format.
     *
     * @param  {ByteArray} buffer byte array containing package content
     * @return {Object}           {type: package type, buffer: body byte array}
     */
    static decode(buffer) {
        let offset = 0;
        const bytes = getFromBuffer(buffer);

        let length = 0;
        const rs = [];
        while (offset < bytes.length) {
            const type = bytes[offset++];
            length = ((bytes[offset++] << 16) | (bytes[offset++] << 8) | bytes[offset++]) >>> 0;
            const body = length ? getAllocBuffer(length) : null;
            if (body) {
                copyArray(body, 0, bytes, offset, length);
            }
            offset += length;
            rs.push({ type: type, body: body });
        }
        return rs.length === 1 ? rs[0] : rs;
    }
}

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
        // calculate message max length
        const idBytes = msgHasId(type) ? calculateMsgIdBytes(id) : 0;
        let msgLen = MSG_FLAG_BYTES + idBytes;

        if (msgHasRoute(type)) {
            if (compressRoute) {
                if (typeof route !== 'number') {
                    throw new Error('Error flag for number route!');
                }
                msgLen += MSG_ROUTE_CODE_BYTES;
            } else {
                msgLen += MSG_ROUTE_LEN_BYTES;
                if (route) {
                    route = Protocol.strencode(route);
                    if (route.length > 255) {
                        throw new Error('Route maxlength is overflow');
                    }
                    msgLen += route.length;
                }
            }
        }

        if (msg) {
            msgLen += msg.length;
        }

        const buffer = getAllocBuffer(msgLen);
        let offset = 0;

        // add flag
        offset = encodeMsgFlag(type, compressRoute, buffer, offset, compressGzip);

        // add message id
        if (msgHasId(type)) {
            offset = encodeMsgId(id, buffer, offset);
        }

        // add route
        if (msgHasRoute(type)) {
            offset = encodeMsgRoute(compressRoute, route, buffer, offset);
        }

        // add body
        if (msg) {
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
        const bytes = getFromBuffer(buffer);
        const bytesLen = bytes.length || bytes.byteLength;
        let offset = 0;
        let id = 0;
        let route = null;

        // parse flag
        const flag = bytes[offset++];
        const compressRoute = flag & MSG_COMPRESS_ROUTE_MASK;
        const type = (flag >> 1) & MSG_TYPE_MASK;
        const compressGzip = (flag >> 4) & MSG_COMPRESS_GZIP_MASK;

        // parse id
        if (msgHasId(type)) {
            let m = 0;
            let i = 0;
            do {
                m = parseInt(bytes[offset]);
                id += (m & 0x7f) << (7 * i);
                offset++;
                i++;
            } while (m >= 128);
        }

        // parse route
        if (msgHasRoute(type)) {
            if (compressRoute) {
                route = (bytes[offset++] << 8) | bytes[offset++];
            } else {
                const routeLen = bytes[offset++];
                if (routeLen) {
                    route = getAllocBuffer(routeLen);
                    copyArray(route, 0, bytes, offset, routeLen);
                    route = Protocol.strdecode(route);
                } else {
                    route = '';
                }
                offset += routeLen;
            }
        }

        // parse body
        const bodyLen = bytesLen - offset;
        const body = getAllocBuffer(bodyLen);

        copyArray(body, 0, bytes, offset, bodyLen);

        return {
            id: id,
            type: type,
            compressRoute: compressRoute,
            route: route,
            body: body,
            compressGzip: compressGzip
        };
    }
}

class Protocol {
    static Package = Package;
    static Message = Message;

    /**
     * pofresh client encode
     * @param  {String} str string to encode
     * @return {Buffer}     encoded buffer
     */
    static strencode(str) {
        if (typeof Buffer !== 'undefined') {
            // encoding defaults to 'utf8'
            return Buffer.from(str);
        } else {
            const byteArray = new Uint8Array(str.length * 3);
            let offset = 0;
            for (let i = 0; i < str.length; i++) {
                const charCode = str.charCodeAt(i);
                let codes = null;
                if (charCode <= 0x7f) {
                    codes = [charCode];
                } else if (charCode <= 0x7ff) {
                    codes = [0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f)];
                } else {
                    codes = [0xe0 | (charCode >> 12), 0x80 | ((charCode & 0xfc0) >> 6), 0x80 | (charCode & 0x3f)];
                }
                for (let j = 0; j < codes.length; j++) {
                    byteArray[offset] = codes[j];
                    ++offset;
                }
            }
            const _buffer = new Uint8Array(offset);
            copyArray(_buffer, 0, byteArray, 0, offset);
            return _buffer;
        }
    }

    /**
     * client decode
     * @param  {Buffer|Uint8Array} buffer string data
     * @return {String}                   decoded string
     */
    static strdecode(buffer) {
        if (typeof Buffer !== 'undefined') {
            // encoding defaults to 'utf8'
            return buffer.toString();
        } else {
            const bytes = new Uint8Array(buffer);
            const array = [];
            let offset = 0;
            let charCode = 0;
            const end = bytes.length;
            while (offset < end) {
                if (bytes[offset] < 128) {
                    charCode = bytes[offset];
                    offset += 1;
                } else if (bytes[offset] < 224) {
                    charCode = ((bytes[offset] & 0x1f) << 6) + (bytes[offset + 1] & 0x3f);
                    offset += 2;
                } else {
                    charCode =
                        ((bytes[offset] & 0x0f) << 12) + ((bytes[offset + 1] & 0x3f) << 6) + (bytes[offset + 2] & 0x3f);
                    offset += 3;
                }
                array.push(charCode);
            }
            return String.fromCharCode.apply(null, array);
        }
    }
}

// For backward compatibility
const protocolExport = typeof window === 'undefined' ? module.exports : (this.Protocol = {});
Object.assign(protocolExport, Protocol);

// Also export classes directly
if (typeof window === 'undefined') {
    module.exports = Protocol;
    module.exports.Package = Package;
    module.exports.Message = Message;
} else {
    window.Protocol = Protocol;
    window.Package = Package;
    window.Message = Message;
}
