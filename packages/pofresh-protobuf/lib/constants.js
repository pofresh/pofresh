/**
 * Protocol Buffers Constants
 * 
 * Defines field types, wire types, and other constants used throughout
 * the protobuf encoding and decoding process.
 * 
 * @module constants
 * @version 1.0.0
 * @author Pofresh Team
 */

/**
 * Protocol Buffers field types
 * These correspond to the protobuf field type definitions
 */
const FIELD_TYPES = {
    // Varint types
    uInt32: 'uInt32',
    sInt32: 'sInt32', 
    int32: 'int32',
    uInt64: 'uInt64',
    sInt64: 'sInt64',
    int64: 'int64',
    bool: 'bool',
    
    // Fixed-width types
    float: 'float',
    double: 'double',
    fixed32: 'fixed32',
    fixed64: 'fixed64',
    sfixed32: 'sfixed32',
    sfixed64: 'sfixed64',
    
    // Length-delimited types
    string: 'string',
    bytes: 'bytes',
    message: 'message'
};

/**
 * Protocol Buffers wire types
 * These define how data is encoded on the wire
 */
const WIRE_TYPES = {
    VARINT: 0,           // int32, int64, uint32, uint64, sint32, sint64, bool, enum
    FIXED64: 1,          // fixed64, sfixed64, double
    LENGTH_DELIMITED: 2, // string, bytes, embedded messages, packed repeated fields
    START_GROUP: 3,      // groups (deprecated)
    END_GROUP: 4,        // groups (deprecated)
    FIXED32: 5           // fixed32, sfixed32, float
};

/**
 * Default field options
 */
const FIELD_OPTIONS = {
    OPTIONAL: 'optional',
    REQUIRED: 'required',
    REPEATED: 'repeated'
};

/**
 * Maximum values for validation
 */
const LIMITS = {
    MAX_VARINT_BYTES: 10,
    MAX_STRING_LENGTH: 2147483647, // 2^31 - 1
    MAX_BUFFER_SIZE: 2147483647    // 2^31 - 1
};

/**
 * Error messages
 */
const ERROR_MESSAGES = {
    INVALID_WIRE_TYPE: 'Invalid wire type',
    BUFFER_OVERFLOW: 'Buffer overflow',
    INVALID_VARINT: 'Invalid varint encoding',
    UNKNOWN_FIELD_TYPE: 'Unknown field type',
    MISSING_REQUIRED_FIELD: 'Missing required field',
    INVALID_STRING_ENCODING: 'Invalid string encoding'
};

module.exports = {
    FIELD_TYPES,
    WIRE_TYPES,
    FIELD_OPTIONS,
    LIMITS,
    ERROR_MESSAGES
};