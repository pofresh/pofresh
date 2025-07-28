/**
 * Package protocol implementation
 */

const {
    PKG_HEAD_BYTES,
    TYPE_HANDSHAKE,
    TYPE_HANDSHAKE_ACK,
    TYPE_HEARTBEAT,
    TYPE_DATA,
    TYPE_KICK
} = require('./constants');
const { getAllocBuffer, getFromBuffer, copyArray } = require('./buffer-utils');

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
        // Validate package type
        if (typeof type !== 'number' || !Number.isInteger(type)) {
            throw new TypeError('Package type must be an integer');
        }

        if (type < TYPE_HANDSHAKE || type > TYPE_KICK) {
            throw new RangeError(`Invalid package type: ${type}. Must be between ${TYPE_HANDSHAKE} and ${TYPE_KICK}`);
        }

        // Validate body
        const length = body ? (body.length || body.byteLength || 0) : 0;

        // Check maximum body length (24-bit length field)
        if (length > 0xFFFFFF) {
            throw new RangeError(`Package body too large: ${length} bytes. Maximum is ${0xFFFFFF} bytes`);
        }

        const buffer = getAllocBuffer(PKG_HEAD_BYTES + length);
        let index = 0;

        // Encode package type
        buffer[index++] = type & 0xFF;

        // Encode body length (24-bit big-endian)
        buffer[index++] = (length >> 16) & 0xFF;
        buffer[index++] = (length >> 8) & 0xFF;
        buffer[index++] = length & 0xFF;

        // Copy body if present
        if (body && length > 0) {
            copyArray(buffer, index, body, 0, length);
        }

        return buffer;
    }

    /**
     * Package protocol decode.
     * See encode for package format.
     *
     * @param  {ByteArray} buffer byte array containing package content
     * @return {Object|Array}     {type: package type, body: body byte array} or array of packages
     */
    static decode(buffer) {
        if (!buffer) {
            throw new TypeError('Buffer is required for decoding');
        }

        const bytes = getFromBuffer(buffer);
        const totalLength = bytes.length || bytes.byteLength || 0;

        if (totalLength === 0) {
            throw new Error('Empty buffer cannot be decoded');
        }

        let offset = 0;
        const packages = [];

        while (offset < totalLength) {
            // Check if we have enough bytes for the header
            if (offset + PKG_HEAD_BYTES > totalLength) {
                throw new Error(`Incomplete package header at offset ${offset}. Need ${PKG_HEAD_BYTES} bytes, got ${totalLength - offset}`);
            }

            // Read package type
            const type = bytes[offset++];

            // Validate package type
            if (type < TYPE_HANDSHAKE || type > TYPE_KICK) {
                throw new Error(`Invalid package type: ${type} at offset ${offset - 1}`);
            }

            // Read body length (24-bit big-endian)
            const length = ((bytes[offset++] << 16) | (bytes[offset++] << 8) | bytes[offset++]) >>> 0;

            // Check if we have enough bytes for the body
            if (offset + length > totalLength) {
                throw new Error(`Incomplete package body at offset ${offset}. Need ${length} bytes, got ${totalLength - offset}`);
            }

            // Extract body
            let body = null;
            if (length > 0) {
                body = getAllocBuffer(length);
                copyArray(body, 0, bytes, offset, length);
            }

            offset += length;
            packages.push({ type, body });
        }

        // Return single package or array of packages
        return packages.length === 1 ? packages[0] : packages;
    }
}

module.exports = Package;
