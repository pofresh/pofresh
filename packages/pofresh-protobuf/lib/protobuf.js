/**
 * Pofresh Protobuf Library
 *
 * A high-performance Protocol Buffers implementation for Node.js applications.
 * Built on top of protobufjs for reliable encoding and decoding.
 *
 * @module protobuf
 * @version 2.0.0
 * @author Pofresh Team
 */

const protobuf = require('protobufjs');
const parser = require('./parser');

const Protobuf = module.exports;

// Internal state
let encoderRoot = null;
let decoderRoot = null;
let _encoderProtos = null;
let _decoderProtos = null;

/**
 * Create protobufjs root from parsed protos
 * @param {Object} protos - Parsed protobuf definitions
 * @returns {protobuf.Root} protobufjs root instance
 */
function createProtobufRoot(protos) {
    const root = new protobuf.Root();

    function createMessageType(messageProto, messageName) {
        const messageType = new protobuf.Type(messageName);

        // Add nested message types first
        if (messageProto.__messages) {
            for (const nestedName in messageProto.__messages) {
                const nestedProto = messageProto.__messages[nestedName];
                const nestedType = createMessageType(nestedProto, nestedName);
                messageType.add(nestedType);
            }
        }

        // Add fields
        for (const fieldName in messageProto) {
            if (fieldName.startsWith('__')) {
                continue;
            }

            const fieldProto = messageProto[fieldName];
            let fieldType = convertFieldType(fieldProto.type);

            // Check if this field type is a nested message
            if (messageProto.__messages?.[fieldProto.type]) {
                fieldType = fieldProto.type; // Use the nested message name directly
            }

            const rule =
                fieldProto.option === 'repeated'
                    ? 'repeated'
                    : fieldProto.option === 'required'
                      ? 'required'
                      : 'optional';

            messageType.add(new protobuf.Field(fieldName, fieldProto.tag, fieldType, rule));
        }

        return messageType;
    }

    // Create all top-level message types
    for (const messageName in protos) {
        const safeName = messageName.replace(/\./g, '_');
        const messageType = createMessageType(protos[messageName], safeName);
        root.add(messageType);
    }

    return root;
}

/**
 * Convert field type from custom format to protobufjs format
 * @param {string} type - Custom field type
 * @returns {string} protobufjs field type
 */
function convertFieldType(type) {
    const typeMap = {
        uInt32: 'uint32',
        sInt32: 'sint32',
        int32: 'int32',
        uInt64: 'uint64',
        sInt64: 'sint64',
        float: 'float',
        double: 'double',
        bool: 'bool',
        string: 'string',
        bytes: 'bytes'
    };

    return typeMap[type] || type;
}

/**
 * Encode a message using Protocol Buffers format
 *
 * @param {string} route - The route identifier for the message type
 * @param {Object} message - The message object to encode
 * @returns {Buffer} The encoded message as a Buffer
 * @throws {Error} If encoding fails or parameters are invalid
 *
 * @example
 * const encoded = Protobuf.encode('user.login', { username: 'john', password: 'secret' });
 */
Protobuf.encode = (route, message) => {
    if (typeof route !== 'string' || !route.trim()) {
        throw new Error('Route must be a non-empty string');
    }
    if (message === null || message === undefined) {
        throw new Error('Message cannot be null or undefined');
    }

    if (!encoderRoot) {
        throw new Error('Encoder not initialized. Call Protobuf.init() first.');
    }

    try {
        // Replace dots with underscores for protobufjs compatibility
        const safeName = route.replace(/\./g, '_');
        const MessageType = encoderRoot.lookupType(safeName);
        if (!MessageType) {
            throw new Error(`Message type '${route}' not found in encoder protos`);
        }

        // Verify the message
        const errMsg = MessageType.verify(message);
        if (errMsg) {
            throw new Error(`Message verification failed: ${errMsg}`);
        }

        // Encode the message
        const encodedMessage = MessageType.encode(message).finish();
        return Buffer.from(encodedMessage);
    } catch (error) {
        throw new Error(`Failed to encode message for route '${route}': ${error.message}`);
    }
};

/**
 * Encode a message and return as Uint8Array
 *
 * @param {string} route - The route identifier for the message type
 * @param {Object} message - The message object to encode
 * @returns {Uint8Array|null} The encoded message as Uint8Array, or null if encoding fails
 *
 * @example
 * const bytes = Protobuf.encode2Bytes('user.login', { username: 'john' });
 */
Protobuf.encode2Bytes = function (route, message) {
    try {
        const buffer = this.encode(route, message);
        if (!buffer?.length) {
            return null;
        }

        // Convert Buffer to Uint8Array efficiently
        return new Uint8Array(buffer);
    } catch (_error) {
        // Return null for backward compatibility, but could throw in strict mode
        return null;
    }
};

/**
 * Encode a message and return as encoded string
 *
 * @param {string} route - The route identifier for the message type
 * @param {Object} message - The message object to encode
 * @param {string} [encoding='base64'] - The string encoding format (base64, hex, etc.)
 * @returns {string|null} The encoded message as string, or null if encoding fails
 *
 * @example
 * const encoded = Protobuf.encodeStr('user.login', { username: 'john' }, 'base64');
 */
