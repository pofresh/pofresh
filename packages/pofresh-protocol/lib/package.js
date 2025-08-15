/**
 * Package protocol implementation with optimized performance and enhanced error handling
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
     * Package protocol encode with optimized performance.
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

        // Validate package type range
        const validTypes = [TYPE_HANDSHAKE, TYPE_HANDSHAKE_ACK, TYPE_HEARTBEAT, TYPE_DATA, TYPE_KICK];
        if (!validTypes.includes(type)) {
            throw new RangeError(`Invalid package type: ${type}. Valid types are: ${validTypes.join(', ')}`);
        }

        // Validate body and calculate length
        const length = body ? body.length || body.byteLength || 0 : 0;

        // Check maximum body length (24-bit length field)
        if (length > 0xffffff) {
            throw new RangeError(`Package body too large: ${length} bytes. Maximum is ${0xffffff} bytes`);
        }

        const buffer = getAllocBuffer(PKG_HEAD_BYTES + length);
        let index = 0;

        // Encode package type (optimized)
        buffer[index++] = type;

        // Encode body length (24-bit big-endian, optimized)
        if (length === 0) {
            buffer[index++] = 0;
            buffer[index++] = 0;
            buffer[index++] = 0;
        } else {
            buffer[index++] = (length >>> 16) & 0xff;
            buffer[index++] = (length >>> 8) & 0xff;
            buffer[index++] = length & 0xff;
        }

        // Copy body if present (optimized)
        if (body && length > 0) {
            copyArray(buffer, index, body, 0, length);
        }

        return buffer;
    }

    /**
     * Package protocol decode with optimized performance.
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

        // Validate buffer can hold at least one package header
        if (totalLength < PKG_HEAD_BYTES) {
            throw new Error(`Buffer too short: ${totalLength} bytes, minimum required is ${PKG_HEAD_BYTES} bytes`);
        }

        while (offset < totalLength) {
            // Check if we have enough bytes for the header
            if (offset + PKG_HEAD_BYTES > totalLength) {
                throw new Error(
                    `Incomplete package header at offset ${offset}. Need ${PKG_HEAD_BYTES} bytes, got ${totalLength - offset}`
                );
            }

            // Read package type (optimized)
            const type = bytes[offset++];

            // Validate package type
            const validTypes = [TYPE_HANDSHAKE, TYPE_HANDSHAKE_ACK, TYPE_HEARTBEAT, TYPE_DATA, TYPE_KICK];
            if (!validTypes.includes(type)) {
                throw new Error(`Invalid package type: ${type} at offset ${offset - 1}`);
            }

            // Read body length (24-bit big-endian, optimized)
            const length = ((bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2]) >>> 0;
            offset += PKG_HEAD_BYTES - 1; // Adjust offset for the type byte we already read

            // Check if we have enough bytes for the body
            if (offset + length > totalLength) {
                throw new Error(
                    `Incomplete package body at offset ${offset}. Need ${length} bytes, got ${totalLength - offset}`
                );
            }

            // Extract body (optimized)
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

      /**
     * Validate package data integrity
     * @param  {Object} pkg package object (decoded package)
     * @return {boolean} true if package is valid
     */
    static validate(pkg) {
        // Check if it's a decoded package object
        if (!pkg || typeof pkg !== 'object') {
            return false;
        }

        // Check if it's a Buffer (encoded package)
        if (pkg instanceof Buffer || (pkg.buffer && pkg.type === 'Buffer')) {
            return false;
        }

        // Check type
        if (typeof pkg.type !== 'number' || !Number.isInteger(pkg.type)) {
            return false;
        }

        // Access constants through the class
        const validTypes = [
            Package.TYPE_HANDSHAKE,
            Package.TYPE_HANDSHAKE_ACK,
            Package.TYPE_HEARTBEAT,
            Package.TYPE_DATA,
            Package.TYPE_KICK
        ];
        if (!validTypes.includes(pkg.type)) {
            return false;
        }

        // Check body
        if (pkg.body != null) {
            if (!(pkg.body instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(pkg.body)))) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get package string representation
     * @param  {Object} pkg package object (decoded package or Buffer)
     * @return {String} string representation
     */
    static toString(pkg) {
        if (!pkg) return 'Package(null)';
        
        // Handle Buffer (encoded package)
        if (pkg instanceof Buffer || (pkg.buffer && pkg.type === 'Buffer')) {
            return `EncodedPackage(length=${pkg.length} bytes)`;
        }
        
        const bodyLength = pkg.body ? (pkg.body.length || pkg.body.byteLength || 0) : 0;
        
        // Access constants through the class
        const typeNames = {
            [Package.TYPE_HANDSHAKE]: 'HANDSHAKE',
            [Package.TYPE_HANDSHAKE_ACK]: 'HANDSHAKE_ACK',
            [Package.TYPE_HEARTBEAT]: 'HEARTBEAT',
            [Package.TYPE_DATA]: 'DATA',
            [Package.TYPE_KICK]: 'KICK'
        };
        
        const typeName = typeNames[pkg.type] || 'UNKNOWN';
        return `Package(type=${pkg.type}(${typeName}), bodyLength=${bodyLength})`;
    }
}

module.exports = Package;
