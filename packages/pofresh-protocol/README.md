# pofresh-protocol

[![npm version](https://badge.fury.io/js/pofresh-protocol.svg)](https://badge.fury.io/js/pofresh-protocol)
[![License](https://img.shields.io/npm/l/pofresh-protocol.svg)](https://github.com/pofresh/pofresh-protocol/blob/master/LICENSE)

A high-performance binary protocol encoder/decoder for the Pofresh framework. This library provides efficient encoding and decoding of packages and messages used in real-time game communication.

## Features

- 🚀 **High Performance**: Optimized binary protocol for minimal overhead
- 📦 **Modular Design**: Clean separation of concerns with individual modules
- 🔧 **Multiple Formats**: Support for CommonJS, ES Modules, and UMD
- 🧪 **Well Tested**: Comprehensive test suite with 100% coverage
- 📝 **TypeScript Support**: Full TypeScript definitions included
- 🌐 **Cross Platform**: Works in Node.js and browsers

## Installation

```bash
npm install pofresh-protocol
```

## Quick Start

```javascript
const Protocol = require('pofresh-protocol');

// String encoding/decoding
const encoded = Protocol.strencode('Hello, 世界!');
const decoded = Protocol.strdecode(encoded);
console.log(decoded); // 'Hello, 世界!'

// Package encoding/decoding
const packageData = Protocol.Package.encode(Protocol.Package.TYPE_DATA, encoded);
const decodedPackage = Protocol.Package.decode(packageData);

// Message encoding/decoding
const messageData = Protocol.Message.encode(
  123, // id
  Protocol.Message.TYPE_REQUEST, // type
  0, // compress
  'user.login', // route
  encoded // body
);
const decodedMessage = Protocol.Message.decode(messageData);
```

## API Reference

### Protocol

The main Protocol class provides access to all functionality:

#### Static Methods

- `Protocol.strencode(str)` - Encode string to buffer
- `Protocol.strdecode(buffer)` - Decode buffer to string

#### Static Properties

- `Protocol.Package` - Package encoder/decoder
- `Protocol.Message` - Message encoder/decoder
- `Protocol.constants` - Protocol constants
- `Protocol.bufferUtils` - Buffer utilities
- `Protocol.messageUtils` - Message utilities

### Package

Handles package-level encoding and decoding.

#### Constants

```javascript
Protocol.Package.TYPE_HANDSHAKE = 1;
Protocol.Package.TYPE_HANDSHAKE_ACK = 2;
Protocol.Package.TYPE_HEARTBEAT = 3;
Protocol.Package.TYPE_DATA = 4;
Protocol.Package.TYPE_KICK = 5;
```

#### Methods

- `Package.encode(type, body?)` - Encode package
  - `type` (number): Package type
  - `body` (Buffer, optional): Package body
  - Returns: Encoded buffer

- `Package.decode(buffer)` - Decode package
  - `buffer` (Buffer): Encoded package data
  - Returns: `{ type: number, body: Buffer|null }`

#### Example

```javascript
const { Package } = require('pofresh-protocol');

// Encode a data package
const body = Buffer.from('Hello World');
const encoded = Package.encode(Package.TYPE_DATA, body);

// Decode the package
const decoded = Package.decode(encoded);
console.log(decoded.type); // 4 (TYPE_DATA)
console.log(decoded.body.toString()); // 'Hello World'

// Encode a heartbeat package (no body)
const heartbeat = Package.encode(Package.TYPE_HEARTBEAT);
const decodedHeartbeat = Package.decode(heartbeat);
console.log(decodedHeartbeat.body); // null
```

### Message

Handles message-level encoding and decoding.

#### Constants

```javascript
Protocol.Message.TYPE_REQUEST = 0;
Protocol.Message.TYPE_NOTIFY = 1;
Protocol.Message.TYPE_RESPONSE = 2;
Protocol.Message.TYPE_PUSH = 3;
```

#### Methods

- `Message.encode(id, type, compressRoute, route, body)` - Encode message
  - `id` (number): Message ID
  - `type` (number): Message type
  - `compressRoute` (number): Route compression flag (0 or 1)
  - `route` (string|number): Message route
  - `body` (Buffer): Message body
  - Returns: Encoded buffer

- `Message.decode(buffer)` - Decode message
  - `buffer` (Buffer): Encoded message data
  - Returns: `{ id, type, compressRoute, route, body }`

#### Example

```javascript
const { Message, strencode, strdecode } = require('pofresh-protocol');

// Encode a request message
const body = strencode(JSON.stringify({ username: 'player1' }));
const encoded = Message.encode(
  123, // request id
  Message.TYPE_REQUEST,
  0, // no route compression
  'user.login',
  body
);

// Decode the message
const decoded = Message.decode(encoded);
console.log(decoded.id); // 123
console.log(decoded.type); // 0 (TYPE_REQUEST)
console.log(decoded.route); // 'user.login'
console.log(JSON.parse(strdecode(decoded.body))); // { username: 'player1' }

// Encode a notify message (no response expected)
const notifyBody = strencode(JSON.stringify({ message: 'Welcome!' }));
const notify = Message.encode(
  0, // no id for notify
  Message.TYPE_NOTIFY,
  0,
  'chat.broadcast',
  notifyBody
);
```

### String Codec

Utilities for encoding and decoding strings to/from buffers.

```javascript
const { strencode, strdecode } = require('pofresh-protocol');

// Encode string (supports Unicode)
const buffer = strencode('Hello, 世界! 🌍');
console.log(buffer); // <Buffer ...>

// Decode buffer back to string
const string = strdecode(buffer);
console.log(string); // 'Hello, 世界! 🌍'
```

## Module Structure

The library is organized into several focused modules:

- **`lib/constants.js`** - Protocol constants and type definitions
- **`lib/buffer-utils.js`** - Buffer manipulation utilities
- **`lib/string-codec.js`** - String encoding/decoding functions
- **`lib/message-utils.js`** - Message-specific utility functions
- **`lib/package.js`** - Package encoder/decoder
- **`lib/message.js`** - Message encoder/decoder
- **`lib/protocol-core.js`** - Core Protocol class
- **`lib/index.js`** - Main entry point

## Build Formats

The library is available in multiple formats:

- **CommonJS**: `index.js` (Node.js)
- **ES Modules**: `dist/pofresh-protocol.es.js` (Modern bundlers)
- **UMD**: `dist/pofresh-protocol.umd.js` (Browsers)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Build the library
npm run build

# Build in watch mode
npm run build:watch

# Lint code
npm run lint

# Format code
npm run format
```

## Protocol Details

For more detailed information about the Pofresh protocol:

- [Pofresh Protocol Documentation](https://github.com/pofresh/pofresh/wiki/Pofresh-%E5%8D%8F%E8%AE%AE)
- [Pofresh Data Compression](https://github.com/pofresh/pofresh/wiki/Pofresh-%E6%95%B0%E6%8D%AE%E5%8E%8B%E7%BC%A9%E5%8D%8F%E8%AE%AE)

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- **Homepage**: <http://pofresh.netease.com/>
- **Documentation**: <http://github.com/netease/pofresh>
- **Issues**: <https://github.com/netease/netease/issues/>
- **Tags**: game, nodejs, protocol, js, javascript, real-time, binary
