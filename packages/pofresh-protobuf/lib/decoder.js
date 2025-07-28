/**
 * Protobuf Decoder Module
 * Provides decoding functionality for protobuf messages in CommonJS format
 * @module decoder
 */

const codec = require('./codec');
const util = require('./util');
const { FIELD_TYPES, WIRE_TYPES } = require('./constant');

const Decoder = module.exports;

// Module-level state for decoding
let buffer;
let offset = 0;

/**
 * Initialize the decoder with protocol definitions
 * @param {Object} protos - Protocol definitions mapping
 * @throws {Error} If protos is invalid
 */
Decoder.init = function (protos) {
    if (protos && typeof protos !== 'object') {
        throw new Error('Protos must be an object');
    }
    this.protos = protos || {};
};

/**
 * Set protocol definitions for the decoder
 * @param {Object} protos - Protocol definitions mapping
 * @throws {Error} If protos is invalid
 */
Decoder.setProtos = function (protos) {
    if (protos && typeof protos !== 'object') {
        throw new Error('Protos must be an object');
    }
    if (protos) {
        this.protos = protos;
    }
};

/**
 * Check if decoder is properly initialized
 * @returns {boolean} True if decoder has protos
 */
Decoder.isInitialized = function () {
    return !!(this.protos && typeof this.protos === 'object');
};

/**
 * Decode a protobuf message from buffer
 * @param {string} route - The route identifier for protocol lookup
 * @param {Buffer|Uint8Array} buf - The buffer containing encoded message
 * @returns {Object} Decoded message object
 * @throws {Error} If decoding fails or inputs are invalid
 */
Decoder.decode = function (route, buf) {
    // Validate inputs
    if (!route || typeof route !== 'string') {
        throw new Error(`Invalid route: ${route}`);
    }
    
    if (!buf || (!Buffer.isBuffer(buf) && !(buf instanceof Uint8Array))) {
        throw new Error('Buffer must be a Buffer or Uint8Array');
    }
    
    if (buf.length === 0) {
        throw new Error('Buffer cannot be empty');
    }

    // Check if decoder is initialized
    if (!this.isInitialized()) {
        throw new Error('Decoder protos not initialized');
    }

    // Get protocol definitions for the route
    const protos = this.protos[route];
    if (!protos) {
        throw new Error(`No protos found for route: ${route}`);
    }

    // Initialize decoding state
    buffer = buf;
    offset = 0;
    
    try {
        const result = decodeMessage({}, protos, buffer.length);
        
        // Reset state after decoding
        buffer = null;
        offset = 0;
        
        return result;
    } catch (error) {
        // Reset state on error
        buffer = null;
        offset = 0;
        throw new Error(`Decoding failed: ${error.message}`);
    }
};

/**
 * Decode a message from buffer using protocol definitions
 * @param {Object} msg - Message object to populate
 * @param {Object} protos - Protocol definitions
 * @param {number} length - Maximum length to decode
 * @returns {Object} Decoded message
 */
function decodeMessage(msg, protos, length) {
    while (offset < length && offset < buffer.length) {
        // Get field header (tag and wire type)
        const head = getFieldHeader();
        if (!head) {
            break; // End of message or invalid header
        }

        const wireType = head.wireType;
        const tag = head.tag;
        const fieldName = protos.__tags && protos.__tags[tag];
        
        if (!fieldName || !protos[fieldName]) {
            // Skip unknown fields instead of breaking
            skipUnknownField(wireType);
            continue;
        }

        const fieldProto = protos[fieldName];
        
        try {
            switch (fieldProto.option) {
                case 'optional':
                case 'required':
                    msg[fieldName] = decodeFieldValue(fieldProto.type, protos, wireType);
                    break;
                    
                case 'repeated':
                    if (!msg[fieldName]) {
                        msg[fieldName] = [];
                    }
                    decodeRepeatedField(msg[fieldName], fieldProto.type, protos, wireType);
                    break;
                    
                default:
                    throw new Error(`Unknown field option: ${fieldProto.option}`);
            }
        } catch (error) {
            throw new Error(`Error decoding field '${fieldName}': ${error.message}`);
        }
    }

    return msg;
}

/**
 * Get field header (tag and wire type) from current buffer position
 * @returns {{wireType: number, tag: number}|null} Field header or null if end of buffer
 */
