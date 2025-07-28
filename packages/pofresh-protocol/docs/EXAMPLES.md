# Usage Examples

This document provides practical examples of using the pofresh-protocol library in various scenarios.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Game Client-Server Communication](#game-client-server-communication)
- [Real-time Chat System](#real-time-chat-system)
- [Route Compression](#route-compression)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Browser Usage](#browser-usage)
- [TypeScript Usage](#typescript-usage)

## Basic Usage

### Simple String Encoding

```javascript
const Protocol = require('pofresh-protocol');

// Encode a simple message
const message = 'Hello, Pofresh!';
const encoded = Protocol.strencode(message);
console.log('Encoded length:', encoded.length);

// Decode it back
const decoded = Protocol.strdecode(encoded);
console.log('Decoded message:', decoded);
// Output: 'Hello, Pofresh!'
```

### Package Operations

```javascript
const { Package } = require('pofresh-protocol');

// Create different types of packages
const handshake = Package.encode(Package.TYPE_HANDSHAKE);
const heartbeat = Package.encode(Package.TYPE_HEARTBEAT);
const dataPackage = Package.encode(Package.TYPE_DATA, Buffer.from('game data'));

// Decode packages
const decodedHandshake = Package.decode(handshake);
console.log('Handshake type:', decodedHandshake.type); // 1
console.log('Handshake body:', decodedHandshake.body); // null

const decodedData = Package.decode(dataPackage);
console.log('Data type:', decodedData.type); // 4
console.log('Data body:', decodedData.body.toString()); // 'game data'
```

## Game Client-Server Communication

### Player Login Flow

```javascript
const Protocol = require('pofresh-protocol');
const { Package, Message } = Protocol;

// Client sends login request
function createLoginRequest(username, password) {
  const loginData = {
    username: username,
    password: password,
    timestamp: Date.now()
  };
  
  const body = Protocol.strencode(JSON.stringify(loginData));
  const message = Message.encode(
    1001, // request id
    Message.TYPE_REQUEST,
    0, // no route compression
    'connector.entryHandler.entry',
    body
  );
  
  return Package.encode(Package.TYPE_DATA, message);
}

// Server processes login request
function processLoginPackage(buffer) {
  const pkg = Package.decode(buffer);
  
  if (pkg.type !== Package.TYPE_DATA) {
    throw new Error('Expected data package');
  }
  
  const msg = Message.decode(pkg.body);
  const loginData = JSON.parse(Protocol.strdecode(msg.body));
  
  console.log('Login request:', {
    id: msg.id,
    route: msg.route,
    username: loginData.username
  });
  
  return msg.id; // Return request ID for response
}

// Server sends login response
function createLoginResponse(requestId, success, userData) {
  const responseData = {
    code: success ? 200 : 401,
    message: success ? 'Login successful' : 'Login failed',
    data: userData || null
  };
  
  const body = Protocol.strencode(JSON.stringify(responseData));
  const message = Message.encode(
    requestId, // same ID as request
    Message.TYPE_RESPONSE,
    0, // no route compression
    null, // no route for response
    body
  );
  
  return Package.encode(Package.TYPE_DATA, message);
}

// Usage
const loginPackage = createLoginRequest('player1', 'secret123');
const requestId = processLoginPackage(loginPackage);
const responsePackage = createLoginResponse(requestId, true, { level: 10, coins: 1000 });
```

### Game State Updates

```javascript
// Server pushes game state to clients
function createGameStateUpdate(gameState) {
  const stateData = {
    players: gameState.players,
    timestamp: Date.now(),
    gameTime: gameState.gameTime
  };
  
  const body = Protocol.strencode(JSON.stringify(stateData));
  const message = Message.encode(
    0, // no ID for push messages
    Message.TYPE_PUSH,
    0,
    'game.stateUpdate',
    body
  );
  
  return Package.encode(Package.TYPE_DATA, message);
}

// Client processes game state update
function processGameStateUpdate(buffer) {
  const pkg = Package.decode(buffer);
  const msg = Message.decode(pkg.body);
  
  if (msg.type === Message.TYPE_PUSH && msg.route === 'game.stateUpdate') {
    const gameState = JSON.parse(Protocol.strdecode(msg.body));
    console.log('Game state updated:', gameState);
    return gameState;
  }
}
```

## Real-time Chat System

### Chat Message Broadcasting

```javascript
const Protocol = require('pofresh-protocol');

// Client sends chat message
function sendChatMessage(messageText, channelId) {
  const chatData = {
    text: messageText,
    channel: channelId,
    timestamp: Date.now()
  };
  
  const body = Protocol.strencode(JSON.stringify(chatData));
  const message = Message.encode(
    0, // no ID for notify
    Message.TYPE_NOTIFY,
    0,
    'chat.send',
    body
  );
  
  return Package.encode(Package.TYPE_DATA, message);
}

// Server broadcasts chat message to channel
function broadcastChatMessage(senderInfo, messageText, channelId) {
  const broadcastData = {
    sender: senderInfo,
    text: messageText,
    channel: channelId,
    timestamp: Date.now()
  };
  
  const body = Protocol.strencode(JSON.stringify(broadcastData));
  const message = Message.encode(
    0, // no ID for push
    Message.TYPE_PUSH,
    0,
    'chat.broadcast',
    body
  );
  
  return Package.encode(Package.TYPE_DATA, message);
}

// Usage
const chatMessage = sendChatMessage('Hello everyone!', 'general');
const broadcast = broadcastChatMessage(
  { username: 'player1', level: 10 },
  'Hello everyone!',
  'general'
);
```

## Route Compression

### Setting Up Route Dictionary

```javascript
const Protocol = require('pofresh-protocol');

// Define route codes for compression
const ROUTE_CODES = {
  'connector.entryHandler.entry': 1,
  'game.playerHandler.move': 2,
  'game.playerHandler.attack': 3,
  'chat.chatHandler.send': 4,
  'game.stateUpdate': 5,
  'chat.broadcast': 6
};

const CODE_TO_ROUTE = Object.fromEntries(
  Object.entries(ROUTE_CODES).map(([route, code]) => [code, route])
);

// Encode with route compression
function encodeWithCompression(id, type, route, body) {
  const routeCode = ROUTE_CODES[route];
  
  if (routeCode) {
    // Use compressed route
    return Message.encode(id, type, 1, routeCode, body);
  } else {
    // Use uncompressed route
    return Message.encode(id, type, 0, route, body);
  }
}

// Decode with route compression
function decodeWithCompression(buffer) {
  const msg = Message.decode(buffer);
  
  if (msg.compressRoute === 1) {
    // Decompress route
    msg.route = CODE_TO_ROUTE[msg.route] || msg.route;
  }
  
  return msg;
}

// Usage example
const body = Protocol.strencode(JSON.stringify({ x: 100, y: 200 }));
const compressed = encodeWithCompression(
  123,
  Message.TYPE_REQUEST,
  'game.playerHandler.move',
  body
);

const decompressed = decodeWithCompression(compressed);
console.log('Route:', decompressed.route); // 'game.playerHandler.move'
```

## Error Handling

### Robust Message Processing

```javascript
const Protocol = require('pofresh-protocol');

function safeProcessMessage(buffer) {
  try {
    // Validate buffer
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error('Invalid buffer');
    }
    
    // Decode package
    const pkg = Package.decode(buffer);
    
    // Validate package type
    if (pkg.type !== Package.TYPE_DATA) {
      console.log('Received non-data package:', pkg.type);
      return null;
    }
    
    // Decode message
    const msg = Message.decode(pkg.body);
    
    // Validate message type
    const validTypes = [
      Message.TYPE_REQUEST,
      Message.TYPE_NOTIFY,
      Message.TYPE_RESPONSE,
      Message.TYPE_PUSH
    ];
    
    if (!validTypes.includes(msg.type)) {
      throw new Error(`Invalid message type: ${msg.type}`);
    }
    
    // Decode body safely
    let bodyData = null;
    try {
      const bodyStr = Protocol.strdecode(msg.body);
      bodyData = JSON.parse(bodyStr);
    } catch (parseError) {
      console.warn('Failed to parse message body:', parseError.message);
      bodyData = { raw: msg.body };
    }
    
    return {
      id: msg.id,
      type: msg.type,
      route: msg.route,
      data: bodyData
    };
    
  } catch (error) {
    console.error('Message processing failed:', error.message);
    return null;
  }
}

// Usage with error handling
function handleIncomingData(buffer) {
  const message = safeProcessMessage(buffer);
  
  if (!message) {
    console.log('Skipping invalid message');
    return;
  }
  
  switch (message.type) {
    case Message.TYPE_REQUEST:
      handleRequest(message);
      break;
    case Message.TYPE_NOTIFY:
      handleNotify(message);
      break;
    case Message.TYPE_RESPONSE:
      handleResponse(message);
      break;
    case Message.TYPE_PUSH:
      handlePush(message);
      break;
  }
}
```

## Performance Optimization

### Buffer Pool for High-Frequency Operations

```javascript
const Protocol = require('pofresh-protocol');

// Simple buffer pool for reuse
class BufferPool {
  constructor(size = 100, bufferSize = 1024) {
    this.pool = [];
    this.size = size;
    this.bufferSize = bufferSize;
    
    // Pre-allocate buffers
    for (let i = 0; i < size; i++) {
      this.pool.push(Buffer.allocUnsafe(bufferSize));
    }
  }
  
  get() {
    return this.pool.pop() || Buffer.allocUnsafe(this.bufferSize);
  }
  
  release(buffer) {
    if (this.pool.length < this.size) {
      this.pool.push(buffer);
    }
  }
}

const bufferPool = new BufferPool();

// Optimized message creation
function createOptimizedMessage(id, type, route, data) {
  // Reuse string encoding for common data
  const dataStr = JSON.stringify(data);
  const body = Protocol.strencode(dataStr);
  
  const message = Message.encode(id, type, 0, route, body);
  const package = Package.encode(Package.TYPE_DATA, message);
  
  return package;
}

// Batch processing for multiple messages
function processBatch(messages) {
  const results = [];
  
  for (const msgBuffer of messages) {
    try {
      const pkg = Package.decode(msgBuffer);
      if (pkg.type === Package.TYPE_DATA) {
        const msg = Message.decode(pkg.body);
        results.push(msg);
      }
    } catch (error) {
      console.warn('Skipping invalid message in batch');
    }
  }
  
  return results;
}
```

## Browser Usage

### Using with Webpack/Vite

```javascript
// ES Module import
import Protocol from 'pofresh-protocol';
// or
import { Package, Message, strencode, strdecode } from 'pofresh-protocol';

// WebSocket client example
class GameClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';
    this.requestId = 1;
    
    this.ws.onmessage = (event) => {
      const buffer = Buffer.from(event.data);
      this.handleMessage(buffer);
    };
  }
  
  send(route, data) {
    const body = strencode(JSON.stringify(data));
    const message = Message.encode(
      this.requestId++,
      Message.TYPE_REQUEST,
      0,
      route,
      body
    );
    const package = Package.encode(Package.TYPE_DATA, message);
    
    this.ws.send(package);
  }
  
  handleMessage(buffer) {
    try {
      const pkg = Package.decode(buffer);
      const msg = Message.decode(pkg.body);
      const data = JSON.parse(strdecode(msg.body));
      
      console.log('Received:', { route: msg.route, data });
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  }
}

// Usage
const client = new GameClient('ws://localhost:3001');
client.send('user.login', { username: 'player1', password: 'secret' });
```

### Direct Browser Usage (UMD)

```html
<!DOCTYPE html>
<html>
<head>
  <script src="./dist/pofresh-protocol.umd.js"></script>
</head>
<body>
  <script>
    // Protocol is available globally
    const { Package, Message } = PofreshProtocol;
    
    // Create a simple message
    const body = PofreshProtocol.strencode('Hello from browser!');
    const message = Message.encode(1, Message.TYPE_REQUEST, 0, 'test.route', body);
    const package = Package.encode(Package.TYPE_DATA, message);
    
    console.log('Encoded package size:', package.length);
    
    // Decode it back
    const decodedPkg = Package.decode(package);
    const decodedMsg = Message.decode(decodedPkg.body);
    const decodedText = PofreshProtocol.strdecode(decodedMsg.body);
    
    console.log('Decoded text:', decodedText);
  </script>
</body>
</html>
```

## TypeScript Usage

### Type-Safe Message Handling

```typescript
import Protocol, { Message, Package, MessageDecodeResult } from 'pofresh-protocol';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  userId?: number;
  error?: string;
}

class TypedMessageHandler {
  private requestId = 1;
  
  createLoginRequest(data: LoginRequest): Buffer {
    const body = Protocol.strencode(JSON.stringify(data));
    const message = Message.encode(
      this.requestId++,
      Message.TYPE_REQUEST,
      0,
      'user.login',
      body
    );
    return Package.encode(Package.TYPE_DATA, message);
  }
  
  processLoginResponse(buffer: Buffer): LoginResponse | null {
    try {
      const pkg = Package.decode(buffer);
      const msg = Message.decode(pkg.body);
      
      if (msg.type === Message.TYPE_RESPONSE) {
        const responseData: LoginResponse = JSON.parse(
          Protocol.strdecode(msg.body)
        );
        return responseData;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to process login response:', error);
      return null;
    }
  }
}

// Usage
const handler = new TypedMessageHandler();
const loginPackage = handler.createLoginRequest({
  username: 'player1',
  password: 'secret123'
});

// Simulate response processing
const response = handler.processLoginResponse(someResponseBuffer);
if (response?.success) {
  console.log('Login successful, user ID:', response.userId);
} else {
  console.log('Login failed:', response?.error);
}
```

These examples demonstrate the flexibility and power of the pofresh-protocol library across different use cases and environments. The library's modular design makes it easy to integrate into various application architectures while maintaining high performance and reliability.