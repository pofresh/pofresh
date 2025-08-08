/**
 * Protobuf wire types and field type mappings
 * @module constant
 */

// Protobuf wire types
const WIRE_TYPES = {
    VARINT: 0, // int32, int64, uint32, uint64, sint32, sint64, bool, enum
    FIXED64: 1, // fixed64, sfixed64, double
    LENGTH_DELIMITED: 2, // string, bytes, embedded messages, packed repeated fields
    START_GROUP: 3, // groups (deprecated)
    END_GROUP: 4, // groups (deprecated)
    FIXED32: 5 // fixed32, sfixed32, float
};

// Field type to wire type mapping
const FIELD_TYPES = {
    uInt32: WIRE_TYPES.VARINT,
    sInt32: WIRE_TYPES.VARINT,
    int32: WIRE_TYPES.VARINT,
    uInt64: WIRE_TYPES.VARINT,
    sInt64: WIRE_TYPES.VARINT,
    bool: WIRE_TYPES.VARINT,
    enum: WIRE_TYPES.VARINT,
    fixed64: WIRE_TYPES.FIXED64,
    sfixed64: WIRE_TYPES.FIXED64,
    double: WIRE_TYPES.FIXED64,
    string: WIRE_TYPES.LENGTH_DELIMITED,
    bytes: WIRE_TYPES.LENGTH_DELIMITED,
    message: WIRE_TYPES.LENGTH_DELIMITED,
    fixed32: WIRE_TYPES.FIXED32,
    sfixed32: WIRE_TYPES.FIXED32,
    float: WIRE_TYPES.FIXED32
};

// Simple types that don't require nested handling
const SIMPLE_TYPES = new Set([
    'uInt32',
    'sInt32',
    'int32',
    'uInt64',
    'sInt64',
    'bool',
    'enum',
    'fixed64',
    'sfixed64',
    'double',
    'fixed32',
    'sfixed32',
    'float'
]);

// Buffer and encoding constants
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9_007_199_254_740_991;
const BUFFER_SIZE_MULTIPLIER = 2;

// Legacy compatibility - keep old TYPES mapping
const TYPES = {
    uInt32: 0,
    sInt32: 0,
    int32: 0,
    double: 1,
    string: 2,
    message: 2,
    float: 5
};

module.exports = {
    WIRE_TYPES,
    FIELD_TYPES,
    SIMPLE_TYPES,
    MAX_SAFE_INTEGER,
    BUFFER_SIZE_MULTIPLIER,
    TYPES // Legacy compatibility
};
