/**
 * Enhanced encoder for protobuf messages with improved error handling
 * @module encoder
 */

const codec = require('./codec');
const { FIELD_TYPES, BUFFER_SIZE_MULTIPLIER } = require('./constant');
const util = require('./util');

const Encoder = module.exports;

/**
 * Initialize encoder with protocol definitions
 * @param {Object} protos - Protocol definitions
 */
Encoder.init = function (protos) {
    if (!protos || typeof protos !== 'object') {
        throw new Error('Protos must be a valid object');
    }
    this.protos = protos;
};

/**
 * Check if encoder is initialized
 * @returns {boolean} True if initialized
 */
Encoder.isInitialized = function () {
    return this.protos && Object.keys(this.protos).length > 0;
};

/**
 * Encode a message using the specified route
 * @param {string} route - The route identifier for the message type
 * @param {Object} msg - The message object to encode
 * @returns {Buffer} The encoded message buffer
 * @throws {Error} If encoding fails
 */
Encoder.encode = function (route, msg) {
    // Input validation
    if (!route || typeof route !== 'string') {
        throw new Error(`Invalid route: ${route}`);
    }

    if (!msg || typeof msg !== 'object') {
        throw new Error(`Invalid message: ${msg}`);
    }

    // Check if protos are initialized
    if (!this.isInitialized()) {
        throw new Error('Encoder protos not initialized');
    }

    // Get protos from protos map using the route as key
    const protos = this.protos[route];
    if (!protos) {
        throw new Error(`No protos found for route: ${route}`);
    }

    // Validate message against proto definition
    const validationResult = validateMessage(msg, protos);
    if (!validationResult.isValid) {
        throw new Error(`Message validation failed: ${validationResult.error}`);
    }

    // Estimate buffer size more accurately
    const estimatedSize = estimateBufferSize(msg, protos);
    const bufferSize = Math.max(estimatedSize * BUFFER_SIZE_MULTIPLIER, 64);

    // Create buffer with cross-environment compatibility
    const buffer = util.createBuffer(bufferSize);
    let offset = 0;

    try {
        offset = encodeMessage(buffer, offset, protos, msg);
        if (offset > 0) {
            // Return properly sized buffer
            if (util.isNode() && Buffer.isBuffer(buffer)) {
                return buffer.slice(0, offset);
            }
            return buffer.subarray(0, offset);
        }
    } catch (error) {
        throw new Error(`Encoding failed: ${error.message}`);
    }

    throw new Error('Encoding produced empty result');
};

/**
 * Estimate the required buffer size for a message
 * @param {Object} msg - The message to estimate
 * @param {Object} protos - The protocol definitions
 * @returns {number} Estimated buffer size in bytes
 */
function estimateBufferSize(msg, protos) {
    let size = 0;

    for (const name in msg) {
        if (protos[name]) {
            const proto = protos[name];
            const value = msg[name];

            // Add tag size (usually 1-2 bytes)
            size += 2;

            switch (proto.type) {
                case 'string':
                    if (typeof value === 'string') {
                        size += Buffer.byteLength(value, 'utf8') + 5; // +5 for length encoding
                    }
                    break;
                case 'uInt32':
                case 'sInt32':
                case 'int32':
                    size += 5; // Max varint size for 32-bit
                    break;
                case 'uInt64':
                case 'sInt64':
                    size += 10; // Max varint size for 64-bit
                    break;
                case 'float':
                    size += 4;
                    break;
                case 'double':
                    size += 8;
                    break;
                case 'bool':
                    size += 1;
                    break;
                default:
                    // For nested messages, estimate recursively
                    if (value && typeof value === 'object') {
                        const nestedProtos = protos.__messages && protos.__messages[proto.type];
                        if (nestedProtos) {
                            size += estimateBufferSize(value, nestedProtos) + 5;
                        } else {
                            size += 50; // Conservative estimate for unknown nested types
                        }
                    }
                    break;
            }

            // Handle repeated fields
            if (proto.option === 'repeated' && Array.isArray(value)) {
                size *= value.length;
                size += 5; // Array length encoding
            }
        }
    }

    return Math.max(size, 32); // Minimum buffer size
}