function getFieldHeader() {
    try {
        if (offset >= buffer.length) {
            return null;
        }
        
        const tagBytes = readVarint();
        if (!tagBytes || tagBytes.length === 0) {
            return null;
        }
        
        const tagValue = codec.decodeUInt32(tagBytes);
        return {
            wireType: tagValue & 0x7,
            tag: tagValue >>> 3
        };
    } catch (error) {
        throw new Error(`Failed to read field header: ${error.message}`);
    }
}

/**
 * Skip an unknown field based on its wire type
 * @param {number} wireType - The wire type of the field to skip
 */
function skipUnknownField(wireType) {
    try {
        switch (wireType) {
            case WIRE_TYPES.VARINT:
                // Skip varint by reading until MSB is 0
                readVarint();
                break;
                
            case WIRE_TYPES.FIXED64:
                // Skip 8 bytes
                offset += 8;
                break;
                
            case WIRE_TYPES.LENGTH_DELIMITED:
                // Read length and skip that many bytes
                const lengthBytes = readVarint();
                const length = codec.decodeUInt32(lengthBytes);
                offset += length;
                break;
                
            case WIRE_TYPES.FIXED32:
                // Skip 4 bytes
                offset += 4;
                break;
                
            default:
                throw new Error(`Unknown wire type: ${wireType}`);
        }
    } catch (error) {
        throw new Error(`Failed to skip unknown field: ${error.message}`);
    }
}

/**
 * Decode a field value based on its type and wire type
 * @param {string} type - Protobuf field type
 * @param {Object} protos - Protocol definitions
 * @param {number} wireType - Wire type from field header
 * @returns {*} Decoded value
 */
function decodeFieldValue(type, protos, wireType) {
    switch (type) {
        case 'uInt32':
            if (wireType === WIRE_TYPES.VARINT) {
                return codec.decodeUInt32(readVarint());
            }
            // For backward compatibility, try to handle other wire types gracefully
            throw new Error(`Invalid wire type ${wireType} for uInt32`);
            
        case 'int32':
        case 'sInt32':
            if (wireType === WIRE_TYPES.VARINT) {
                return codec.decodeSInt32(readVarint());
            }
            throw new Error(`Invalid wire type ${wireType} for ${type}`);
            
        case 'uInt64':
            if (wireType === WIRE_TYPES.VARINT) {
                return codec.decodeUInt64(readVarint());
            }
            throw new Error(`Invalid wire type ${wireType} for uInt64`);
            
        case 'bool':
            if (wireType === WIRE_TYPES.VARINT) {
                return codec.decodeBool(readVarint());
            }
            throw new Error(`Invalid wire type ${wireType} for bool`);
            
        case 'float':
            if (wireType === WIRE_TYPES.FIXED32) {
                return readFloat32();
            }
            throw new Error(`Invalid wire type ${wireType} for float`);
            
        case 'double':
            if (wireType === WIRE_TYPES.FIXED64) {
                return readFloat64();
            }
            throw new Error(`Invalid wire type ${wireType} for double`);
            
        case 'string':
            if (wireType !== WIRE_TYPES.LENGTH_DELIMITED) {
                throw new Error(`Invalid wire type ${wireType} for string`);
            }
            return readString();
            
        case 'bytes':
            if (wireType !== WIRE_TYPES.LENGTH_DELIMITED) {
                throw new Error(`Invalid wire type ${wireType} for bytes`);
            }
            return readBytes();
            
        default:
            // Handle nested messages
            if (wireType !== WIRE_TYPES.LENGTH_DELIMITED) {
                throw new Error(`Invalid wire type ${wireType} for message type ${type}`);
            }
            
            const nestedProtos = protos.__messages && protos.__messages[type];
            const legacyProtos = Decoder.protos && Decoder.protos['message ' + type];
            const messageProtos = nestedProtos || legacyProtos;
            
            if (messageProtos) {
                const lengthBytes = readVarint();
                const messageLength = codec.decodeUInt32(lengthBytes);
                const startOffset = offset;
                const endOffset = offset + messageLength;
                
                if (endOffset > buffer.length) {
                    throw new Error('Message length exceeds buffer size');
                }
                
                const nestedMessage = {};
                
                // Initialize repeated fields
                for (const fieldName in messageProtos) {
                    if (messageProtos[fieldName] && messageProtos[fieldName].option === 'repeated') {
                        nestedMessage[fieldName] = [];
                    }
                }
                
                const result = decodeMessage(nestedMessage, messageProtos, endOffset);
                
                // Ensure we've consumed exactly the expected number of bytes
                offset = endOffset;
                
                return result;
            } else {
                throw new Error(`Unknown message type: ${type}`);
            }
    }
}

