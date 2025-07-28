# API Documentation

This document provides detailed API documentation for the pofresh-protocol library.

## Table of Contents

- [Protocol Class](#protocol-class)
- [Package Class](#package-class)
- [Message Class](#message-class)
- [String Codec](#string-codec)
- [Constants](#constants)
- [Utilities](#utilities)
- [Error Handling](#error-handling)
- [Performance Notes](#performance-notes)

## Protocol Class

The main entry point for the pofresh-protocol library.

### Static Properties

| Property | Type | Description |
|----------|------|-------------|
| `Package` | Class | Package encoder/decoder class |
| `Message` | Class | Message encoder/decoder class |
| `constants` | Object | Protocol constants |
| `bufferUtils` | Object | Buffer utility functions |
| `messageUtils` | Object | Message utility functions |

### Static Methods

#### `Protocol.strencode(str)`

Encodes a string to a buffer using UTF-8 encoding.

**Parameters:**
- `str` (string): The string to encode

**Returns:**
- `Buffer`: The encoded buffer

**Example:**
```javascript
const buffer = Protocol.strencode('Hello, 世界!');
console.log(buffer); // <Buffer 48 65 6c 6c 6f 2c 20 e4 b8 96 e7 95 8c 21>
```

#### `Protocol.strdecode(buffer)`

Decodes a buffer to a string using UTF-8 encoding.

**Parameters:**
- `buffer` (Buffer): The buffer to decode

**Returns:**
- `string`: The decoded string

**Example:**
```javascript
const str = Protocol.strdecode(buffer);
console.log(str); // 'Hello, 世界!'
```

## Package Class

Handles package-level encoding and decoding for the Pofresh protocol.

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `TYPE_HANDSHAKE` | 1 | Handshake package type |
| `TYPE_HANDSHAKE_ACK` | 2 | Handshake acknowledgment |
| `TYPE_HEARTBEAT` | 3 | Heartbeat package type |
| `TYPE_DATA` | 4 | Data package type |
| `TYPE_KICK` | 5 | Kick package type |

### Methods

#### `Package.encode(type, body?)`

Encodes a package with the specified type and optional body.

**Parameters:**
- `type` (number): Package type (use Package.TYPE_* constants)
- `body` (Buffer, optional): Package body data

**Returns:**
- `Buffer`: Encoded package buffer

**Throws:**
- `Error`: If type is invalid or body is not a Buffer when provided

**Example:**
```javascript
// Data package with body
const body = Buffer.from('Hello World');
const dataPackage = Package.encode(Package.TYPE_DATA, body);

// Heartbeat package without body
const heartbeat = Package.encode(Package.TYPE_HEARTBEAT);
```

#### `Package.decode(buffer)`

Decodes a package from a buffer.

**Parameters:**
- `buffer` (Buffer): The buffer containing encoded package data

**Returns:**
- `Object`: Decoded package with properties:
  - `type` (number): Package type
  - `body` (Buffer|null): Package body or null if no body

**Throws:**
- `Error`: If buffer is invalid or corrupted

**Example:**
```javascript
const decoded = Package.decode(encodedBuffer);
console.log(decoded.type); // 4
console.log(decoded.body); // <Buffer ...> or null
```

## Message Class

Handles message-level encoding and decoding for the Pofresh protocol.

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `TYPE_REQUEST` | 0 | Request message type |
| `TYPE_NOTIFY` | 1 | Notify message type |
| `TYPE_RESPONSE` | 2 | Response message type |
| `TYPE_PUSH` | 3 | Push message type |

### Methods

#### `Message.encode(id, type, compressRoute, route, body)`

Encodes a message with the specified parameters.

**Parameters:**
- `id` (number): Message ID (0-2^32)
- `type` (number): Message type (use Message.TYPE_* constants)
- `compressRoute` (number): Route compression flag (0 = no compression, 1 = compressed)
- `route` (string|number|null): Message route
- `body` (Buffer): Message body data

**Returns:**
- `Buffer`: Encoded message buffer

**Throws:**
- `Error`: If parameters are invalid

**Route Compression:**
- When `compressRoute` is 0, `route` should be a string
- When `compressRoute` is 1, `route` should be a number (route code)
- For response messages, `route` can be null

**Example:**
```javascript
// Request message
const request = Message.encode(
  123,                    // id
  Message.TYPE_REQUEST,   // type
  0,                      // no compression
  'user.login',          // route
  Buffer.from('data')     // body
);

// Compressed route message
const compressed = Message.encode(
  456,                    // id
  Message.TYPE_REQUEST,   // type
  1,                      // compressed
  42,                     // route code
  Buffer.from('data')     // body
);

// Notify message (no ID)
const notify = Message.encode(
  0,                      // no id for notify
  Message.TYPE_NOTIFY,    // type
  0,                      // no compression
  'chat.broadcast',       // route
  Buffer.from('message')  // body
);
```

#### `Message.decode(buffer)`

Decodes a message from a buffer.

**Parameters:**
- `buffer` (Buffer): The buffer containing encoded message data

**Returns:**
- `Object`: Decoded message with properties:
  - `id` (number): Message ID
  - `type` (number): Message type
  - `compressRoute` (number): Route compression flag
  - `route` (string|number|null): Message route
  - `body` (Buffer): Message body

**Throws:**
- `Error`: If buffer is invalid or corrupted

**Example:**
```javascript
const decoded = Message.decode(encodedBuffer);
console.log(decoded.id);           // 123
console.log(decoded.type);         // 0 (TYPE_REQUEST)
console.log(decoded.compressRoute); // 0
console.log(decoded.route);        // 'user.login'
console.log(decoded.body);         // <Buffer ...>
```

## String Codec

Utilities for encoding and decoding strings to/from buffers.

### Functions

#### `strencode(str)`

Encodes a string to a buffer using UTF-8 encoding with length prefix.

**Parameters:**
- `str` (string): The string to encode

**Returns:**
- `Buffer`: Encoded buffer with length prefix

**Format:**
- First 2 bytes: String length (big-endian)
- Remaining bytes: UTF-8 encoded string

#### `strdecode(buffer)`

Decodes a buffer to a string, reading the length prefix.

**Parameters:**
- `buffer` (Buffer): The buffer to decode

**Returns:**
- `string`: Decoded string

**Example:**
```javascript
const { strencode, strdecode } = require('pofresh-protocol');

// Encode with Unicode support
const buffer = strencode('Hello, 世界! 🌍');
console.log(buffer.length); // Length includes 2-byte prefix

// Decode back to string
const string = strdecode(buffer);
console.log(string); // 'Hello, 世界! 🌍'
```

## Constants

Protocol constants used throughout the library.

### Package Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `PKG_HEAD_BYTES` | 4 | Package header size in bytes |

### Message Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MSG_FLAG_BYTES` | 1 | Message flag size in bytes |
| `MSG_ROUTE_CODE_BYTES` | 2 | Route code size in bytes |
| `MSG_ID_MAX_BYTES` | 5 | Maximum message ID size in bytes |
| `MSG_ROUTE_LEN_BYTES` | 1 | Route length size in bytes |
| `MSG_ROUTE_CODE_MAX` | 65535 | Maximum route code value |

### Bit Masks

| Constant | Value | Description |
|----------|-------|-------------|
| `MSG_COMPRESS_ROUTE_MASK` | 0x1 | Route compression bit mask |
| `MSG_COMPRESS_GZIP_MASK` | 0x10 | GZIP compression bit mask |
| `MSG_COMPRESS_GZIP_ENCODE_MASK` | 0x20 | GZIP encode bit mask |
| `MSG_TYPE_MASK` | 0x7 | Message type bit mask |

## Utilities

### Buffer Utils

Utilities for buffer manipulation.

#### `bufferUtils.writeUInt32(buffer, value, offset)`

Writes a 32-bit unsigned integer to a buffer.

#### `bufferUtils.readUInt32(buffer, offset)`

Reads a 32-bit unsigned integer from a buffer.

### Message Utils

Utilities for message processing.

#### `messageUtils.msgHasId(type)`

Checks if a message type requires an ID.

#### `messageUtils.msgHasRoute(type)`

Checks if a message type requires a route.

#### `messageUtils.caculateMsgIdBytes(id)`

Calculates the number of bytes needed to encode a message ID.

## Error Handling

The library throws descriptive errors for various failure conditions:

### Common Errors

- **Invalid Buffer**: Thrown when input buffer is null, undefined, or not a Buffer
- **Buffer Too Short**: Thrown when buffer doesn't contain enough data
- **Invalid Type**: Thrown when package or message type is invalid
- **Invalid Route**: Thrown when route format doesn't match compression flag
- **Invalid ID**: Thrown when message ID is out of valid range

### Error Examples

```javascript
try {
  const result = Package.decode(invalidBuffer);
} catch (error) {
  console.error('Decode failed:', error.message);
}

try {
  const encoded = Message.encode(-1, 0, 0, 'route', body); // Invalid ID
} catch (error) {
  console.error('Encode failed:', error.message);
}
```

## Performance Notes

### Optimization Tips

1. **Buffer Reuse**: Reuse buffers when possible to reduce garbage collection
2. **Batch Operations**: Process multiple messages in batches for better performance
3. **Route Compression**: Use route compression for frequently used routes
4. **String Caching**: Cache encoded strings for repeated use

### Memory Usage

- Package overhead: 4 bytes header + body size
- Message overhead: 1-7 bytes header + route size + body size
- String encoding: 2 bytes length prefix + UTF-8 bytes

### Benchmarks

Typical performance on modern hardware:

- Package encode/decode: ~1M operations/second
- Message encode/decode: ~500K operations/second
- String encode/decode: ~2M operations/second

*Note: Performance varies based on message size and complexity*