Protobuf.encodeStr = (route, message, encoding) => {
    encoding = encoding || 'base64';

    try {
        const buffer = Protobuf.encode(route, message);
        return buffer ? buffer.toString(encoding) : null;
    } catch (_error) {
        // Return null for backward compatibility
        return null;
    }
};

/**
 * Decode a protobuf message
 *
 * @param {string} route - The route identifier for the message type
 * @param {Buffer|Uint8Array} buffer - The encoded message buffer
 * @returns {Object} The decoded message object
 * @throws {Error} If decoding fails or parameters are invalid
 *
 * @example
 * const decoded = Protobuf.decode('user.login', encodedBuffer);
 */
Protobuf.decode = (route, buffer) => {
    if (typeof route !== 'string' || !route.trim()) {
        throw new Error('Route must be a non-empty string');
    }
    if (!buffer) {
        throw new Error('Buffer cannot be null or undefined');
    }

    if (!decoderRoot) {
        throw new Error('Decoder not initialized. Call Protobuf.init() first.');
    }

    try {
        // Replace dots with underscores for protobufjs compatibility
        const safeName = route.replace(/\./g, '_');
        const MessageType = decoderRoot.lookupType(safeName);
        if (!MessageType) {
            throw new Error(`Message type '${route}' not found in decoder protos`);
        }

        // Ensure buffer is Uint8Array for protobufjs
        const uint8Buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

        // Decode the message
        const decodedMessage = MessageType.decode(uint8Buffer);
        return MessageType.toObject(decodedMessage, {
            longs: Number,
            enums: String,
            bytes: String,
            defaults: false,
            arrays: true,
            objects: true
        });
    } catch (error) {
        throw new Error(`Failed to decode message for route '${route}': ${error.message}`);
    }
};

/**
 * Decode a protobuf message from encoded string
 *
 * @param {string} route - The route identifier for the message type
 * @param {string} encodedString - The encoded message string
 * @param {string} [encoding='base64'] - The string encoding format
 * @returns {Object|null} The decoded message object, or null if decoding fails
 *
 * @example
 * const decoded = Protobuf.decodeStr('user.login', encodedString, 'base64');
 */
Protobuf.decodeStr = (route, encodedString, encoding) => {
    encoding = encoding || 'base64';

    if (typeof encodedString !== 'string') {
        return null;
    }

    try {
        const buffer = Buffer.from(encodedString, encoding);
        return buffer ? Protobuf.decode(route, buffer) : null;
    } catch (_error) {
        // Return null for backward compatibility
        return null;
    }
};

/**
 * Parse protobuf definition from JSON
 *
 * @param {Object|string} json - The protobuf definition in JSON format
 * @returns {Object} The parsed protobuf definition
 * @throws {Error} If parsing fails
 *
 * @example
 * const protos = Protobuf.parse(protoJson);
 */
Protobuf.parse = json => {
    if (!json) {
        throw new Error('JSON definition cannot be null or undefined');
    }

    try {
        return parser.parse(json);
    } catch (error) {
        throw new Error(`Failed to parse protobuf definition: ${error.message}`);
    }
};

/**
 * Set protobuf definitions for encoder
 *
 * @param {Object} protos - The protobuf definitions for encoding
 * @throws {Error} If initialization fails
 *
 * @example
 * Protobuf.setEncoderProtos(serverProtos);
 */
Protobuf.setEncoderProtos = protos => {
    if (!protos || typeof protos !== 'object') {
        throw new Error('Encoder protos must be a valid object');
    }

    try {
        _encoderProtos = protos;
        encoderRoot = createProtobufRoot(protos);
    } catch (error) {
        throw new Error(`Failed to initialize encoder: ${error.message}`);
    }
};

/**
 * Set protobuf definitions for decoder
 *
 * @param {Object} protos - The protobuf definitions for decoding
 * @throws {Error} If initialization fails
 *
 * @example
 * Protobuf.setDecoderProtos(clientProtos);
 */
Protobuf.setDecoderProtos = protos => {
    if (!protos || typeof protos !== 'object') {
        throw new Error('Decoder protos must be a valid object');
    }

    try {
        _decoderProtos = protos;
        decoderRoot = createProtobufRoot(protos);
    } catch (error) {
        throw new Error(`Failed to initialize decoder: ${error.message}`);
    }
};

/**
 * Initialize both encoder and decoder with protobuf definitions
 *
 * @param {Object} options - Initialization options
 * @param {Object} options.encoderProtos - Protobuf definitions for encoding (server-side: messages sent to client)
 * @param {Object} options.decoderProtos - Protobuf definitions for decoding (server-side: messages from client)
 * @throws {Error} If initialization fails
 *
 * @example
 * Protobuf.init({
 *   encoderProtos: serverProtos,
 *   decoderProtos: clientProtos
 * });
 */