/**
 * Decode a repeated field into an array
 * @param {Array} array - Target array to populate
 * @param {string} type - Field type
 * @param {Object} protos - Protocol definitions
 * @param {number} wireType - Wire type from field header
 */
function decodeRepeatedField(array, type, protos, wireType) {
    if (util.isSimpleType(type)) {
        if (wireType === WIRE_TYPES.LENGTH_DELIMITED) {
            // Packed encoding for simple types
            const lengthBytes = readVarint();
            const packedLength = codec.decodeUInt32(lengthBytes);
            const endOffset = offset + packedLength;
            
            while (offset < endOffset) {
                switch (type) {
                    case 'uInt32':
                        array.push(codec.decodeUInt32(readVarint()));
                        break;
                    case 'int32':
                    case 'sInt32':
                        array.push(codec.decodeSInt32(readVarint()));
                        break;
                    case 'uInt64':
                        array.push(codec.decodeUInt64(readVarint()));
                        break;
                    case 'bool':
                        array.push(codec.decodeBool(readVarint()));
                        break;
                    case 'float':
                        array.push(readFloat32());
                        break;
                    case 'double':
                        array.push(readFloat64());
                        break;
                    default:
                        throw new Error(`Unsupported packed type: ${type}`);
                }
            }
        } else {
            // Non-packed encoding - single value
            array.push(decodeFieldValue(type, protos, wireType));
        }
    } else {
        // Complex types are always non-packed
        array.push(decodeFieldValue(type, protos, wireType));
    }
}

/**
 * Read a varint from the current buffer position
 * @returns {Array<number>} Array of bytes representing the varint
 */
function readVarint() {
    const bytes = [];
    let b;
    
    do {
        if (offset >= buffer.length) {
            throw new Error('Buffer overflow while reading varint');
        }
        
        b = buffer[offset];
        bytes.push(b);
        offset++;
    } while ((b & 0x80) !== 0 && offset < buffer.length);
    
    if ((b & 0x80) !== 0) {
        throw new Error('Incomplete varint at end of buffer');
    }
    
    return bytes;
}

/**
 * Read a 32-bit float from buffer (little-endian)
 * @returns {number} Float value
 */
function readFloat32() {
    if (offset + 4 > buffer.length) {
        throw new Error('Buffer overflow while reading float32');
    }
    
    let value;
    if (util.isNode() && Buffer.isBuffer(buffer)) {
        value = buffer.readFloatLE(offset);
    } else {
        const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4);
        value = view.getFloat32(0, true); // true for little-endian
    }
    
    offset += 4;
    return value;
}

/**
 * Read a 64-bit double from buffer (little-endian)
 * @returns {number} Double value
 */
function readFloat64() {
    if (offset + 8 > buffer.length) {
        throw new Error('Buffer overflow while reading float64');
    }
    
    let value;
    if (util.isNode() && Buffer.isBuffer(buffer)) {
        value = buffer.readDoubleLE(offset);
    } else {
        const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 8);
        value = view.getFloat64(0, true); // true for little-endian
    }
    
    offset += 8;
    return value;
}

/**
 * Read a length-delimited string from buffer
 * @returns {string} UTF-8 decoded string
 */
function readString() {
    const lengthBytes = readVarint();
    const length = codec.decodeUInt32(lengthBytes);
    
    if (offset + length > buffer.length) {
        throw new Error('String length exceeds buffer size');
    }
    
    let str;
    if (util.isNode() && Buffer.isBuffer(buffer)) {
        str = buffer.toString('utf8', offset, offset + length);
    } else {
        const bytes = buffer.slice(offset, offset + length);
        str = new TextDecoder('utf-8').decode(bytes);
    }
    
    offset += length;
    return str;
}

/**
 * Read length-delimited bytes from buffer
 * @returns {Uint8Array} Raw bytes
 */
function readBytes() {
    const lengthBytes = readVarint();
    const length = codec.decodeUInt32(lengthBytes);
    
    if (offset + length > buffer.length) {
        throw new Error('Bytes length exceeds buffer size');
    }
    
    const bytes = buffer.slice(offset, offset + length);
    offset += length;
    
    return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}