/**
 * Validate a message against protocol definitions
 * @param {Object} msg - The message to validate
 * @param {Object} protos - The protocol definitions
 * @returns {{isValid: boolean, error?: string}} Validation result
 */
function validateMessage(msg, protos) {
    if (!protos || typeof protos !== 'object') {
        return { isValid: false, error: 'Invalid protos definition' };
    }

    if (!msg || typeof msg !== 'object') {
        return { isValid: false, error: 'Invalid message object' };
    }

    // Check all proto fields
    for (const name in protos) {
        if (name.startsWith('__')) continue; // Skip internal fields

        const proto = protos[name];
        const value = msg[name];

        // Validate required fields
        if (proto.option === 'required' && (value === undefined || value === null)) {
            return {
                isValid: false,
                error: `Required field '${name}' is missing`
            };
        }

        // Validate field values if present
        if (value !== undefined && value !== null) {
            const fieldValidation = validateFieldValue(value, proto, protos, name);
            if (!fieldValidation.isValid) {
                return fieldValidation;
            }
        }
    }

    return { isValid: true };
}

/**
 * Validate a single field value
 * @param {*} value - The field value
 * @param {Object} proto - The field protocol definition
 * @param {Object} protos - All protocol definitions
 * @param {string} fieldName - The field name for error reporting
 * @returns {{isValid: boolean, error?: string}} Validation result
 */
function validateFieldValue(value, proto, protos, fieldName) {
    // Handle repeated fields
    if (proto.option === 'repeated') {
        if (!Array.isArray(value)) {
            return {
                isValid: false,
                error: `Field '${fieldName}' must be an array for repeated option`
            };
        }

        // Validate each array element
        for (let i = 0; i < value.length; i++) {
            const elementValidation = validateSingleValue(value[i], proto.type, protos, `${fieldName}[${i}]`);
            if (!elementValidation.isValid) {
                return elementValidation;
            }
        }
        return { isValid: true };
    }

    // Handle single values
    return validateSingleValue(value, proto.type, protos, fieldName);
}

/**
 * Validate a single value against a type
 * @param {*} value - The value to validate
 * @param {string} type - The expected type
 * @param {Object} protos - All protocol definitions
 * @param {string} fieldName - The field name for error reporting
 * @returns {{isValid: boolean, error?: string}} Validation result
 */
function validateSingleValue(value, type, protos, fieldName) {
    switch (type) {
        case 'uInt32':
        case 'int32':
        case 'sInt32':
            if (!(util.isValidNumber(value) && Number.isInteger(value))) {
                return {
                    isValid: false,
                    error: `Field '${fieldName}' must be an integer`
                };
            }
            break;

        case 'uInt64':
        case 'sInt64':
            if (!util.isValidNumber(value) && typeof value !== 'bigint') {
                return {
                    isValid: false,
                    error: `Field '${fieldName}' must be a number or bigint`
                };
            }
            break;

        case 'float':
        case 'double':
            if (!util.isValidNumber(value)) {
                return {
                    isValid: false,
                    error: `Field '${fieldName}' must be a number`
                };
            }
            break;

        case 'bool':
            if (!util.isValidBoolean(value)) {
                return {
                    isValid: false,
                    error: `Field '${fieldName}' must be a boolean`
                };
            }
            break;

        case 'string':
            if (!util.isValidString(value)) {
                return {
                    isValid: false,
                    error: `Field '${fieldName}' must be a string`
                };
            }
            break;

        default: {
            // Handle nested messages
            const nestedProtos = protos.__messages && protos.__messages[type];
            if (nestedProtos) {
                const nestedValidation = validateMessage(value, nestedProtos);
                if (!nestedValidation.isValid) {
                    return {
                        isValid: false,
                        error: `Nested message '${fieldName}': ${nestedValidation.error}`
                    };
                }
            } else if (Encoder.protos && Encoder.protos['message ' + type]) {
                // Legacy support
                const legacyValidation = validateMessage(value, Encoder.protos['message ' + type]);
                if (!legacyValidation.isValid) {
                    return {
                        isValid: false,
                        error: `Nested message '${fieldName}': ${legacyValidation.error}`
                    };
                }
            }
            break;
        }
    }

    return { isValid: true };
}

