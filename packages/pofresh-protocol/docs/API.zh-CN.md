# API 文档

本文档提供 pofresh-protocol 库的详细 API 文档。

## 目录

- [Protocol 类](#protocol-类)
- [Package 类](#package-类)
- [Message 类](#message-类)
- [字符串编解码](#字符串编解码)
- [常量](#常量)
- [工具函数](#工具函数)
- [错误处理](#错误处理)
- [性能说明](#性能说明)

## Protocol 类

pofresh-protocol 库的主要入口点。

### 静态属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `Package` | Class | 包编码器/解码器类 |
| `Message` | Class | 消息编码器/解码器类 |
| `constants` | Object | 协议常量 |
| `bufferUtils` | Object | 缓冲区工具函数 |
| `messageUtils` | Object | 消息工具函数 |

### 静态方法

#### `Protocol.strencode(str)`

使用 UTF-8 编码将字符串编码为缓冲区。

**参数:**
- `str` (string): 要编码的字符串

**返回:**
- `Buffer`: 编码后的缓冲区

**示例:**
```javascript
const buffer = Protocol.strencode('你好，世界!');
console.log(buffer); // <Buffer 48 65 6c 6c 6f 2c 20 e4 b8 96 e7 95 8c 21>
```

#### `Protocol.strdecode(buffer)`

使用 UTF-8 编码将缓冲区解码为字符串。

**参数:**
- `buffer` (Buffer): 要解码的缓冲区

**返回:**
- `string`: 解码后的字符串

**示例:**
```javascript
const str = Protocol.strdecode(buffer);
console.log(str); // '你好，世界!'
```

## Package 类

处理 Pofresh 协议的包级别编码和解码。

### 常量

| 常量 | 值 | 描述 |
|------|----|----- |
| `TYPE_HANDSHAKE` | 1 | 握手包类型 |
| `TYPE_HANDSHAKE_ACK` | 2 | 握手确认包 |
| `TYPE_HEARTBEAT` | 3 | 心跳包类型 |
| `TYPE_DATA` | 4 | 数据包类型 |
| `TYPE_KICK` | 5 | 踢出包类型 |

### 方法

#### `Package.encode(type, body?)`

使用指定类型和可选包体编码包。

**参数:**
- `type` (number): 包类型（使用 Package.TYPE_* 常量）
- `body` (Buffer, 可选): 包体数据

**返回:**
- `Buffer`: 编码后的包缓冲区

**抛出异常:**
- `Error`: 如果类型无效或提供的包体不是 Buffer

**示例:**
```javascript
// 带包体的数据包
const body = Buffer.from('Hello World');
const dataPackage = Package.encode(Package.TYPE_DATA, body);

// 无包体的心跳包
const heartbeat = Package.encode(Package.TYPE_HEARTBEAT);
```

#### `Package.decode(buffer)`

从缓冲区解码包。

**参数:**
- `buffer` (Buffer): 包含编码包数据的缓冲区

**返回:**
- `Object`: 解码后的包，包含以下属性：
  - `type` (number): 包类型
  - `body` (Buffer|null): 包体或 null（如果无包体）

**抛出异常:**
- `Error`: 如果缓冲区无效或损坏

**示例:**
```javascript
const decoded = Package.decode(encodedBuffer);
console.log(decoded.type); // 4
console.log(decoded.body); // <Buffer ...> 或 null
```

## Message 类

处理 Pofresh 协议的消息级别编码和解码。

### 常量

| 常量 | 值 | 描述 |
|------|----|----- |
| `TYPE_REQUEST` | 0 | 请求消息类型 |
| `TYPE_NOTIFY` | 1 | 通知消息类型 |
| `TYPE_RESPONSE` | 2 | 响应消息类型 |
| `TYPE_PUSH` | 3 | 推送消息类型 |

### 方法

#### `Message.encode(id, type, compressRoute, route, body)`

使用指定参数编码消息。

**参数:**
- `id` (number): 消息 ID (0-2^32)
- `type` (number): 消息类型（使用 Message.TYPE_* 常量）
- `compressRoute` (number): 路由压缩标志（0 = 无压缩，1 = 压缩）
- `route` (string|number|null): 消息路由
- `body` (Buffer): 消息体数据

**返回:**
- `Buffer`: 编码后的消息缓冲区

**抛出异常:**
- `Error`: 如果参数无效

**路由压缩:**
- 当 `compressRoute` 为 0 时，`route` 应为字符串
- 当 `compressRoute` 为 1 时，`route` 应为数字（路由代码）
- 对于响应消息，`route` 可以为 null

**示例:**
```javascript
// 请求消息
const request = Message.encode(
  123,                    // id
  Message.TYPE_REQUEST,   // type
  0,                      // 无压缩
  'user.login',          // route
  Buffer.from('data')     // body
);

// 压缩路由消息
const compressed = Message.encode(
  456,                    // id
  Message.TYPE_REQUEST,   // type
  1,                      // 压缩
  42,                     // 路由代码
  Buffer.from('data')     // body
);

// 通知消息（无 ID）
const notify = Message.encode(
  0,                      // 通知无 id
  Message.TYPE_NOTIFY,    // type
  0,                      // 无压缩
  'chat.broadcast',       // route
  Buffer.from('message')  // body
);
```

#### `Message.decode(buffer)`

从缓冲区解码消息。

**参数:**
- `buffer` (Buffer): 包含编码消息数据的缓冲区

**返回:**
- `Object`: 解码后的消息，包含以下属性：
  - `id` (number): 消息 ID
  - `type` (number): 消息类型
  - `compressRoute` (number): 路由压缩标志
  - `route` (string|number|null): 消息路由
  - `body` (Buffer): 消息体

**抛出异常:**
- `Error`: 如果缓冲区无效或损坏

**示例:**
```javascript
const decoded = Message.decode(encodedBuffer);
console.log(decoded.id);           // 123
console.log(decoded.type);         // 0 (TYPE_REQUEST)
console.log(decoded.compressRoute); // 0
console.log(decoded.route);        // 'user.login'
console.log(decoded.body);         // <Buffer ...>
```

## 字符串编解码

用于字符串与缓冲区之间编码和解码的工具。

### 函数

#### `strencode(str)`

使用 UTF-8 编码将字符串编码为带长度前缀的缓冲区。

**参数:**
- `str` (string): 要编码的字符串

**返回:**
- `Buffer`: 带长度前缀的编码缓冲区

**格式:**
- 前 2 字节: 字符串长度（大端序）
- 剩余字节: UTF-8 编码的字符串

#### `strdecode(buffer)`

解码缓冲区为字符串，读取长度前缀。

**参数:**
- `buffer` (Buffer): 要解码的缓冲区

**返回:**
- `string`: 解码后的字符串

**示例:**
```javascript
const { strencode, strdecode } = require('pofresh-protocol');

// 支持 Unicode 的编码
const buffer = strencode('你好，世界! 🌍');
console.log(buffer.length); // 长度包括 2 字节前缀

// 解码回字符串
const string = strdecode(buffer);
console.log(string); // '你好，世界! 🌍'
```

## 常量

整个库中使用的协议常量。

### 包常量

| 常量 | 值 | 描述 |
|------|----|----- |
| `PKG_HEAD_BYTES` | 4 | 包头大小（字节） |

### 消息常量

| 常量 | 值 | 描述 |
|------|----|----- |
| `MSG_FLAG_BYTES` | 1 | 消息标志大小（字节） |
| `MSG_ROUTE_CODE_BYTES` | 2 | 路由代码大小（字节） |
| `MSG_ID_MAX_BYTES` | 5 | 最大消息 ID 大小（字节） |
| `MSG_ROUTE_LEN_BYTES` | 1 | 路由长度大小（字节） |
| `MSG_ROUTE_CODE_MAX` | 65535 | 最大路由代码值 |

### 位掩码

| 常量 | 值 | 描述 |
|------|----|----- |
| `MSG_COMPRESS_ROUTE_MASK` | 0x1 | 路由压缩位掩码 |
| `MSG_COMPRESS_GZIP_MASK` | 0x10 | GZIP 压缩位掩码 |
| `MSG_COMPRESS_GZIP_ENCODE_MASK` | 0x20 | GZIP 编码位掩码 |
| `MSG_TYPE_MASK` | 0x7 | 消息类型位掩码 |

## 工具函数

### 缓冲区工具

缓冲区操作工具。

#### `bufferUtils.writeUInt32(buffer, value, offset)`

向缓冲区写入 32 位无符号整数。

#### `bufferUtils.readUInt32(buffer, offset)`

从缓冲区读取 32 位无符号整数。

### 消息工具

消息处理工具。

#### `messageUtils.msgHasId(type)`

检查消息类型是否需要 ID。

#### `messageUtils.msgHasRoute(type)`

检查消息类型是否需要路由。

#### `messageUtils.caculateMsgIdBytes(id)`

计算编码消息 ID 所需的字节数。

## 错误处理

库会为各种失败情况抛出描述性错误：

### 常见错误

- **无效缓冲区**: 当输入缓冲区为 null、undefined 或不是 Buffer 时抛出
- **缓冲区太短**: 当缓冲区不包含足够数据时抛出
- **无效类型**: 当包或消息类型无效时抛出
- **无效路由**: 当路由格式与压缩标志不匹配时抛出
- **无效 ID**: 当消息 ID 超出有效范围时抛出

### 错误示例

```javascript
try {
  const result = Package.decode(invalidBuffer);
} catch (error) {
  console.error('解码失败:', error.message);
}

try {
  const encoded = Message.encode(-1, 0, 0, 'route', body); // 无效 ID
} catch (error) {
  console.error('编码失败:', error.message);
}
```

## 性能说明

### 优化建议

1. **缓冲区重用**: 尽可能重用缓冲区以减少垃圾回收
2. **批量操作**: 批量处理多个消息以获得更好的性能
3. **路由压缩**: 对频繁使用的路由使用路由压缩
4. **字符串缓存**: 缓存编码的字符串以供重复使用

### 内存使用

- 包开销: 4 字节头 + 包体大小
- 消息开销: 1-7 字节头 + 路由大小 + 包体大小
- 字符串编码: 2 字节长度前缀 + UTF-8 字节

### 性能基准

现代硬件上的典型性能：

- 包编码/解码: ~100万 操作/秒
- 消息编码/解码: ~50万 操作/秒
- 字符串编码/解码: ~200万 操作/秒

*注意: 性能因消息大小和复杂性而异*

## 实际应用示例

### 游戏服务器消息处理

```javascript
const Protocol = require('pofresh-protocol');

// 消息路由处理器
class MessageRouter {
  constructor() {
    this.handlers = new Map();
    this.requestId = 1;
  }
  
  // 注册路由处理器
  register(route, handler) {
    this.handlers.set(route, handler);
  }
  
  // 处理传入消息
  async handleMessage(buffer) {
    try {
      const pkg = Package.decode(buffer);
      if (pkg.type !== Package.TYPE_DATA) {
        return null;
      }
      
      const msg = Message.decode(pkg.body);
      const handler = this.handlers.get(msg.route);
      
      if (!handler) {
        console.warn(`未找到路由处理器: ${msg.route}`);
        return null;
      }
      
      const data = JSON.parse(Protocol.strdecode(msg.body));
      const result = await handler(data, msg);
      
      // 如果是请求，发送响应
      if (msg.type === Message.TYPE_REQUEST) {
        return this.createResponse(msg.id, result);
      }
      
      return null;
    } catch (error) {
      console.error('消息处理错误:', error);
      return null;
    }
  }
  
  // 创建响应消息
  createResponse(requestId, data) {
    const body = Protocol.strencode(JSON.stringify(data));
    const message = Message.encode(
      requestId,
      Message.TYPE_RESPONSE,
      0,
      null,
      body
    );
    return Package.encode(Package.TYPE_DATA, message);
  }
  
  // 创建推送消息
  createPush(route, data) {
    const body = Protocol.strencode(JSON.stringify(data));
    const message = Message.encode(
      0,
      Message.TYPE_PUSH,
      0,
      route,
      body
    );
    return Package.encode(Package.TYPE_DATA, message);
  }
}

// 使用示例
const router = new MessageRouter();

// 注册登录处理器
router.register('user.login', async (data, msg) => {
  console.log(`用户登录: ${data.username}`);
  return {
    success: true,
    userId: 12345,
    token: 'abc123'
  };
});

// 注册聊天处理器
router.register('chat.send', async (data, msg) => {
  console.log(`聊天消息: ${data.text}`);
  // 广播给其他玩家
  return { success: true };
});
```

### 客户端连接管理

```javascript
const Protocol = require('pofresh-protocol');
const WebSocket = require('ws');

class GameClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';
    this.requestId = 1;
    this.pendingRequests = new Map();
    
    this.ws.onopen = () => {
      console.log('连接已建立');
      this.sendHandshake();
    };
    
    this.ws.onmessage = (event) => {
      this.handleMessage(Buffer.from(event.data));
    };
    
    this.ws.onclose = () => {
      console.log('连接已关闭');
    };
  }
  
  // 发送握手
  sendHandshake() {
    const handshake = Package.encode(Package.TYPE_HANDSHAKE);
    this.ws.send(handshake);
  }
  
  // 发送请求
  async request(route, data, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('请求超时'));
      }, timeout);
      
      this.pendingRequests.set(id, { resolve, reject, timer });
      
      const body = Protocol.strencode(JSON.stringify(data));
      const message = Message.encode(id, Message.TYPE_REQUEST, 0, route, body);
      const package = Package.encode(Package.TYPE_DATA, message);
      
      this.ws.send(package);
    });
  }
  
  // 发送通知
  notify(route, data) {
    const body = Protocol.strencode(JSON.stringify(data));
    const message = Message.encode(0, Message.TYPE_NOTIFY, 0, route, body);
    const package = Package.encode(Package.TYPE_DATA, message);
    
    this.ws.send(package);
  }
  
  // 处理消息
  handleMessage(buffer) {
    try {
      const pkg = Package.decode(buffer);
      
      switch (pkg.type) {
        case Package.TYPE_HANDSHAKE_ACK:
          console.log('握手确认');
          break;
          
        case Package.TYPE_HEARTBEAT:
          // 回复心跳
          this.ws.send(Package.encode(Package.TYPE_HEARTBEAT));
          break;
          
        case Package.TYPE_DATA:
          this.handleDataMessage(pkg.body);
          break;
          
        case Package.TYPE_KICK:
          console.log('被服务器踢出');
          this.ws.close();
          break;
      }
    } catch (error) {
      console.error('消息处理错误:', error);
    }
  }
  
  // 处理数据消息
  handleDataMessage(buffer) {
    const msg = Message.decode(buffer);
    const data = JSON.parse(Protocol.strdecode(msg.body));
    
    switch (msg.type) {
      case Message.TYPE_RESPONSE:
        this.handleResponse(msg.id, data);
        break;
        
      case Message.TYPE_PUSH:
        this.handlePush(msg.route, data);
        break;
    }
  }
  
  // 处理响应
  handleResponse(id, data) {
    const pending = this.pendingRequests.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRequests.delete(id);
      pending.resolve(data);
    }
  }
  
  // 处理推送
  handlePush(route, data) {
    console.log(`收到推送 [${route}]:`, data);
    // 触发事件或调用回调
  }
}

// 使用示例
const client = new GameClient('ws://localhost:3001');

// 登录
client.request('user.login', {
  username: 'player1',
  password: 'secret123'
}).then(result => {
  console.log('登录成功:', result);
}).catch(error => {
  console.error('登录失败:', error);
});

// 发送聊天消息
client.notify('chat.send', {
  text: '大家好!',
  channel: 'world'
});
```

这些示例展示了如何在实际应用中使用 pofresh-protocol 库构建健壮的客户端-服务器通信系统。