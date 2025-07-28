/**
 * Protocol constants
 */

// Package header size
const PKG_HEAD_BYTES = 4;
const MSG_FLAG_BYTES = 1;
const MSG_ROUTE_CODE_BYTES = 2;
const MSG_ROUTE_LEN_BYTES = 1;

const MSG_ROUTE_CODE_MAX = 0xffff;

// Message compression masks
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

module.exports = {
    PKG_HEAD_BYTES,
    MSG_FLAG_BYTES,
    MSG_ROUTE_CODE_BYTES,
    MSG_ROUTE_LEN_BYTES,
    MSG_ROUTE_CODE_MAX,
    MSG_COMPRESS_ROUTE_MASK,
    MSG_COMPRESS_GZIP_MASK,
    MSG_COMPRESS_GZIP_ENCODE_MASK,
    MSG_TYPE_MASK,
    TYPE_HANDSHAKE,
    TYPE_HANDSHAKE_ACK,
    TYPE_HEARTBEAT,
    TYPE_DATA,
    TYPE_KICK,
    TYPE_REQUEST,
    TYPE_NOTIFY,
    TYPE_RESPONSE,
    TYPE_PUSH
};
