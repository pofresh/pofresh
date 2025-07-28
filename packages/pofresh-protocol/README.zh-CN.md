# pofresh-protocol

[![npm version](https://badge.fury.io/js/pofresh-protocol.svg)](https://badge.fury.io/js/pofresh-protocol)
[![License](https://img.shields.io/npm/l/pofresh-protocol.svg)](https://github.com/pofresh/pofresh-protocol/blob/master/LICENSE)

为 Pofresh 框架提供的高性能二进制协议编码器/解码器。该库为实时游戏通信中使用的包和消息提供高效的编码和解码功能。

## 特性

- 🚀 **高性能**: 针对最小开销优化的二进制协议
- 📦 **模块化设计**: 清晰的关注点分离，独立模块
- 🔧 **多种格式**: 支持 CommonJS、ES 模块和 UMD
- 🧪 **完善测试**: 100% 覆盖率的综合测试套件
- 📝 **TypeScript 支持**: 包含完整的 TypeScript 类型定义
- 🌐 **跨平台**: 在 Node.js 和浏览器中均可运行

## 安装

```bash
npm install pofresh-protocol
```

## 快速开始

```javascript
const Protocol = require('pofresh-protocol');

// 字符串编码/解码
const encoded = Protocol.strencode('你好，世界!');
const decoded = Protocol.strdecode(encoded);
console.log(decoded); // '你好，世界!'

// 包编码/解码
const packageData = Protocol.Package.encode(Protocol.Package.TYPE_DATA, encoded);
const decodedPackage = Protocol.Package.decode(packageData);

// 消息编码/解码
const messageData = Protocol.Message.encode(
  123, // id
  Protocol.Message.TYPE_REQUEST, // type
  0, // compress
  'user.login', // route
  encoded // body
);
const decodedMessage = Protocol.Message.decode(messageData);
```

## API 参考

### Protocol 类

主要的 Protocol 类提供对所有功能的访问：

#### 静态方法

- `Protocol.strencode(str)` - 将字符串编码为缓冲区
- `Protocol.strdecode(buffer)` - 将缓冲区解码为字符串

#### 静态属性

- `Protocol.Package` - 包编码器/解码器
- `Protocol.Message` - 消息编码器/解码器
- `Protocol.constants` - 协议常量
- `Protocol.bufferUtils` - 缓冲区工具
- `Protocol.messageUtils` - 消息工具

### Package 类

处理包级别的编码和解码。

#### 常量

```javascript
Protocol.Package.TYPE_HANDSHAKE = 1;     // 握手包
Protocol.Package.TYPE_HANDSHAKE_ACK = 2; // 握手确认包
Protocol.Package.TYPE_HEARTBEAT = 3;     // 心跳包
Protocol.Package.TYPE_DATA = 4;          // 数据包
Protocol.Package.TYPE_KICK = 5;          // 踢出包
```

#### 方法

- `Package.encode(type, body?)` - 编码包
  - `type` (number): 包类型
  - `body` (Buffer, 可选): 包体
  - 返回: 编码后的缓冲区

- `Package.decode(buffer)` - 解码包
  - `buffer` (Buffer): 编码的包数据
  - 返回: `{ type: number, body: Buffer|null }`

#### 示例

```javascript
const { Package } = require('pofresh-protocol');

// 编码数据包
const body = Buffer.from('Hello World');
const encoded = Package.encode(Package.TYPE_DATA, body);

// 解码包
const decoded = Package.decode(encoded);
console.log(decoded.type); // 4 (TYPE_DATA)
console.log(decoded.body.toString()); // 'Hello World'

// 编码心跳包（无包体）
const heartbeat = Package.encode(Package.TYPE_HEARTBEAT);
const decodedHeartbeat = Package.decode(heartbeat);
console.log(decodedHeartbeat.body); // null
```

### Message 类

处理消息级别的编码和解码。

#### 常量

```javascript
Protocol.Message.TYPE_REQUEST = 0;  // 请求消息
Protocol.Message.TYPE_NOTIFY = 1;   // 通知消息
Protocol.Message.TYPE_RESPONSE = 2; // 响应消息
Protocol.Message.TYPE_PUSH = 3;     // 推送消息
```

#### 方法

- `Message.encode(id, type, compressRoute, route, body)` - 编码消息
  - `id` (number): 消息 ID
  - `type` (number): 消息类型
  - `compressRoute` (number): 路由压缩标志 (0 或 1)
  - `route` (string|number): 消息路由
  - `body` (Buffer): 消息体
  - 返回: 编码后的缓冲区

- `Message.decode(buffer)` - 解码消息
  - `buffer` (Buffer): 编码的消息数据
  - 返回: `{ id, type, compressRoute, route, body }`

#### 示例

```javascript
const { Message, strencode, strdecode } = require('pofresh-protocol');

// 编码请求消息
const body = strencode(JSON.stringify({ username: 'player1' }));
const encoded = Message.encode(
  123, // 请求 id
  Message.TYPE_REQUEST,
  0, // 无路由压缩
  'user.login',
  body
);

// 解码消息
const decoded = Message.decode(encoded);
console.log(decoded.id); // 123
console.log(decoded.type); // 0 (TYPE_REQUEST)
console.log(decoded.route); // 'user.login'
console.log(JSON.parse(strdecode(decoded.body))); // { username: 'player1' }

// 编码通知消息（无需响应）
const notifyBody = strencode(JSON.stringify({ message: '欢迎!' }));
const notify = Message.encode(
  0, // 通知无 id
  Message.TYPE_NOTIFY,
  0,
  'chat.broadcast',
  notifyBody
);
```

### 字符串编解码

用于字符串与缓冲区之间编码和解码的工具。

```javascript
const { strencode, strdecode } = require('pofresh-protocol');

// 编码字符串（支持 Unicode）
const buffer = strencode('你好，世界! 🌍');
console.log(buffer); // <Buffer ...>

// 将缓冲区解码回字符串
const string = strdecode(buffer);
console.log(string); // '你好，世界! 🌍'
```

## 模块结构

该库组织为几个专注的模块：

- **`lib/constants.js`** - 协议常量和类型定义
- **`lib/buffer-utils.js`** - 缓冲区操作工具
- **`lib/string-codec.js`** - 字符串编码/解码函数
- **`lib/message-utils.js`** - 消息特定的工具函数
- **`lib/package.js`** - 包编码器/解码器
- **`lib/message.js`** - 消息编码器/解码器
- **`lib/protocol-core.js`** - 核心 Protocol 类
- **`lib/index.js`** - 主入口点

## 构建格式

该库提供多种格式：

- **CommonJS**: `index.js` (Node.js)
- **ES 模块**: `dist/pofresh-protocol.es.js` (现代打包工具)
- **UMD**: `dist/pofresh-protocol.umd.js` (浏览器)

## 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 监视模式运行测试
npm run test:watch

# 运行测试并生成覆盖率报告
npm run test:coverage

# 构建库
npm run build

# 监视模式构建
npm run build:watch

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 游戏开发示例

### 玩家登录流程

```javascript
const Protocol = require('pofresh-protocol');
const { Package, Message } = Protocol;

// 客户端发送登录请求
function createLoginRequest(username, password) {
  const loginData = {
    username: username,
    password: password,
    timestamp: Date.now()
  };
  
  const body = Protocol.strencode(JSON.stringify(loginData));
  const message = Message.encode(
    1001, // 请求 id
    Message.TYPE_REQUEST,
    0, // 无路由压缩
    'connector.entryHandler.entry',
    body
  );
  
  return Package.encode(Package.TYPE_DATA, message);
}

// 服务器处理登录请求
function processLoginPackage(buffer) {
  const pkg = Package.decode(buffer);
  const msg = Message.decode(pkg.body);
  const loginData = JSON.parse(Protocol.strdecode(msg.body));
  
  console.log('登录请求:', {
    id: msg.id,
    route: msg.route,
    username: loginData.username
  });
  
  return msg.id; // 返回请求 ID 用于响应
}
```

### 实时聊天系统

```javascript
// 客户端发送聊天消息
function sendChatMessage(messageText, channelId) {
  const chatData = {
    text: messageText,
    channel: channelId,
    timestamp: Date.now()
  };
  
  const body = Protocol.strencode(JSON.stringify(chatData));
  const message = Message.encode(
    0, // 通知无 ID
    Message.TYPE_NOTIFY,
    0,
    'chat.send',
    body
  );
  
  return Package.encode(Package.TYPE_DATA, message);
}

// 服务器广播聊天消息
function broadcastChatMessage(senderInfo, messageText, channelId) {
  const broadcastData = {
    sender: senderInfo,
    text: messageText,
    channel: channelId,
    timestamp: Date.now()
  };
  
  const body = Protocol.strencode(JSON.stringify(broadcastData));
  const message = Message.encode(
    0, // 推送无 ID
    Message.TYPE_PUSH,
    0,
    'chat.broadcast',
    body
  );
  
  return Package.encode(Package.TYPE_DATA, message);
}
```

## 路由压缩

对于频繁使用的路由，可以使用路由压缩来减少网络传输：

```javascript
// 定义路由代码字典
const ROUTE_CODES = {
  'connector.entryHandler.entry': 1,
  'game.playerHandler.move': 2,
  'game.playerHandler.attack': 3,
  'chat.chatHandler.send': 4
};

// 使用压缩路由编码
function encodeWithCompression(id, type, route, body) {
  const routeCode = ROUTE_CODES[route];
  
  if (routeCode) {
    // 使用压缩路由
    return Message.encode(id, type, 1, routeCode, body);
  } else {
    // 使用未压缩路由
    return Message.encode(id, type, 0, route, body);
  }
}
```

## 错误处理

```javascript
function safeProcessMessage(buffer) {
  try {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error('无效的缓冲区');
    }
    
    const pkg = Package.decode(buffer);
    const msg = Message.decode(pkg.body);
    
    return {
      id: msg.id,
      type: msg.type,
      route: msg.route,
      data: JSON.parse(Protocol.strdecode(msg.body))
    };
    
  } catch (error) {
    console.error('消息处理失败:', error.message);
    return null;
  }
}
```

## 浏览器使用

### ES 模块导入

```javascript
import Protocol from 'pofresh-protocol';
// 或
import { Package, Message, strencode, strdecode } from 'pofresh-protocol';

// WebSocket 客户端示例
class GameClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';
    
    this.ws.onmessage = (event) => {
      const buffer = Buffer.from(event.data);
      this.handleMessage(buffer);
    };
  }
  
  send(route, data) {
    const body = strencode(JSON.stringify(data));
    const message = Message.encode(1, Message.TYPE_REQUEST, 0, route, body);
    const package = Package.encode(Package.TYPE_DATA, message);
    
    this.ws.send(package);
  }
}
```

### UMD 直接使用

```html
<!DOCTYPE html>
<html>
<head>
  <script src="./dist/pofresh-protocol.umd.js"></script>
</head>
<body>
  <script>
    // Protocol 全局可用
    const { Package, Message } = PofreshProtocol;
    
    const body = PofreshProtocol.strencode('来自浏览器的问候!');
    const message = Message.encode(1, Message.TYPE_REQUEST, 0, 'test.route', body);
    const package = Package.encode(Package.TYPE_DATA, message);
    
    console.log('编码包大小:', package.length);
  </script>
</body>
</html>
```

## TypeScript 支持

```typescript
import Protocol, { Message, Package } from 'pofresh-protocol';

interface LoginRequest {
  username: string;
  password: string;
}

class TypedMessageHandler {
  createLoginRequest(data: LoginRequest): Buffer {
    const body = Protocol.strencode(JSON.stringify(data));
    return Message.encode(1, Message.TYPE_REQUEST, 0, 'user.login', body);
  }
}
```

## 性能优化建议

1. **缓冲区重用**: 尽可能重用缓冲区以减少垃圾回收
2. **批量操作**: 批量处理多个消息以获得更好的性能
3. **路由压缩**: 对频繁使用的路由使用路由压缩
4. **字符串缓存**: 缓存编码的字符串以供重复使用

## 协议详情

有关 Pofresh 协议的更多详细信息：

- [Pofresh 协议文档](https://github.com/pofresh/pofresh/wiki/Pofresh-%E5%8D%8F%E8%AE%AE)
- [Pofresh 数据压缩](https://github.com/pofresh/pofresh/wiki/Pofresh-%E6%95%B0%E6%8D%AE%E5%8E%8B%E7%BC%A9%E5%8D%8F%E8%AE%AE)

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 链接

- **主页**: <http://pofresh.netease.com/>
- **文档**: <http://github.com/netease/pofresh>
- **问题**: <https://github.com/netease/netease/issues/>
- **标签**: 游戏, nodejs, 协议, js, javascript, 实时, 二进制