/**
 * Encode a message into a buffer
 * @param {Buffer|Uint8Array} buffer - The target buffer
 * @param {number} offset - Current offset in buffer
 * @param {Object} protos - Protocol definitions
 * @param {Object} msg - Message to encode
 * @returns {number} New offset after encoding
 */
function encodeMessage(buffer, offset, protos, msg) {
    for (const name in msg) {
        if (protos[name]) {
            const proto = protos[name];
            const value = msg[name];

            // Skip undefined/null values for optional fields
            if ((value === undefined || value === null) && proto.option === 'optional') {
                continue;
            }

            switch (proto.option) {
                case 'required':
                case 'optional': {
                    // Get wire type for the field
                    const wireType = FIELD_TYPES[proto.type] || 2; // Default to LENGTH_DELIMITED

                    // Encode tag
                    const tagBytes = codec.encodeTag(proto.tag, wireType);
                    offset = writeBytes(buffer, offset, tagBytes);

                    // Encode value
                    offset = encodeProperty(value, proto.type, offset, buffer, protos);
                    break;
                }

                case 'repeated':
                    if (Array.isArray(value) && value.length > 0) {
                        offset = encodeRepeatedField(value, proto, offset, buffer, protos);
                    }
                    break;
            }
        }
    }

    return offset;
}

/**
 * Encode a property value based on its type
 * @param {*} value - Value to encode
 * @param {string} type - Protobuf type
 * @param {number} offset - Current offset in buffer
 * @param {Buffer|Uint8Array} buffer - Target buffer
 * @param {Object} protos - Protocol definitions
 * @returns {number} New offset after encoding
 */
function encodeProperty(value, type, offset, buffer, protos) {
    switch (type) {
        case 'uInt32': {
            const uintBytes = codec.encodeUInt32(value);
            offset = writeBytes(buffer, offset, uintBytes);
            break;
        }

        case 'int32':
        case 'sInt32': {
            const sintBytes = codec.encodeSInt32(value);
            offset = writeBytes(buffer, offset, sintBytes);
            break;
        }

        case 'uInt64': {
            const uint64Bytes = codec.encodeUInt64(value);
            offset = writeBytes(buffer, offset, uint64Bytes);
            break;
        }

        case 'float': {
            // Float is 4 bytes, little-endian
            const floatBuffer = util.createBuffer(4);
            if (util.isNode()) {
                floatBuffer.writeFloatLE(value, 0);
            } else {
                const view = new DataView(floatBuffer.buffer);
                view.setFloat32(0, value, true); // true for little-endian
            }
            offset = writeBytes(buffer, offset, floatBuffer);
            break;
        }

        case 'double': {
            // Double is 8 bytes, little-endian
            const doubleBuffer = util.createBuffer(8);
            if (util.isNode()) {
                doubleBuffer.writeDoubleLE(value, 0);
            } else {
                const view = new DataView(doubleBuffer.buffer);
                view.setFloat64(0, value, true); // true for little-endian
            }
            offset = writeBytes(buffer, offset, doubleBuffer);
            break;
        }

        case 'bool': {
            const boolBytes = codec.encodeBool(value);
            offset = writeBytes(buffer, offset, boolBytes);
            break;
        }

        case 'string': {
            const stringBuffer = util.isNode() ? Buffer.from(value, 'utf8') : new TextEncoder().encode(value);
            const lengthBytes = codec.encodeUInt32(stringBuffer.length);
            offset = writeBytes(buffer, offset, lengthBytes);
            offset = writeBytes(buffer, offset, stringBuffer);
            break;
        }

        case 'bytes': {
            const bytesData = value instanceof Uint8Array ? value : new Uint8Array(value);
            const bytesLengthBytes = codec.encodeUInt32(bytesData.length);
            offset = writeBytes(buffer, offset, bytesLengthBytes);
            offset = writeBytes(buffer, offset, bytesData);
            break;
        }

        default: {
            // Handle nested messages
            const message =
                (protos.__messages && protos.__messages[type]) || (Encoder.protos && Encoder.protos['message ' + type]);
            if (message) {
                // Use a tmp buffer to build an internal msg
                const tmpBuffer = util.createBuffer(estimateBufferSize(value, message));
                let length = 0;

                length = encodeMessage(tmpBuffer, length, message, value);
                // Encode length
                offset = writeBytes(buffer, offset, codec.encodeUInt32(length));
                // Copy the object
                const messageData = util.isNode() ? tmpBuffer.subarray(0, length) : tmpBuffer.slice(0, length);
                offset = writeBytes(buffer, offset, messageData);
            } else {
                throw new Error(`Unknown field type: ${type}`);
            }
            break;
        }
    }

    return offset;
}