Protobuf.init = function (options) {
    if (!options || typeof options !== 'object') {
        throw new Error('Options must be a valid object');
    }

    if (!options.encoderProtos) {
        throw new Error('encoderProtos is required in options');
    }

    if (!options.decoderProtos) {
        throw new Error('decoderProtos is required in options');
    }

    try {
        // Initialize encoder and decoder
        this.setEncoderProtos(options.encoderProtos);
        this.setDecoderProtos(options.decoderProtos);
    } catch (error) {
        throw new Error(`Failed to initialize protobuf: ${error.message}`);
    }
};

/**
 * Check if encoder is initialized
 *
 * @returns {boolean} True if encoder is initialized
 */
Protobuf.isEncoderInitialized = () => encoderRoot !== null;

/**
 * Check if decoder is initialized
 *
 * @returns {boolean} True if decoder is initialized
 */
Protobuf.isDecoderInitialized = () => decoderRoot !== null;

/**
 * Check if both encoder and decoder are initialized
 *
 * @returns {boolean} True if both are initialized
 */
Protobuf.isInitialized = function () {
    return this.isEncoderInitialized() && this.isDecoderInitialized();
};

// Expose internal modules for testing and advanced usage
// Note: These are internal APIs and may change without notice
Protobuf.encoder = {
    encode: Protobuf.encode,
    init: Protobuf.setEncoderProtos,
    isInitialized: Protobuf.isEncoderInitialized,
    byteLength(str) {
        // Calculate byte length of UTF-8 string
        return Buffer.byteLength(str, 'utf8');
    }
};

Protobuf.decoder = {
    decode: Protobuf.decode,
    init: Protobuf.setDecoderProtos,
    isInitialized: Protobuf.isDecoderInitialized
};

Protobuf.parser = parser;

// Legacy compatibility - expose codec-like interface
// Initialize typed arrays for float/double encoding
const float32Array = new Float32Array(1);
const float64Array = new Float64Array(1);
const uInt8Array = new Uint8Array(8);

Protobuf.codec = {
    encodeUInt32(value) {
        // Simple varint encoding for compatibility
        const result = [];
        while (value >= 0x80) {
            result.push((value & 0xff) | 0x80);
            value >>>= 7;
        }
        result.push(value & 0xff);
        return result;
    },

    decodeUInt32(bytes) {
        let result = 0;
        let shift = 0;
        for (let i = 0; i < bytes.length; i++) {
            result |= (bytes[i] & 0x7f) << shift;
            shift += 7;
            if ((bytes[i] & 0x80) === 0) {
                break;
            }
        }
        return result;
    },

    encodeFloat(float) {
        float32Array[0] = float;
        const result = new Uint8Array(4);
        for (let i = 0; i < 4; i++) {
            result[i] = uInt8Array[i];
        }
        return result;
    },

    decodeFloat(bytes, offset) {
        if (!bytes || bytes.length < offset + 4) {
            return null;
        }

        for (let i = 0; i < 4; i++) {
            uInt8Array[i] = bytes[offset + i];
        }

        return float32Array[0];
    },

    encodeDouble(double) {
        float64Array[0] = double;
        const result = new Uint8Array(8);
        for (let i = 0; i < 8; i++) {
            result[i] = uInt8Array[i];
        }
        return result;
    },

    decodeDouble(bytes, offset) {
        if (!bytes || bytes.length < 8 + offset) {
            return null;
        }

        for (let i = 0; i < 8; i++) {
            uInt8Array[i] = bytes[offset + i];
        }

        return float64Array[0];
    },

    encodeStr(bytes, offset, str) {
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            const codes = this._encode2UTF8(code);

            for (let j = 0; j < codes.length; j++) {
                bytes[offset] = codes[j];
                offset++;
            }
        }

        return offset;
    },

    decodeStr(bytes, offset, length) {
        const array = [];
        const end = offset + length;

        while (offset < end) {
            let code = 0;

            if (bytes[offset] < 128) {
                code = bytes[offset];
                offset += 1;
            } else if (bytes[offset] < 224) {
                code = ((bytes[offset] & 0x3f) << 6) + (bytes[offset + 1] & 0x3f);
                offset += 2;
            } else {
                code = ((bytes[offset] & 0x0f) << 12) + ((bytes[offset + 1] & 0x3f) << 6) + (bytes[offset + 2] & 0x3f);
                offset += 3;
            }

            array.push(code);
        }

        let str = '';
        for (let i = 0; i < array.length; ) {
            str += String.fromCharCode.apply(null, array.slice(i, i + 10_000));
            i += 10_000;
        }

        return str;
    },

    byteLength(str) {
        if (typeof str !== 'string') {
            return -1;
        }

        let length = 0;
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code < 0x80) {
                length += 1;
            } else if (code < 0x8_00) {
                length += 2;
            } else {
                length += 3;
            }
        }

        return length;
    },

    _encode2UTF8(code) {
        if (code < 0x80) {
            return [code];
        }
        if (code < 0x8_00) {
            return [0xc0 | (code >> 6), 0x80 | (code & 0x3f)];
        }
        return [0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f)];
    }
};