/**
 * Encode a repeated field (array) into buffer
 * @param {Array} array - Array of values to encode
 * @param {Object} proto - Protocol definition for the field
 * @param {number} offset - Current offset in buffer
 * @param {Buffer|Uint8Array} buffer - Target buffer
 * @param {Object} protos - Protocol definitions
 * @returns {number} New offset after encoding
 */
function encodeRepeatedField(array, proto, offset, buffer, protos) {
    if (!Array.isArray(array) || array.length === 0) {
        return offset;
    }

    const wireType = FIELD_TYPES[proto.type] || 2; // Default to LENGTH_DELIMITED

    if (util.isSimpleType(proto.type)) {
        // For simple types, use packed encoding
        const tagBytes = codec.encodeTag(proto.tag, wireType);
        offset = writeBytes(buffer, offset, tagBytes);

        // Calculate total length of packed data
        let packedLength = 0;
        const packedData = [];

        for (let i = 0; i < array.length; i++) {
            let valueBytes;
            switch (proto.type) {
                case 'uInt32':
                    valueBytes = codec.encodeUInt32(array[i]);
                    break;
                case 'int32':
                case 'sInt32':
                    valueBytes = codec.encodeSInt32(array[i]);
                    break;
                case 'uInt64':
                    valueBytes = codec.encodeUInt64(array[i]);
                    break;
                case 'bool':
                    valueBytes = codec.encodeBool(array[i]);
                    break;
                case 'float': {
                    const floatBuffer = util.createBuffer(4);
                    if (util.isNode()) {
                        floatBuffer.writeFloatLE(array[i], 0);
                    } else {
                        const view = new DataView(floatBuffer.buffer);
                        view.setFloat32(0, array[i], true);
                    }
                    valueBytes = floatBuffer;
                    break;
                }
                case 'double': {
                    const doubleBuffer = util.createBuffer(8);
                    if (util.isNode()) {
                        doubleBuffer.writeDoubleLE(array[i], 0);
                    } else {
                        const view = new DataView(doubleBuffer.buffer);
                        view.setFloat64(0, array[i], true);
                    }
                    valueBytes = doubleBuffer;
                    break;
                }
                default:
                    throw new Error(`Unsupported simple type for packed encoding: ${proto.type}`);
            }
            packedData.push(valueBytes);
            packedLength += valueBytes.length;
        }

        // Encode packed length
        const lengthBytes = codec.encodeUInt32(packedLength);
        offset = writeBytes(buffer, offset, lengthBytes);

        // Write packed data
        for (const data of packedData) {
            offset = writeBytes(buffer, offset, data);
        }
    } else {
        // For complex types, encode each element separately
        for (let i = 0; i < array.length; i++) {
            const tagBytes = codec.encodeTag(proto.tag, wireType);
            offset = writeBytes(buffer, offset, tagBytes);
            offset = encodeProperty(array[i], proto.type, offset, buffer, protos);
        }
    }

    return offset;
}

/**
 * Write bytes to buffer at specified offset
 * @param {Buffer|Uint8Array} buffer - Target buffer
 * @param {number} offset - Offset to write at
 * @param {Buffer|Uint8Array|Array} bytes - Bytes to write
 * @returns {number} New offset after writing
 */
function writeBytes(buffer, offset, bytes) {
    if (!bytes || bytes.length === 0) {
        return offset;
    }

    // Handle different input types
    if (util.isNode() && Buffer.isBuffer(bytes)) {
        bytes.copy(buffer, offset);
    } else if (bytes instanceof Uint8Array) {
        buffer.set(bytes, offset);
    } else if (Array.isArray(bytes)) {
        for (let i = 0; i < bytes.length; i++) {
            buffer[offset + i] = bytes[i];
        }
    } else {
        throw new Error('Invalid bytes type for writeBytes');
    }

    return offset + bytes.length;
}
