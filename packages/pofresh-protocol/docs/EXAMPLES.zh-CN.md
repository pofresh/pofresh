# 使用示例

本文档提供 pofresh-protocol 库的实际使用示例。

## 目录

- [基本用法](#基本用法)
- [游戏客户端-服务器通信](#游戏客户端-服务器通信)
- [实时聊天系统](#实时聊天系统)
- [路由压缩](#路由压缩)
- [错误处理](#错误处理)
- [性能优化](#性能优化)
- [浏览器使用](#浏览器使用)
- [TypeScript 使用](#typescript-使用)

## 基本用法

### 包编码和解码

```javascript
const Protocol = require('pofresh-protocol');
const { Package } = Protocol;

// 编码心跳包
const heartbeat = Package.encode(Package.TYPE_HEARTBEAT);
console.log('心跳包:', heartbeat);

// 编码数据包
const body = Buffer.from('Hello, World!');
const dataPackage = Package.encode(Package.TYPE_DATA, body);
console.log('数据包:', dataPackage);

// 解码包
const decoded = Package.decode(dataPackage);
console.log('包类型:', decoded.type);
console.log('包体:', decoded.body.toString());
```

### 消息编码和解码

```javascript
const { Message } = Protocol;

// 编码请求消息
const requestBody = Buffer.from(JSON.stringify({ username: '张三', password: '123456' }));
const request = Message.encode(
  123,                    // 消息 ID
  Message.TYPE_REQUEST,   // 消息类型
  0,                      // 不压缩路由
  'user.login',          // 路由
  requestBody            // 消息体
);

// 解码消息
const decodedMsg = Message.decode(request);
console.log('消息 ID:', decodedMsg.id);
console.log('消息类型:', decodedMsg.type);
console.log('路由:', decodedMsg.route);
console.log('消息体:', JSON.parse(decodedMsg.body.toString()));
```

### 字符串编码和解码

```javascript
const { strencode, strdecode } = Protocol;

// 编码中文字符串
const chineseText = '你好，世界！这是一个测试。';
const encoded = strencode(chineseText);
console.log('编码后的缓冲区:', encoded);

// 解码回字符串
const decoded = strdecode(encoded);
console.log('解码后的字符串:', decoded);

// 支持 emoji 和特殊字符
const emojiText = '🎮 游戏开始！🚀';
const encodedEmoji = strencode(emojiText);
const decodedEmoji = strdecode(encodedEmoji);
console.log('Emoji 文本:', decodedEmoji);
```

## 游戏客户端-服务器通信

### 服务器端实现

```javascript
const Protocol = require('pofresh-protocol');
const WebSocket = require('ws');
const { Package, Message } = Protocol;

class GameServer {
  constructor(port = 3001) {
    this.wss = new WebSocket.Server({ port });
    this.clients = new Map();
    this.rooms = new Map();
    
    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });
    
    console.log(`游戏服务器启动在端口 ${port}`);
  }
  
  handleConnection(ws) {
    const clientId = this.generateClientId();
    const client = {
      id: clientId,
      ws: ws,
      authenticated: false,
      room: null
    };
    
    this.clients.set(clientId, client);
    console.log(`客户端连接: ${clientId}`);
    
    ws.on('message', (data) => {
      this.handleMessage(client, Buffer.from(data));
    });
    
    ws.on('close', () => {
      this.handleDisconnection(client);
    });
    
    // 发送握手确认
    this.sendPackage(ws, Package.TYPE_HANDSHAKE_ACK);
  }
  
  handleMessage(client, buffer) {
    try {
      const pkg = Package.decode(buffer);
      
      switch (pkg.type) {
        case Package.TYPE_HEARTBEAT:
          this.sendPackage(client.ws, Package.TYPE_HEARTBEAT);
          break;
          
        case Package.TYPE_DATA:
          this.handleDataMessage(client, pkg.body);
          break;
      }
    } catch (error) {
      console.error('消息处理错误:', error);
    }
  }
  
  handleDataMessage(client, buffer) {
    const msg = Message.decode(buffer);
    const data = JSON.parse(Protocol.strdecode(msg.body));
    
    console.log(`收到消息 [${msg.route}]:`, data);
    
    switch (msg.route) {
      case 'user.login':
        this.handleLogin(client, msg, data);
        break;
        
      case 'room.join':
        this.handleJoinRoom(client, msg, data);
        break;
        
      case 'game.move':
        this.handlePlayerMove(client, msg, data);
        break;
        
      case 'chat.send':
        this.handleChatMessage(client, msg, data);
        break;
        
      default:
        this.sendError(client, msg.id, `未知路由: ${msg.route}`);
    }
  }
  
  handleLogin(client, msg, data) {
    // 简单的登录验证
    if (data.username && data.password) {
      client.authenticated = true;
      client.username = data.username;
      
      this.sendResponse(client.ws, msg.id, {
        success: true,
        userId: client.id,
        username: data.username,
        message: '登录成功'
      });
      
      console.log(`用户登录成功: ${data.username}`);
    } else {
      this.sendResponse(client.ws, msg.id, {
        success: false,
        message: '用户名或密码不能为空'
      });
    }
  }
  
  handleJoinRoom(client, msg, data) {
    if (!client.authenticated) {
      this.sendError(client, msg.id, '请先登录');
      return;
    }
    
    const roomId = data.roomId;
    let room = this.rooms.get(roomId);
    
    if (!room) {
      room = {
        id: roomId,
        clients: new Set(),
        gameState: { players: {} }
      };
      this.rooms.set(roomId, room);
    }
    
    // 离开当前房间
    if (client.room) {
      this.leaveRoom(client);
    }
    
    // 加入新房间
    room.clients.add(client.id);
    client.room = roomId;
    room.gameState.players[client.id] = {
      username: client.username,
      x: 0,
      y: 0
    };
    
    this.sendResponse(client.ws, msg.id, {
      success: true,
      roomId: roomId,
      players: room.gameState.players
    });
    
    // 通知房间内其他玩家
    this.broadcastToRoom(roomId, 'room.playerJoined', {
      playerId: client.id,
      username: client.username
    }, client.id);
    
    console.log(`玩家 ${client.username} 加入房间 ${roomId}`);
  }
  
  handlePlayerMove(client, msg, data) {
    if (!client.authenticated || !client.room) {
      this.sendError(client, msg.id, '请先加入房间');
      return;
    }
    
    const room = this.rooms.get(client.room);
    if (room && room.gameState.players[client.id]) {
      room.gameState.players[client.id].x = data.x;
      room.gameState.players[client.id].y = data.y;
      
      // 广播玩家移动
      this.broadcastToRoom(client.room, 'game.playerMoved', {
        playerId: client.id,
        x: data.x,
        y: data.y
      }, client.id);
      
      this.sendResponse(client.ws, msg.id, { success: true });
    }
  }
  
  handleChatMessage(client, msg, data) {
    if (!client.authenticated) {
      this.sendError(client, msg.id, '请先登录');
      return;
    }
    
    const chatData = {
      playerId: client.id,
      username: client.username,
      message: data.message,
      timestamp: Date.now()
    };
    
    if (client.room) {
      // 房间聊天
      this.broadcastToRoom(client.room, 'chat.message', chatData);
    } else {
      // 全局聊天
      this.broadcast('chat.message', chatData);
    }
    
    this.sendResponse(client.ws, msg.id, { success: true });
  }
  
  sendPackage(ws, type, body = null) {
    const pkg = Package.encode(type, body);
    ws.send(pkg);
  }
  
  sendResponse(ws, requestId, data) {
    const body = Protocol.strencode(JSON.stringify(data));
    const msg = Message.encode(requestId, Message.TYPE_RESPONSE, 0, null, body);
    this.sendPackage(ws, Package.TYPE_DATA, msg);
  }
  
  sendPush(ws, route, data) {
    const body = Protocol.strencode(JSON.stringify(data));
    const msg = Message.encode(0, Message.TYPE_PUSH, 0, route, body);
    this.sendPackage(ws, Package.TYPE_DATA, msg);
  }
  
  sendError(client, requestId, message) {
    this.sendResponse(client.ws, requestId, {
      success: false,
      error: message
    });
  }
  
  broadcastToRoom(roomId, route, data, excludeClientId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    for (const clientId of room.clients) {
      if (clientId !== excludeClientId) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
          this.sendPush(client.ws, route, data);
        }
      }
    }
  }
  
  broadcast(route, data, excludeClientId = null) {
    for (const [clientId, client] of this.clients) {
      if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
        this.sendPush(client.ws, route, data);
      }
    }
  }
  
  leaveRoom(client) {
    if (!client.room) return;
    
    const room = this.rooms.get(client.room);
    if (room) {
      room.clients.delete(client.id);
      delete room.gameState.players[client.id];
      
      // 通知其他玩家
      this.broadcastToRoom(client.room, 'room.playerLeft', {
        playerId: client.id,
        username: client.username
      });
      
      // 如果房间为空，删除房间
      if (room.clients.size === 0) {
        this.rooms.delete(client.room);
      }
    }
    
    client.room = null;
  }
  
  handleDisconnection(client) {
    console.log(`客户端断开连接: ${client.id}`);
    
    this.leaveRoom(client);
    this.clients.delete(client.id);
  }
  
  generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9);
  }
}

// 启动服务器
const server = new GameServer(3001);
```

### 客户端实现

```javascript
const Protocol = require('pofresh-protocol');
const WebSocket = require('ws');
const { Package, Message } = Protocol;

class GameClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.eventHandlers = new Map();
    this.connected = false;
    this.authenticated = false;
  }
  
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';
      
      this.ws.onopen = () => {
        console.log('连接已建立');
        this.connected = true;
        this.sendHandshake();
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(Buffer.from(event.data));
      };
      
      this.ws.onclose = () => {
        console.log('连接已关闭');
        this.connected = false;
        this.authenticated = false;
      };
      
      this.ws.onerror = (error) => {
        console.error('连接错误:', error);
        reject(error);
      };
    });
  }
  
  sendHandshake() {
    const handshake = Package.encode(Package.TYPE_HANDSHAKE);
    this.ws.send(handshake);
  }
  
  async request(route, data, timeout = 5000) {
    if (!this.connected) {
      throw new Error('未连接到服务器');
    }
    
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`请求超时: ${route}`));
      }, timeout);
      
      this.pendingRequests.set(id, { resolve, reject, timer });
      
      const body = Protocol.strencode(JSON.stringify(data));
      const message = Message.encode(id, Message.TYPE_REQUEST, 0, route, body);
      const package = Package.encode(Package.TYPE_DATA, message);
      
      this.ws.send(package);
    });
  }
  
  notify(route, data) {
    if (!this.connected) {
      console.warn('未连接到服务器，无法发送通知');
      return;
    }
    
    const body = Protocol.strencode(JSON.stringify(data));
    const message = Message.encode(0, Message.TYPE_NOTIFY, 0, route, body);
    const package = Package.encode(Package.TYPE_DATA, message);
    
    this.ws.send(package);
  }
  
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }
  
  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
  
  handleMessage(buffer) {
    try {
      const pkg = Package.decode(buffer);
      
      switch (pkg.type) {
        case Package.TYPE_HANDSHAKE_ACK:
          console.log('握手确认');
          this.emit('handshake');
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
  
  handleResponse(id, data) {
    const pending = this.pendingRequests.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRequests.delete(id);
      
      if (data.success) {
        pending.resolve(data);
      } else {
        pending.reject(new Error(data.error || data.message || '请求失败'));
      }
    }
  }
  
  handlePush(route, data) {
    console.log(`收到推送 [${route}]:`, data);
    this.emit(route, data);
  }
  
  async login(username, password) {
    try {
      const result = await this.request('user.login', { username, password });
      if (result.success) {
        this.authenticated = true;
        console.log('登录成功:', result);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }
  
  async joinRoom(roomId) {
    if (!this.authenticated) {
      throw new Error('请先登录');
    }
    
    try {
      const result = await this.request('room.join', { roomId });
      console.log('加入房间成功:', result);
      return result;
    } catch (error) {
      console.error('加入房间失败:', error);
      throw error;
    }
  }
  
  async movePlayer(x, y) {
    try {
      await this.request('game.move', { x, y });
    } catch (error) {
      console.error('移动失败:', error);
    }
  }
  
  async sendChatMessage(message) {
    try {
      await this.request('chat.send', { message });
    } catch (error) {
      console.error('发送聊天消息失败:', error);
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// 使用示例
async function main() {
  const client = new GameClient('ws://localhost:3001');
  
  // 监听事件
  client.on('handshake', () => {
    console.log('握手完成，可以开始登录');
  });
  
  client.on('room.playerJoined', (data) => {
    console.log(`玩家加入: ${data.username}`);
  });
  
  client.on('room.playerLeft', (data) => {
    console.log(`玩家离开: ${data.username}`);
  });
  
  client.on('game.playerMoved', (data) => {
    console.log(`玩家移动: ${data.playerId} -> (${data.x}, ${data.y})`);
  });
  
  client.on('chat.message', (data) => {
    console.log(`[聊天] ${data.username}: ${data.message}`);
  });
  
  try {
    // 连接服务器
    await client.connect();
    
    // 登录
    await client.login('玩家1', '123456');
    
    // 加入房间
    await client.joinRoom('room001');
    
    // 移动玩家
    await client.movePlayer(10, 20);
    
    // 发送聊天消息
    await client.sendChatMessage('大家好！');
    
    // 模拟游戏循环
    setInterval(async () => {
      const x = Math.floor(Math.random() * 100);
      const y = Math.floor(Math.random() * 100);
      await client.movePlayer(x, y);
    }, 2000);
    
  } catch (error) {
    console.error('客户端错误:', error);
  }
}

// 运行客户端
if (require.main === module) {
  main();
}

module.exports = GameClient;
```

## 实时聊天系统

### 聊天服务器

```javascript
const Protocol = require('pofresh-protocol');
const WebSocket = require('ws');
const { Package, Message } = Protocol;

class ChatServer {
  constructor(port = 3002) {
    this.wss = new WebSocket.Server({ port });
    this.clients = new Map();
    this.channels = new Map();
    this.messageHistory = new Map();
    
    // 创建默认频道
    this.createChannel('general', '综合讨论');
    this.createChannel('random', '随机聊天');
    this.createChannel('help', '帮助频道');
    
    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });
    
    console.log(`聊天服务器启动在端口 ${port}`);
  }
  
  createChannel(id, name, description = '') {
    this.channels.set(id, {
      id,
      name,
      description,
      clients: new Set(),
      created: Date.now()
    });
    this.messageHistory.set(id, []);
  }
  
  handleConnection(ws) {
    const clientId = this.generateClientId();
    const client = {
      id: clientId,
      ws: ws,
      username: null,
      channels: new Set(),
      lastActivity: Date.now()
    };
    
    this.clients.set(clientId, client);
    console.log(`客户端连接: ${clientId}`);
    
    ws.on('message', (data) => {
      this.handleMessage(client, Buffer.from(data));
    });
    
    ws.on('close', () => {
      this.handleDisconnection(client);
    });
    
    // 发送握手确认
    this.sendPackage(ws, Package.TYPE_HANDSHAKE_ACK);
  }
  
  handleMessage(client, buffer) {
    try {
      const pkg = Package.decode(buffer);
      client.lastActivity = Date.now();
      
      switch (pkg.type) {
        case Package.TYPE_HEARTBEAT:
          this.sendPackage(client.ws, Package.TYPE_HEARTBEAT);
          break;
          
        case Package.TYPE_DATA:
          this.handleDataMessage(client, pkg.body);
          break;
      }
    } catch (error) {
      console.error('消息处理错误:', error);
    }
  }
  
  handleDataMessage(client, buffer) {
    const msg = Message.decode(buffer);
    const data = JSON.parse(Protocol.strdecode(msg.body));
    
    console.log(`收到消息 [${msg.route}]:`, data);
    
    switch (msg.route) {
      case 'user.setUsername':
        this.handleSetUsername(client, msg, data);
        break;
        
      case 'channel.list':
        this.handleListChannels(client, msg, data);
        break;
        
      case 'channel.join':
        this.handleJoinChannel(client, msg, data);
        break;
        
      case 'channel.leave':
        this.handleLeaveChannel(client, msg, data);
        break;
        
      case 'message.send':
        this.handleSendMessage(client, msg, data);
        break;
        
      case 'message.history':
        this.handleGetHistory(client, msg, data);
        break;
        
      case 'user.list':
        this.handleListUsers(client, msg, data);
        break;
        
      default:
        this.sendError(client, msg.id, `未知路由: ${msg.route}`);
    }
  }
  
  handleSetUsername(client, msg, data) {
    const { username } = data;
    
    if (!username || username.trim().length === 0) {
      this.sendError(client, msg.id, '用户名不能为空');
      return;
    }
    
    if (username.length > 20) {
      this.sendError(client, msg.id, '用户名不能超过20个字符');
      return;
    }
    
    // 检查用户名是否已被使用
    for (const [id, c] of this.clients) {
      if (c.username === username && id !== client.id) {
        this.sendError(client, msg.id, '用户名已被使用');
        return;
      }
    }
    
    const oldUsername = client.username;
    client.username = username;
    
    this.sendResponse(client.ws, msg.id, {
      success: true,
      username: username
    });
    
    // 通知所有频道中的用户
    for (const channelId of client.channels) {
      this.broadcastToChannel(channelId, 'user.usernameChanged', {
        clientId: client.id,
        oldUsername: oldUsername,
        newUsername: username
      }, client.id);
    }
    
    console.log(`用户设置用户名: ${client.id} -> ${username}`);
  }
  
  handleListChannels(client, msg, data) {
    const channelList = Array.from(this.channels.values()).map(channel => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      userCount: channel.clients.size
    }));
    
    this.sendResponse(client.ws, msg.id, {
      success: true,
      channels: channelList
    });
  }
  
  handleJoinChannel(client, msg, data) {
    const { channelId } = data;
    
    if (!client.username) {
      this.sendError(client, msg.id, '请先设置用户名');
      return;
    }
    
    const channel = this.channels.get(channelId);
    if (!channel) {
      this.sendError(client, msg.id, '频道不存在');
      return;
    }
    
    if (client.channels.has(channelId)) {
      this.sendError(client, msg.id, '已在该频道中');
      return;
    }
    
    // 加入频道
    channel.clients.add(client.id);
    client.channels.add(channelId);
    
    this.sendResponse(client.ws, msg.id, {
      success: true,
      channelId: channelId,
      channelName: channel.name
    });
    
    // 通知频道内其他用户
    this.broadcastToChannel(channelId, 'channel.userJoined', {
      clientId: client.id,
      username: client.username,
      timestamp: Date.now()
    }, client.id);
    
    // 发送最近的消息历史
    const history = this.messageHistory.get(channelId) || [];
    const recentHistory = history.slice(-20); // 最近20条消息
    
    if (recentHistory.length > 0) {
      this.sendPush(client.ws, 'message.history', {
        channelId: channelId,
        messages: recentHistory
      });
    }
    
    console.log(`用户 ${client.username} 加入频道 ${channelId}`);
  }
  
  handleLeaveChannel(client, msg, data) {
    const { channelId } = data;
    
    if (!client.channels.has(channelId)) {
      this.sendError(client, msg.id, '不在该频道中');
      return;
    }
    
    this.leaveChannel(client, channelId);
    
    this.sendResponse(client.ws, msg.id, {
      success: true,
      channelId: channelId
    });
  }
  
  handleSendMessage(client, msg, data) {
    const { channelId, content } = data;
    
    if (!client.username) {
      this.sendError(client, msg.id, '请先设置用户名');
      return;
    }
    
    if (!client.channels.has(channelId)) {
      this.sendError(client, msg.id, '不在该频道中');
      return;
    }
    
    if (!content || content.trim().length === 0) {
      this.sendError(client, msg.id, '消息内容不能为空');
      return;
    }
    
    if (content.length > 500) {
      this.sendError(client, msg.id, '消息内容不能超过500个字符');
      return;
    }
    
    const message = {
      id: this.generateMessageId(),
      channelId: channelId,
      clientId: client.id,
      username: client.username,
      content: content.trim(),
      timestamp: Date.now()
    };
    
    // 保存到历史记录
    const history = this.messageHistory.get(channelId);
    history.push(message);
    
    // 保持历史记录在合理大小
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    // 广播消息
    this.broadcastToChannel(channelId, 'message.new', message);
    
    this.sendResponse(client.ws, msg.id, {
      success: true,
      messageId: message.id
    });
    
    console.log(`[${channelId}] ${client.username}: ${content}`);
  }
  
  handleGetHistory(client, msg, data) {
    const { channelId, limit = 50, before } = data;
    
    if (!client.channels.has(channelId)) {
      this.sendError(client, msg.id, '不在该频道中');
      return;
    }
    
    const history = this.messageHistory.get(channelId) || [];
    let messages = history;
    
    if (before) {
      const beforeIndex = history.findIndex(m => m.id === before);
      if (beforeIndex > 0) {
        messages = history.slice(0, beforeIndex);
      }
    }
    
    const result = messages.slice(-limit);
    
    this.sendResponse(client.ws, msg.id, {
      success: true,
      channelId: channelId,
      messages: result,
      hasMore: result.length === limit && messages.length > limit
    });
  }
  
  handleListUsers(client, msg, data) {
    const { channelId } = data;
    
    if (!client.channels.has(channelId)) {
      this.sendError(client, msg.id, '不在该频道中');
      return;
    }
    
    const channel = this.channels.get(channelId);
    const users = [];
    
    for (const clientId of channel.clients) {
      const c = this.clients.get(clientId);
      if (c && c.username) {
        users.push({
          id: c.id,
          username: c.username,
          lastActivity: c.lastActivity
        });
      }
    }
    
    this.sendResponse(client.ws, msg.id, {
      success: true,
      channelId: channelId,
      users: users
    });
  }
  
  leaveChannel(client, channelId) {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.clients.delete(client.id);
      client.channels.delete(channelId);
      
      // 通知频道内其他用户
      this.broadcastToChannel(channelId, 'channel.userLeft', {
        clientId: client.id,
        username: client.username,
        timestamp: Date.now()
      });
    }
  }
  
  handleDisconnection(client) {
    console.log(`客户端断开连接: ${client.id}`);
    
    // 离开所有频道
    for (const channelId of client.channels) {
      this.leaveChannel(client, channelId);
    }
    
    this.clients.delete(client.id);
  }
  
  broadcastToChannel(channelId, route, data, excludeClientId = null) {
    const channel = this.channels.get(channelId);
    if (!channel) return;
    
    for (const clientId of channel.clients) {
      if (clientId !== excludeClientId) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
          this.sendPush(client.ws, route, data);
        }
      }
    }
  }
  
  sendPackage(ws, type, body = null) {
    const pkg = Package.encode(type, body);
    ws.send(pkg);
  }
  
  sendResponse(ws, requestId, data) {
    const body = Protocol.strencode(JSON.stringify(data));
    const msg = Message.encode(requestId, Message.TYPE_RESPONSE, 0, null, body);
    this.sendPackage(ws, Package.TYPE_DATA, msg);
  }
  
  sendPush(ws, route, data) {
    const body = Protocol.strencode(JSON.stringify(data));
    const msg = Message.encode(0, Message.TYPE_PUSH, 0, route, body);
    this.sendPackage(ws, Package.TYPE_DATA, msg);
  }
  
  sendError(client, requestId, message) {
    this.sendResponse(client.ws, requestId, {
      success: false,
      error: message
    });
  }
  
  generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9);
  }
  
  generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }
}

// 启动聊天服务器
const chatServer = new ChatServer(3002);
```

### 聊天客户端

```javascript
const Protocol = require('pofresh-protocol');
const WebSocket = require('ws');
const readline = require('readline');
const { Package, Message } = Protocol;

class ChatClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.connected = false;
    this.username = null;
    this.currentChannel = null;
    
    // 创建命令行界面
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';
      
      this.ws.onopen = () => {
        console.log('\n=== 连接到聊天服务器成功 ===');
        this.connected = true;
        this.sendHandshake();
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(Buffer.from(event.data));
      };
      
      this.ws.onclose = () => {
        console.log('\n=== 连接已断开 ===');
        this.connected = false;
        process.exit(0);
      };
      
      this.ws.onerror = (error) => {
        console.error('连接错误:', error);
        reject(error);
      };
    });
  }
  
  sendHandshake() {
    const handshake = Package.encode(Package.TYPE_HANDSHAKE);
    this.ws.send(handshake);
  }
  
  async request(route, data, timeout = 5000) {
    if (!this.connected) {
      throw new Error('未连接到服务器');
    }
    
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`请求超时: ${route}`));
      }, timeout);
      
      this.pendingRequests.set(id, { resolve, reject, timer });
      
      const body = Protocol.strencode(JSON.stringify(data));
      const message = Message.encode(id, Message.TYPE_REQUEST, 0, route, body);
      const package = Package.encode(Package.TYPE_DATA, message);
      
      this.ws.send(package);
    });
  }
  
  handleMessage(buffer) {
    try {
      const pkg = Package.decode(buffer);
      
      switch (pkg.type) {
        case Package.TYPE_HANDSHAKE_ACK:
          console.log('握手完成');
          this.startInteraction();
          break;
          
        case Package.TYPE_HEARTBEAT:
          this.ws.send(Package.encode(Package.TYPE_HEARTBEAT));
          break;
          
        case Package.TYPE_DATA:
          this.handleDataMessage(pkg.body);
          break;
      }
    } catch (error) {
      console.error('消息处理错误:', error);
    }
  }
  
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
  
  handleResponse(id, data) {
    const pending = this.pendingRequests.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRequests.delete(id);
      
      if (data.success) {
        pending.resolve(data);
      } else {
        pending.reject(new Error(data.error || '请求失败'));
      }
    }
  }
  
  handlePush(route, data) {
    switch (route) {
      case 'message.new':
        this.displayMessage(data);
        break;
        
      case 'message.history':
        this.displayHistory(data);
        break;
        
      case 'channel.userJoined':
        console.log(`\n[系统] ${data.username} 加入了频道`);
        this.showPrompt();
        break;
        
      case 'channel.userLeft':
        console.log(`\n[系统] ${data.username} 离开了频道`);
        this.showPrompt();
        break;
        
      case 'user.usernameChanged':
        if (data.oldUsername) {
          console.log(`\n[系统] ${data.oldUsername} 更名为 ${data.newUsername}`);
        }
        this.showPrompt();
        break;
    }
  }
  
  displayMessage(message) {
    const time = new Date(message.timestamp).toLocaleTimeString();
    console.log(`\n[${time}] ${message.username}: ${message.content}`);
    this.showPrompt();
  }
  
  displayHistory(data) {
    console.log(`\n=== ${data.channelId} 频道历史消息 ===`);
    data.messages.forEach(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      console.log(`[${time}] ${msg.username}: ${msg.content}`);
    });
    console.log('=== 历史消息结束 ===\n');
    this.showPrompt();
  }
  
  async startInteraction() {
    console.log('\n欢迎使用聊天系统！');
    console.log('可用命令:');
    console.log('  /username <用户名>  - 设置用户名');
    console.log('  /channels           - 列出所有频道');
    console.log('  /join <频道ID>      - 加入频道');
    console.log('  /leave <频道ID>     - 离开频道');
    console.log('  /users              - 列出当前频道用户');
    console.log('  /history [数量]     - 查看历史消息');
    console.log('  /help               - 显示帮助');
    console.log('  /quit               - 退出');
    console.log('  直接输入消息发送到当前频道\n');
    
    this.showPrompt();
    this.rl.on('line', (input) => {
      this.handleInput(input.trim());
    });
  }
  
  async handleInput(input) {
    if (!input) {
      this.showPrompt();
      return;
    }
    
    if (input.startsWith('/')) {
      await this.handleCommand(input);
    } else {
      await this.sendMessage(input);
    }
  }
  
  async handleCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    try {
      switch (cmd) {
        case '/username':
          if (args.length === 0) {
            console.log('用法: /username <用户名>');
          } else {
            await this.setUsername(args[0]);
          }
          break;
          
        case '/channels':
          await this.listChannels();
          break;
          
        case '/join':
          if (args.length === 0) {
            console.log('用法: /join <频道ID>');
          } else {
            await this.joinChannel(args[0]);
          }
          break;
          
        case '/leave':
          if (args.length === 0) {
            console.log('用法: /leave <频道ID>');
          } else {
            await this.leaveChannel(args[0]);
          }
          break;
          
        case '/users':
          await this.listUsers();
          break;
          
        case '/history':
          const limit = args.length > 0 ? parseInt(args[0]) : 20;
          await this.getHistory(limit);
          break;
          
        case '/help':
          this.showHelp();
          break;
          
        case '/quit':
          console.log('再见！');
          process.exit(0);
          break;
          
        default:
          console.log(`未知命令: ${cmd}`);
          console.log('输入 /help 查看可用命令');
      }
    } catch (error) {
      console.log(`命令执行失败: ${error.message}`);
    }
    
    this.showPrompt();
  }
  
  async setUsername(username) {
    const result = await this.request('user.setUsername', { username });
    this.username = username;
    console.log(`用户名设置为: ${username}`);
  }
  
  async listChannels() {
    const result = await this.request('channel.list', {});
    console.log('\n=== 可用频道 ===');
    result.channels.forEach(channel => {
      console.log(`${channel.id}: ${channel.name} (${channel.userCount} 用户)`);
      if (channel.description) {
        console.log(`  ${channel.description}`);
      }
    });
    console.log('================\n');
  }
  
  async joinChannel(channelId) {
    const result = await this.request('channel.join', { channelId });
    this.currentChannel = channelId;
    console.log(`已加入频道: ${result.channelName}`);
  }
  
  async leaveChannel(channelId) {
    await this.request('channel.leave', { channelId });
    if (this.currentChannel === channelId) {
      this.currentChannel = null;
    }
    console.log(`已离开频道: ${channelId}`);
  }
  
  async listUsers() {
    if (!this.currentChannel) {
      console.log('请先加入一个频道');
      return;
    }
    
    const result = await this.request('user.list', { channelId: this.currentChannel });
    console.log(`\n=== ${this.currentChannel} 频道用户 ===`);
    result.users.forEach(user => {
      const lastSeen = new Date(user.lastActivity).toLocaleTimeString();
      console.log(`${user.username} (最后活动: ${lastSeen})`);
    });
    console.log('========================\n');
  }
  
  async getHistory(limit = 20) {
    if (!this.currentChannel) {
      console.log('请先加入一个频道');
      return;
    }
    
    await this.request('message.history', {
      channelId: this.currentChannel,
      limit: limit
    });
  }
  
  async sendMessage(content) {
    if (!this.username) {
      console.log('请先设置用户名: /username <用户名>');
      this.showPrompt();
      return;
    }
    
    if (!this.currentChannel) {
      console.log('请先加入一个频道: /join <频道ID>');
      this.showPrompt();
      return;
    }
    
    try {
      await this.request('message.send', {
        channelId: this.currentChannel,
        content: content
      });
    } catch (error) {
      console.log(`发送消息失败: ${error.message}`);
    }
    
    this.showPrompt();
  }
  
  showHelp() {
    console.log('\n=== 聊天系统帮助 ===');
    console.log('/username <用户名>  - 设置或更改用户名');
    console.log('/channels           - 查看所有可用频道');
    console.log('/join <频道ID>      - 加入指定频道');
    console.log('/leave <频道ID>     - 离开指定频道');
    console.log('/users              - 查看当前频道的用户列表');
    console.log('/history [数量]     - 查看历史消息（默认20条）');
    console.log('/help               - 显示此帮助信息');
    console.log('/quit               - 退出聊天系统');
    console.log('\n直接输入文本即可发送消息到当前频道');
    console.log('==================\n');
  }
  
  showPrompt() {
    const channel = this.currentChannel ? `[${this.currentChannel}]` : '[无频道]';
    const user = this.username ? this.username : '未设置';
    process.stdout.write(`${channel} ${user}> `);
  }
}

// 启动聊天客户端
async function main() {
  const client = new ChatClient('ws://localhost:3002');
  
  try {
    await client.connect();
  } catch (error) {
    console.error('连接失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ChatClient;
```

## 路由压缩

路由压缩可以显著减少网络传输的数据量，特别适用于移动设备和带宽受限的环境。

### 路由字典管理

```javascript
const Protocol = require('pofresh-protocol');
const { Message } = Protocol;

class RouteCompressor {
  constructor() {
    this.routeToCode = new Map();
    this.codeToRoute = new Map();
    this.nextCode = 1;
  }
  
  // 注册路由
  register(route) {
    if (!this.routeToCode.has(route)) {
      const code = this.nextCode++;
      this.routeToCode.set(route, code);
      this.codeToRoute.set(code, route);
      console.log(`注册路由: ${route} -> ${code}`);
      return code;
    }
    return this.routeToCode.get(route);
  }
  
  // 批量注册路由
  registerBatch(routes) {
    const mapping = {};
    routes.forEach(route => {
      mapping[route] = this.register(route);
    });
    return mapping;
  }
  
  // 获取路由代码
  getCode(route) {
    return this.routeToCode.get(route);
  }
  
  // 获取路由字符串
  getRoute(code) {
    return this.codeToRoute.get(code);
  }
  
  // 编码消息（自动选择压缩）
  encodeMessage(id, type, route, body) {
    const code = this.getCode(route);
    if (code !== undefined) {
      // 使用压缩路由
      return Message.encode(id, type, 1, code, body);
    } else {
      // 使用原始路由
      return Message.encode(id, type, 0, route, body);
    }
  }
  
  // 解码消息
  decodeMessage(buffer) {
    const msg = Message.decode(buffer);
    
    if (msg.compressRoute === 1) {
      // 解压缩路由
      const route = this.getRoute(msg.route);
      if (route) {
        msg.route = route;
      } else {
        throw new Error(`未知路由代码: ${msg.route}`);
      }
    }
    
    return msg;
  }
  
  // 导出路由映射
  exportMapping() {
    const mapping = {};
    for (const [route, code] of this.routeToCode) {
      mapping[route] = code;
    }
    return mapping;
  }
  
  // 导入路由映射
  importMapping(mapping) {
    this.routeToCode.clear();
    this.codeToRoute.clear();
    
    let maxCode = 0;
    for (const [route, code] of Object.entries(mapping)) {
      this.routeToCode.set(route, code);
      this.codeToRoute.set(code, route);
      maxCode = Math.max(maxCode, code);
    }
    
    this.nextCode = maxCode + 1;
  }
  
  // 计算压缩效果
  calculateSavings(route) {
    const originalSize = Buffer.byteLength(route, 'utf8') + 1; // +1 for length byte
    const compressedSize = 2; // 2 bytes for route code
    const savings = originalSize - compressedSize;
    const percentage = (savings / originalSize * 100).toFixed(1);
    
    return {
      originalSize,
      compressedSize,
      savings,
      percentage: parseFloat(percentage)
    };
  }
}

// 使用示例
const compressor = new RouteCompressor();

// 注册常用路由
const gameRoutes = [
  'user.login',
  'user.logout',
  'user.info',
  'room.join',
  'room.leave',
  'room.list',
  'game.start',
  'game.move',
  'game.attack',
  'game.end',
  'chat.send',
  'chat.broadcast',
  'inventory.get',
  'inventory.use',
  'shop.buy',
  'shop.sell'
];

const mapping = compressor.registerBatch(gameRoutes);
console.log('路由映射:', mapping);

// 编码消息示例
const body = Buffer.from(JSON.stringify({ username: 'player1', password: '123456' }));

// 使用压缩路由
const compressedMsg = compressor.encodeMessage(1, Message.TYPE_REQUEST, 'user.login', body);
console.log('压缩消息大小:', compressedMsg.length);

// 使用原始路由
const originalMsg = Message.encode(1, Message.TYPE_REQUEST, 0, 'user.login', body);
console.log('原始消息大小:', originalMsg.length);

// 计算节省的字节数
const savings = compressor.calculateSavings('user.login');
console.log('压缩效果:', savings);

// 解码消息
const decoded = compressor.decodeMessage(compressedMsg);
console.log('解码后的路由:', decoded.route);

module.exports = RouteCompressor;
```

### 客户端-服务器路由同步

```javascript
const Protocol = require('pofresh-protocol');
const RouteCompressor = require('./route-compressor');
const { Package, Message } = Protocol;

class RouteManager {
  constructor(isServer = false) {
    this.isServer = isServer;
    this.compressor = new RouteCompressor();
    this.synced = false;
  }
  
  // 服务器端：发送路由字典
  sendRouteDictionary(ws) {
    const mapping = this.compressor.exportMapping();
    const body = Protocol.strencode(JSON.stringify({
      routes: mapping,
      version: Date.now()
    }));
    
    const msg = Message.encode(0, Message.TYPE_PUSH, 0, 'system.routeDict', body);
    const pkg = Package.encode(Package.TYPE_DATA, msg);
    
    ws.send(pkg);
    console.log('发送路由字典，包含', Object.keys(mapping).length, '个路由');
  }
  
  // 客户端：接收路由字典
  receiveRouteDictionary(data) {
    this.compressor.importMapping(data.routes);
    this.synced = true;
    console.log('接收路由字典，包含', Object.keys(data.routes).length, '个路由');
  }
  
  // 编码消息
  encodeMessage(id, type, route, body) {
    if (this.synced) {
      return this.compressor.encodeMessage(id, type, route, body);
    } else {
      // 未同步时使用原始路由
      return Message.encode(id, type, 0, route, body);
    }
  }
  
  // 解码消息
  decodeMessage(buffer) {
    if (this.synced) {
      return this.compressor.decodeMessage(buffer);
    } else {
      return Message.decode(buffer);
    }
  }
}

// 服务器使用示例
class GameServerWithCompression {
  constructor() {
    this.routeManager = new RouteManager(true);
    
    // 注册游戏路由
    const routes = [
      'user.login', 'user.logout', 'room.join', 'room.leave',
      'game.move', 'game.attack', 'chat.send', 'inventory.use'
    ];
    
    this.routeManager.compressor.registerBatch(routes);
  }
  
  handleConnection(ws) {
    // 发送路由字典
    this.routeManager.sendRouteDictionary(ws);
    
    ws.on('message', (data) => {
      const pkg = Package.decode(Buffer.from(data));
      if (pkg.type === Package.TYPE_DATA) {
        const msg = this.routeManager.decodeMessage(pkg.body);
        console.log('收到消息:', msg.route, msg.body.toString());
      }
    });
  }
}

// 客户端使用示例
class GameClientWithCompression {
  constructor() {
    this.routeManager = new RouteManager(false);
  }
  
  handleMessage(buffer) {
    const pkg = Package.decode(buffer);
    if (pkg.type === Package.TYPE_DATA) {
      const msg = Message.decode(pkg.body);
      
      if (msg.route === 'system.routeDict') {
        const data = JSON.parse(Protocol.strdecode(msg.body));
        this.routeManager.receiveRouteDictionary(data);
      } else {
        const decodedMsg = this.routeManager.decodeMessage(pkg.body);
        console.log('收到消息:', decodedMsg.route);
      }
    }
  }
  
  sendRequest(route, data) {
    const body = Protocol.strencode(JSON.stringify(data));
    const msg = this.routeManager.encodeMessage(1, Message.TYPE_REQUEST, route, body);
    const pkg = Package.encode(Package.TYPE_DATA, msg);
    this.ws.send(pkg);
  }
}

module.exports = RouteManager;
```

## 错误处理

### 健壮的错误处理示例

```javascript
const Protocol = require('pofresh-protocol');
const { Package, Message } = Protocol;

class ProtocolHandler {
  constructor() {
    this.errorHandlers = new Map();
    this.setupDefaultErrorHandlers();
  }
  
  setupDefaultErrorHandlers() {
    // 包解码错误
    this.errorHandlers.set('PACKAGE_DECODE_ERROR', (error, buffer) => {
      console.error('包解码失败:', error.message);
      console.error('缓冲区长度:', buffer ? buffer.length : 'null');
      console.error('缓冲区内容:', buffer ? buffer.toString('hex') : 'null');
    });
    
    // 消息解码错误
    this.errorHandlers.set('MESSAGE_DECODE_ERROR', (error, buffer) => {
      console.error('消息解码失败:', error.message);
      console.error('缓冲区长度:', buffer ? buffer.length : 'null');
    });
    
    // 字符串解码错误
    this.errorHandlers.set('STRING_DECODE_ERROR', (error, buffer) => {
      console.error('字符串解码失败:', error.message);
      console.error('可能的编码问题或数据损坏');
    });
    
    // 编码错误
    this.errorHandlers.set('ENCODE_ERROR', (error, data) => {
      console.error('编码失败:', error.message);
      console.error('数据类型:', typeof data);
    });
  }
  
  // 安全的包解码
  safePackageDecode(buffer) {
    try {
      if (!Buffer.isBuffer(buffer)) {
        throw new Error('输入不是有效的 Buffer');
      }
      
      if (buffer.length < 4) {
        throw new Error('缓冲区太短，无法包含有效的包头');
      }
      
      return Package.decode(buffer);
    } catch (error) {
      this.handleError('PACKAGE_DECODE_ERROR', error, buffer);
      return null;
    }
  }
  
  // 安全的消息解码
  safeMessageDecode(buffer) {
    try {
      if (!Buffer.isBuffer(buffer)) {
        throw new Error('输入不是有效的 Buffer');
      }
      
      if (buffer.length === 0) {
        throw new Error('空的消息缓冲区');
      }
      
      return Message.decode(buffer);
    } catch (error) {
      this.handleError('MESSAGE_DECODE_ERROR', error, buffer);
      return null;
    }
  }
  
  // 安全的字符串解码
  safeStringDecode(buffer) {
    try {
      if (!Buffer.isBuffer(buffer)) {
        throw new Error('输入不是有效的 Buffer');
      }
      
      if (buffer.length < 2) {
        throw new Error('缓冲区太短，无法包含字符串长度');
      }
      
      return Protocol.strdecode(buffer);
    } catch (error) {
      this.handleError('STRING_DECODE_ERROR', error, buffer);
      return null;
    }
  }
  
  // 安全的包编码
  safePackageEncode(type, body = null) {
    try {
      if (typeof type !== 'number' || type < 1 || type > 5) {
        throw new Error(`无效的包类型: ${type}`);
      }
      
      if (body !== null && !Buffer.isBuffer(body)) {
        throw new Error('包体必须是 Buffer 或 null');
      }
      
      return Package.encode(type, body);
    } catch (error) {
      this.handleError('ENCODE_ERROR', error, { type, body });
      return null;
    }
  }
  
  // 安全的消息编码
  safeMessageEncode(id, type, compressRoute, route, body) {
    try {
      // 验证参数
      if (typeof id !== 'number' || id < 0 || id > 0xFFFFFFFF) {
        throw new Error(`无效的消息 ID: ${id}`);
      }
      
      if (typeof type !== 'number' || type < 0 || type > 3) {
        throw new Error(`无效的消息类型: ${type}`);
      }
      
      if (typeof compressRoute !== 'number' || (compressRoute !== 0 && compressRoute !== 1)) {
        throw new Error(`无效的压缩标志: ${compressRoute}`);
      }
      
      if (compressRoute === 0 && typeof route !== 'string') {
        throw new Error('未压缩路由必须是字符串');
      }
      
      if (compressRoute === 1 && typeof route !== 'number') {
        throw new Error('压缩路由必须是数字');
      }
      
      if (!Buffer.isBuffer(body)) {
        throw new Error('消息体必须是 Buffer');
      }
      
      return Message.encode(id, type, compressRoute, route, body);
    } catch (error) {
      this.handleError('ENCODE_ERROR', error, { id, type, compressRoute, route, body });
      return null;
    }
  }
  
  // 安全的字符串编码
  safeStringEncode(str) {
    try {
      if (typeof str !== 'string') {
        throw new Error(`输入必须是字符串，得到: ${typeof str}`);
      }
      
      if (str.length > 65535) {
        throw new Error(`字符串太长: ${str.length} 字符（最大 65535）`);
      }
      
      return Protocol.strencode(str);
    } catch (error) {
      this.handleError('ENCODE_ERROR', error, str);
      return null;
    }
  }
  
  // 处理错误
  handleError(type, error, data) {
    const handler = this.errorHandlers.get(type);
    if (handler) {
      handler(error, data);
    } else {
      console.error(`未处理的错误类型 ${type}:`, error.message);
    }
  }
  
  // 注册自定义错误处理器
  onError(type, handler) {
    this.errorHandlers.set(type, handler);
  }
  
  // 验证缓冲区完整性
  validateBuffer(buffer, expectedMinLength = 0) {
    if (!Buffer.isBuffer(buffer)) {
      return { valid: false, error: '不是有效的 Buffer' };
    }
    
    if (buffer.length < expectedMinLength) {
      return { 
        valid: false, 
        error: `缓冲区太短: ${buffer.length} < ${expectedMinLength}` 
      };
    }
    
    return { valid: true };
  }
  
  // 处理网络消息的完整流程
  processNetworkMessage(rawData) {
    const result = {
      success: false,
      package: null,
      message: null,
      data: null,
      error: null
    };
    
    try {
      // 转换为 Buffer
      const buffer = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData);
      
      // 解码包
      const pkg = this.safePackageDecode(buffer);
      if (!pkg) {
        result.error = '包解码失败';
        return result;
      }
      result.package = pkg;
      
      // 处理数据包
      if (pkg.type === Package.TYPE_DATA && pkg.body) {
        const msg = this.safeMessageDecode(pkg.body);
        if (!msg) {
          result.error = '消息解码失败';
          return result;
        }
        result.message = msg;
        
        // 解码消息体
        if (msg.body && msg.body.length > 0) {
          const dataStr = this.safeStringDecode(msg.body);
          if (dataStr !== null) {
            try {
              result.data = JSON.parse(dataStr);
            } catch (jsonError) {
              console.warn('JSON 解析失败，返回原始字符串:', jsonError.message);
              result.data = dataStr;
            }
          }
        }
      }
      
      result.success = true;
    } catch (error) {
      result.error = error.message;
      console.error('处理网络消息时发生未预期的错误:', error);
    }
    
    return result;
  }
}

// 使用示例
const handler = new ProtocolHandler();

// 注册自定义错误处理器
handler.onError('PACKAGE_DECODE_ERROR', (error, buffer) => {
  console.log('自定义包错误处理:', error.message);
  // 可以发送错误报告到监控系统
});

// 处理网络消息
const rawMessage = Buffer.from([/* 一些字节数据 */]);
const result = handler.processNetworkMessage(rawMessage);

if (result.success) {
  console.log('消息处理成功:');
  console.log('包类型:', result.package.type);
  if (result.message) {
    console.log('消息路由:', result.message.route);
    console.log('消息数据:', result.data);
  }
} else {
  console.log('消息处理失败:', result.error);
}

module.exports = ProtocolHandler;
```

## 性能优化

### 缓冲区池和对象重用

```javascript
const Protocol = require('pofresh-protocol');
const { Package, Message } = Protocol;

class PerformanceOptimizer {
  constructor() {
    // 缓冲区池
    this.bufferPool = {
      small: [], // < 1KB
      medium: [], // 1KB - 10KB
      large: []  // > 10KB
    };
    
    // 对象池
    this.messagePool = [];
    this.packagePool = [];
    
    // 统计信息
    this.stats = {
      buffersAllocated: 0,
      buffersReused: 0,
      objectsAllocated: 0,
      objectsReused: 0
    };
  }
  
  // 获取缓冲区
  getBuffer(size) {
    let pool;
    if (size < 1024) {
      pool = this.bufferPool.small;
    } else if (size < 10240) {
      pool = this.bufferPool.medium;
    } else {
      pool = this.bufferPool.large;
    }
    
    // 尝试从池中获取
    for (let i = 0; i < pool.length; i++) {
      if (pool[i].length >= size) {
        const buffer = pool.splice(i, 1)[0];
        this.stats.buffersReused++;
        return buffer.slice(0, size);
      }
    }
    
    // 创建新缓冲区
    this.stats.buffersAllocated++;
    return Buffer.allocUnsafe(size);
  }
  
  // 回收缓冲区
  recycleBuffer(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return;
    }
    
    let pool;
    if (buffer.length < 1024) {
      pool = this.bufferPool.small;
    } else if (buffer.length < 10240) {
      pool = this.bufferPool.medium;
    } else {
      pool = this.bufferPool.large;
    }
    
    // 限制池大小
    if (pool.length < 10) {
      pool.push(buffer);
    }
  }
  
  // 批量编码消息
  batchEncodeMessages(messages) {
    const results = [];
    const totalSize = messages.reduce((sum, msg) => {
      return sum + this.estimateMessageSize(msg);
    }, 0);
    
    const batchBuffer = this.getBuffer(totalSize);
    let offset = 0;
    
    for (const msgData of messages) {
      try {
        const body = Protocol.strencode(JSON.stringify(msgData.data));
        const msg = Message.encode(
          msgData.id,
          msgData.type,
          msgData.compressRoute || 0,
          msgData.route,
          body
        );
        
        const pkg = Package.encode(Package.TYPE_DATA, msg);
        pkg.copy(batchBuffer, offset);
        
        results.push({
          success: true,
          buffer: batchBuffer.slice(offset, offset + pkg.length),
          size: pkg.length
        });
        
        offset += pkg.length;
      } catch (error) {
        results.push({
          success: false,
          error: error.message
        });
      }
    }
    
    this.recycleBuffer(batchBuffer);
    return results;
  }
  
  // 估算消息大小
  estimateMessageSize(msgData) {
    const routeSize = typeof msgData.route === 'string' 
      ? Buffer.byteLength(msgData.route, 'utf8') + 1
      : 2;
    const dataSize = Buffer.byteLength(JSON.stringify(msgData.data), 'utf8') + 2;
    return 4 + 7 + routeSize + dataSize; // 包头 + 消息头 + 路由 + 数据
  }
  
  // 预热缓冲区池
  warmupBufferPool() {
    console.log('预热缓冲区池...');
    
    // 预分配小缓冲区
    for (let i = 0; i < 5; i++) {
      this.bufferPool.small.push(Buffer.allocUnsafe(512));
    }
    
    // 预分配中等缓冲区
    for (let i = 0; i < 3; i++) {
      this.bufferPool.medium.push(Buffer.allocUnsafe(4096));
    }
    
    // 预分配大缓冲区
    for (let i = 0; i < 2; i++) {
      this.bufferPool.large.push(Buffer.allocUnsafe(16384));
    }
    
    console.log('缓冲区池预热完成');
  }
  
  // 获取性能统计
  getStats() {
    return {
      ...this.stats,
      bufferPoolSizes: {
        small: this.bufferPool.small.length,
        medium: this.bufferPool.medium.length,
        large: this.bufferPool.large.length
      },
      reuseRate: {
        buffers: (this.stats.buffersReused / (this.stats.buffersAllocated + this.stats.buffersReused) * 100).toFixed(2) + '%',
        objects: (this.stats.objectsReused / (this.stats.objectsAllocated + this.stats.objectsReused) * 100).toFixed(2) + '%'
      }
    };
  }
  
  // 清理资源
  cleanup() {
    this.bufferPool.small.length = 0;
    this.bufferPool.medium.length = 0;
    this.bufferPool.large.length = 0;
    this.messagePool.length = 0;
    this.packagePool.length = 0;
  }
}

// 使用示例
const optimizer = new PerformanceOptimizer();
optimizer.warmupBufferPool();

// 批量处理消息
const messages = [
  { id: 1, type: 0, route: 'user.login', data: { username: 'player1' } },
  { id: 2, type: 0, route: 'room.join', data: { roomId: 'room001' } },
  { id: 3, type: 1, route: 'chat.send', data: { message: '你好！' } }
];

const results = optimizer.batchEncodeMessages(messages);
console.log('批量编码结果:', results.length);
console.log('性能统计:', optimizer.getStats());

module.exports = PerformanceOptimizer;
```

### 连接池和消息队列

```javascript
const Protocol = require('pofresh-protocol');
const WebSocket = require('ws');
const EventEmitter = require('events');
const { Package, Message } = Protocol;

class ConnectionPool extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxConnections: options.maxConnections || 10,
      reconnectDelay: options.reconnectDelay || 1000,
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      heartbeatInterval: options.heartbeatInterval || 30000,
      messageQueueSize: options.messageQueueSize || 1000,
      ...options
    };
    
    this.connections = new Map();
    this.messageQueue = [];
    this.processing = false;
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      reconnections: 0
    };
    
    this.startMessageProcessor();
  }
  
  // 创建连接
  async createConnection(id, url) {
    if (this.connections.has(id)) {
      throw new Error(`连接 ${id} 已存在`);
    }
    
    if (this.connections.size >= this.options.maxConnections) {
      throw new Error('连接池已满');
    }
    
    const connection = {
      id,
      url,
      ws: null,
      connected: false,
      reconnectAttempts: 0,
      lastHeartbeat: 0,
      messageQueue: [],
      stats: {
        messagesSent: 0,
        messagesReceived: 0,
        bytesTransferred: 0
      }
    };
    
    this.connections.set(id, connection);
    await this.connect(connection);
    
    return connection;
  }
  
  // 建立连接
  async connect(connection) {
    return new Promise((resolve, reject) => {
      try {
        connection.ws = new WebSocket(connection.url);
        connection.ws.binaryType = 'arraybuffer';
        
        const timeout = setTimeout(() => {
          connection.ws.terminate();
          reject(new Error('连接超时'));
        }, 10000);
        
        connection.ws.onopen = () => {
          clearTimeout(timeout);
          connection.connected = true;
          connection.reconnectAttempts = 0;
          connection.lastHeartbeat = Date.now();
          
          this.stats.totalConnections++;
          this.stats.activeConnections++;
          
          this.emit('connected', connection.id);
          console.log(`连接 ${connection.id} 已建立`);
          
          // 发送握手
          this.sendHandshake(connection);
          
          // 处理排队的消息
          this.processConnectionQueue(connection);
          
          resolve(connection);
        };
        
        connection.ws.onmessage = (event) => {
          this.handleMessage(connection, Buffer.from(event.data));
        };
        
        connection.ws.onclose = () => {
          clearTimeout(timeout);
          this.handleDisconnection(connection);
        };
        
        connection.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error(`连接 ${connection.id} 错误:`, error);
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // 处理断开连接
  handleDisconnection(connection) {
    if (connection.connected) {
      connection.connected = false;
      this.stats.activeConnections--;
      
      this.emit('disconnected', connection.id);
      console.log(`连接 ${connection.id} 已断开`);
      
      // 尝试重连
      if (connection.reconnectAttempts < this.options.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnect(connection);
        }, this.options.reconnectDelay);
      } else {
        console.log(`连接 ${connection.id} 重连次数已达上限`);
        this.emit('reconnectFailed', connection.id);
      }
    }
  }
  
  // 重新连接
  async reconnect(connection) {
    connection.reconnectAttempts++;
    this.stats.reconnections++;
    
    console.log(`尝试重连 ${connection.id} (${connection.reconnectAttempts}/${this.options.maxReconnectAttempts})`);
    
    try {
      await this.connect(connection);
    } catch (error) {
      console.error(`重连 ${connection.id} 失败:`, error.message);
    }
  }
  
  // 发送握手
  sendHandshake(connection) {
    const handshake = Package.encode(Package.TYPE_HANDSHAKE);
    this.sendRaw(connection, handshake);
  }
  
  // 处理消息
  handleMessage(connection, buffer) {
    try {
      const pkg = Package.decode(buffer);
      connection.stats.messagesReceived++;
      connection.stats.bytesTransferred += buffer.length;
      this.stats.messagesReceived++;
      
      switch (pkg.type) {
        case Package.TYPE_HANDSHAKE_ACK:
          console.log(`连接 ${connection.id} 握手完成`);
          this.emit('handshake', connection.id);
          break;
          
        case Package.TYPE_HEARTBEAT:
          connection.lastHeartbeat = Date.now();
          // 回复心跳
          this.sendRaw(connection, Package.encode(Package.TYPE_HEARTBEAT));
          break;
          
        case Package.TYPE_DATA:
          this.handleDataMessage(connection, pkg.body);
          break;
          
        case Package.TYPE_KICK:
          console.log(`连接 ${connection.id} 被服务器踢出`);
          connection.ws.close();
          break;
      }
    } catch (error) {
      console.error(`处理消息失败 (${connection.id}):`, error);
    }
  }
  
  // 处理数据消息
  handleDataMessage(connection, buffer) {
    try {
      const msg = Message.decode(buffer);
      const data = JSON.parse(Protocol.strdecode(msg.body));
      
      this.emit('message', {
        connectionId: connection.id,
        message: msg,
        data: data
      });
    } catch (error) {
      console.error(`解析数据消息失败 (${connection.id}):`, error);
    }
  }
  
  // 发送消息
  sendMessage(connectionId, route, data, options = {}) {
    const message = {
      connectionId,
      route,
      data,
      type: options.type || Message.TYPE_REQUEST,
      id: options.id || Date.now(),
      priority: options.priority || 0,
      timestamp: Date.now()
    };
    
    // 添加到队列
    if (this.messageQueue.length >= this.options.messageQueueSize) {
      console.warn('消息队列已满，丢弃最旧的消息');
      this.messageQueue.shift();
    }
    
    this.messageQueue.push(message);
    
    // 按优先级排序
    this.messageQueue.sort((a, b) => b.priority - a.priority);
  }
  
  // 启动消息处理器
  startMessageProcessor() {
    setInterval(() => {
      this.processMessageQueue();
    }, 10); // 每10ms处理一次队列
    
    // 心跳检查
    setInterval(() => {
      this.checkHeartbeats();
    }, this.options.heartbeatInterval);
  }
  
  // 处理消息队列
  processMessageQueue() {
    if (this.processing || this.messageQueue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    const batchSize = Math.min(10, this.messageQueue.length);
    const batch = this.messageQueue.splice(0, batchSize);
    
    for (const message of batch) {
      try {
        this.sendMessageNow(message);
      } catch (error) {
        console.error('发送消息失败:', error);
      }
    }
    
    this.processing = false;
  }
  
  // 立即发送消息
  sendMessageNow(message) {
    const connection = this.connections.get(message.connectionId);
    if (!connection || !connection.connected) {
      console.warn(`连接 ${message.connectionId} 不可用，消息已丢弃`);
      return;
    }
    
    try {
      const body = Protocol.strencode(JSON.stringify(message.data));
      const msg = Message.encode(
        message.id,
        message.type,
        0,
        message.route,
        body
      );
      const pkg = Package.encode(Package.TYPE_DATA, msg);
      
      this.sendRaw(connection, pkg);
      
      connection.stats.messagesSent++;
      this.stats.messagesSent++;
    } catch (error) {
      console.error('编码消息失败:', error);
    }
  }
  
  // 发送原始数据
  sendRaw(connection, buffer) {
    if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(buffer);
      connection.stats.bytesTransferred += buffer.length;
    }
  }
  
  // 处理连接队列
  processConnectionQueue(connection) {
    const queue = connection.messageQueue;
    connection.messageQueue = [];
    
    for (const message of queue) {
      this.sendMessageNow(message);
    }
  }
  
  // 检查心跳
  checkHeartbeats() {
    const now = Date.now();
    const timeout = this.options.heartbeatInterval * 2;
    
    for (const [id, connection] of this.connections) {
      if (connection.connected && (now - connection.lastHeartbeat) > timeout) {
        console.warn(`连接 ${id} 心跳超时`);
        connection.ws.close();
      }
    }
  }
  
  // 关闭连接
  closeConnection(id) {
    const connection = this.connections.get(id);
    if (connection) {
      if (connection.ws) {
        connection.ws.close();
      }
      this.connections.delete(id);
      console.log(`连接 ${id} 已关闭`);
    }
  }
  
  // 获取统计信息
  getStats() {
    const connectionStats = Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      connected: conn.connected,
      messagesSent: conn.stats.messagesSent,
      messagesReceived: conn.stats.messagesReceived,
      bytesTransferred: conn.stats.bytesTransferred
    }));
    
    return {
      ...this.stats,
      queueSize: this.messageQueue.length,
      connections: connectionStats
    };
  }
  
  // 关闭所有连接
  closeAll() {
    for (const [id] of this.connections) {
      this.closeConnection(id);
    }
  }
}

// 使用示例
const pool = new ConnectionPool({
  maxConnections: 5,
  heartbeatInterval: 30000,
  messageQueueSize: 500
});

// 监听事件
pool.on('connected', (id) => {
  console.log(`连接 ${id} 已建立`);
});

pool.on('message', ({ connectionId, message, data }) => {
  console.log(`收到消息 [${connectionId}] ${message.route}:`, data);
});

// 创建连接
pool.createConnection('game1', 'ws://localhost:3001')
  .then(() => {
    // 发送消息
    pool.sendMessage('game1', 'user.login', {
      username: 'player1',
      password: '123456'
    });
  })
  .catch(console.error);

module.exports = ConnectionPool;
```

## 浏览器使用

### ES 模块方式

```html
<!DOCTYPE html>
<html>
<head>
  <title>Pofresh Protocol 浏览器示例</title>
</head>
<body>
  <div id="app">
    <h1>游戏客户端</h1>
    <div id="status">未连接</div>
    <div id="messages"></div>
    <input type="text" id="messageInput" placeholder="输入消息...">
    <button onclick="sendMessage()">发送</button>
  </div>

  <script type="module">
    import Protocol from './dist/pofresh-protocol.es.js';
    const { Package, Message } = Protocol;
    
    class GameClient {
      constructor() {
        this.ws = null;
        this.connected = false;
        this.messageId = 1;
        this.statusEl = document.getElementById('status');
        this.messagesEl = document.getElementById('messages');
        
        this.connect();
      }
      
      connect() {
        this.updateStatus('连接中...');
        
        this.ws = new WebSocket('ws://localhost:3001');
        this.ws.binaryType = 'arraybuffer';
        
        this.ws.onopen = () => {
          this.connected = true;
          this.updateStatus('已连接');
          this.sendHandshake();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(new Uint8Array(event.data));
        };
        
        this.ws.onclose = () => {
          this.connected = false;
          this.updateStatus('连接已断开');
          
          // 3秒后重连
          setTimeout(() => {
            this.connect();
          }, 3000);
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket 错误:', error);
          this.updateStatus('连接错误');
        };
      }
      
      sendHandshake() {
        const handshake = Package.encode(Package.TYPE_HANDSHAKE);
        this.send(handshake);
      }
      
      handleMessage(buffer) {
        try {
          const pkg = Package.decode(buffer);
          
          switch (pkg.type) {
            case Package.TYPE_HANDSHAKE_ACK:
              this.updateStatus('握手完成');
              this.login();
              break;
              
            case Package.TYPE_HEARTBEAT:
              // 回复心跳
              this.send(Package.encode(Package.TYPE_HEARTBEAT));
              break;
              
            case Package.TYPE_DATA:
              this.handleDataMessage(pkg.body);
              break;
              
            case Package.TYPE_KICK:
              this.updateStatus('被服务器踢出');
              this.ws.close();
              break;
          }
        } catch (error) {
          console.error('处理消息失败:', error);
        }
      }
      
      handleDataMessage(buffer) {
        try {
          const msg = Message.decode(buffer);
          const data = JSON.parse(Protocol.strdecode(msg.body));
          
          this.addMessage(`收到: ${msg.route}`, data);
          
          // 处理不同类型的消息
          switch (msg.route) {
            case 'user.loginResponse':
              if (data.success) {
                this.updateStatus('登录成功');
                this.joinRoom();
              } else {
                this.updateStatus('登录失败: ' + data.message);
              }
              break;
              
            case 'room.joinResponse':
              if (data.success) {
                this.updateStatus('已加入房间');
              }
              break;
              
            case 'chat.message':
              this.addMessage(`${data.username}: ${data.message}`);
              break;
          }
        } catch (error) {
          console.error('解析数据消息失败:', error);
        }
      }
      
      login() {
        this.sendRequest('user.login', {
          username: 'player_' + Math.floor(Math.random() * 1000),
          password: '123456'
        });
      }
      
      joinRoom() {
        this.sendRequest('room.join', {
          roomId: 'lobby'
        });
      }
      
      sendMessage(text) {
        if (!this.connected) {
          alert('未连接到服务器');
          return;
        }
        
        this.sendNotify('chat.send', {
          message: text
        });
      }
      
      sendRequest(route, data) {
        const body = Protocol.strencode(JSON.stringify(data));
        const msg = Message.encode(
          this.messageId++,
          Message.TYPE_REQUEST,
          0,
          route,
          body
        );
        const pkg = Package.encode(Package.TYPE_DATA, msg);
        this.send(pkg);
      }
      
      sendNotify(route, data) {
        const body = Protocol.strencode(JSON.stringify(data));
        const msg = Message.encode(
          0,
          Message.TYPE_NOTIFY,
          0,
          route,
          body
        );
        const pkg = Package.encode(Package.TYPE_DATA, msg);
        this.send(pkg);
      }
      
      send(buffer) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(buffer);
        }
      }
      
      updateStatus(status) {
        this.statusEl.textContent = `状态: ${status}`;
      }
      
      addMessage(title, data = null) {
        const div = document.createElement('div');
        div.innerHTML = `<strong>${title}</strong>`;
        if (data) {
          div.innerHTML += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        }
        this.messagesEl.appendChild(div);
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      }
    }
    
    // 创建客户端实例
    const client = new GameClient();
    
    // 全局函数供按钮调用
    window.sendMessage = function() {
      const input = document.getElementById('messageInput');
      const text = input.value.trim();
      if (text) {
        client.sendMessage(text);
        input.value = '';
      }
    };
    
    // 回车发送消息
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  </script>
  
  <style>
    #app {
      max-width: 600px;
      margin: 20px auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    
    #status {
      padding: 10px;
      background: #f0f0f0;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    
    #messages {
      height: 300px;
      overflow-y: auto;
      border: 1px solid #ccc;
      padding: 10px;
      margin-bottom: 20px;
      background: #fafafa;
    }
    
    #messages div {
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    
    #messageInput {
      width: 70%;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    button {
      width: 25%;
      padding: 8px;
      background: #007cba;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:hover {
      background: #005a87;
    }
    
    pre {
      background: #f5f5f5;
      padding: 5px;
      border-radius: 3px;
      font-size: 12px;
      margin: 5px 0;
    }
  </style>
</body>
</html>
```

### UMD 方式（直接引入）

```html
<!DOCTYPE html>
<html>
<head>
  <title>Pofresh Protocol UMD 示例</title>
  <script src="./dist/pofresh-protocol.umd.js"></script>
</head>
<body>
  <div id="app">
    <h1>简单聊天客户端</h1>
    <div id="output"></div>
    <input type="text" id="input" placeholder="输入消息...">
    <button onclick="connect()">连接</button>
    <button onclick="disconnect()">断开</button>
    <button onclick="sendChat()">发送</button>
  </div>

  <script>
    // 使用全局变量 PofreshProtocol
    const { Package, Message, strencode, strdecode } = PofreshProtocol;
    
    let ws = null;
    let connected = false;
    let messageId = 1;
    
    function log(message) {
      const output = document.getElementById('output');
      const div = document.createElement('div');
      div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      output.appendChild(div);
      output.scrollTop = output.scrollHeight;
    }
    
    function connect() {
      if (connected) {
        log('已经连接');
        return;
      }
      
      log('正在连接...');
      ws = new WebSocket('ws://localhost:3001');
      ws.binaryType = 'arraybuffer';
      
      ws.onopen = () => {
        connected = true;
        log('连接成功');
        
        // 发送握手
        const handshake = Package.encode(Package.TYPE_HANDSHAKE);
        ws.send(handshake);
      };
      
      ws.onmessage = (event) => {
        try {
          const buffer = new Uint8Array(event.data);
          const pkg = Package.decode(buffer);
          
          switch (pkg.type) {
            case Package.TYPE_HANDSHAKE_ACK:
              log('握手完成');
              // 自动登录
              sendLogin();
              break;
              
            case Package.TYPE_HEARTBEAT:
              // 回复心跳
              ws.send(Package.encode(Package.TYPE_HEARTBEAT));
              break;
              
            case Package.TYPE_DATA:
              handleDataMessage(pkg.body);
              break;
              
            case Package.TYPE_KICK:
              log('被服务器踢出');
              disconnect();
              break;
          }
        } catch (error) {
          log('处理消息错误: ' + error.message);
        }
      };
      
      ws.onclose = () => {
        connected = false;
        log('连接已断开');
      };
      
      ws.onerror = (error) => {
        log('连接错误: ' + error.message);
      };
    }
    
    function disconnect() {
      if (ws) {
        ws.close();
        ws = null;
        connected = false;
        log('已断开连接');
      }
    }
    
    function handleDataMessage(buffer) {
      try {
        const msg = Message.decode(buffer);
        const data = JSON.parse(strdecode(msg.body));
        
        log(`收到消息 [${msg.route}]: ${JSON.stringify(data)}`);
        
        switch (msg.route) {
          case 'user.loginResponse':
            if (data.success) {
              log('登录成功');
            } else {
              log('登录失败: ' + data.message);
            }
            break;
            
          case 'chat.message':
            log(`${data.username}: ${data.message}`);
            break;
        }
      } catch (error) {
        log('解析消息错误: ' + error.message);
      }
    }
    
    function sendLogin() {
      sendRequest('user.login', {
        username: 'guest_' + Math.floor(Math.random() * 1000),
        password: '123456'
      });
    }
    
    function sendChat() {
      const input = document.getElementById('input');
      const text = input.value.trim();
      
      if (!connected) {
        alert('请先连接服务器');
        return;
      }
      
      if (!text) {
        alert('请输入消息内容');
        return;
      }
      
      sendNotify('chat.send', {
        message: text
      });
      
      input.value = '';
      log(`发送: ${text}`);
    }
    
    function sendRequest(route, data) {
      const body = strencode(JSON.stringify(data));
      const msg = Message.encode(
        messageId++,
        Message.TYPE_REQUEST,
        0,
        route,
        body
      );
      const pkg = Package.encode(Package.TYPE_DATA, msg);
      ws.send(pkg);
    }
    
    function sendNotify(route, data) {
      const body = strencode(JSON.stringify(data));
      const msg = Message.encode(
        0,
        Message.TYPE_NOTIFY,
        0,
        route,
        body
      );
      const pkg = Package.encode(Package.TYPE_DATA, msg);
      ws.send(pkg);
    }
    
    // 回车发送消息
    document.getElementById('input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendChat();
      }
    });
  </script>
  
  <style>
    #app {
      max-width: 500px;
      margin: 20px auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    
    #output {
      height: 300px;
      overflow-y: auto;
      border: 1px solid #ccc;
      padding: 10px;
      margin-bottom: 20px;
      background: #f9f9f9;
      font-family: monospace;
      font-size: 12px;
    }
    
    #input {
      width: 60%;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    button {
      padding: 8px 12px;
      margin: 0 5px;
      background: #007cba;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:hover {
      background: #005a87;
    }
  </style>
</body>
</html>
```

## TypeScript 支持

### 基本类型定义

```typescript
import Protocol, { 
  Package, 
  Message, 
  strencode, 
  strdecode,
  PackageDecodeResult,
  MessageDecodeResult
} from 'pofresh-protocol';

// 定义消息数据接口
interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  userId?: number;
  token?: string;
}

interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
}

// 定义路由类型
type GameRoute = 
  | 'user.login'
  | 'user.logout'
  | 'room.join'
  | 'room.leave'
  | 'chat.send'
  | 'chat.message';

// 类型安全的消息发送器
class TypedMessageSender {
  private messageId: number = 1;
  
  constructor(private sendBuffer: (buffer: Uint8Array) => void) {}
  
  // 发送请求消息
  sendRequest<T = any>(
    route: GameRoute, 
    data: T, 
    compressRoute: number = 0
  ): number {
    const id = this.messageId++;
    const body = strencode(JSON.stringify(data));
    const msg = Message.encode(
      id,
      Message.TYPE_REQUEST,
      compressRoute,
      route,
      body
    );
    const pkg = Package.encode(Package.TYPE_DATA, msg);
    this.sendBuffer(pkg);
    return id;
  }
  
  // 发送通知消息
  sendNotify<T = any>(
    route: GameRoute, 
    data: T, 
    compressRoute: number = 0
  ): void {
    const body = strencode(JSON.stringify(data));
    const msg = Message.encode(
      0,
      Message.TYPE_NOTIFY,
      compressRoute,
      route,
      body
    );
    const pkg = Package.encode(Package.TYPE_DATA, msg);
    this.sendBuffer(pkg);
  }
  
  // 发送响应消息
  sendResponse<T = any>(
    id: number, 
    route: GameRoute, 
    data: T, 
    compressRoute: number = 0
  ): void {
    const body = strencode(JSON.stringify(data));
    const msg = Message.encode(
      id,
      Message.TYPE_RESPONSE,
      compressRoute,
      route,
      body
    );
    const pkg = Package.encode(Package.TYPE_DATA, msg);
    this.sendBuffer(pkg);
  }
  
  // 发送推送消息
  sendPush<T = any>(
    route: GameRoute, 
    data: T, 
    compressRoute: number = 0
  ): void {
    const body = strencode(JSON.stringify(data));
    const msg = Message.encode(
      0,
      Message.TYPE_PUSH,
      compressRoute,
      route,
      body
    );
    const pkg = Package.encode(Package.TYPE_DATA, msg);
    this.sendBuffer(pkg);
  }
}

// 类型安全的消息处理器
class TypedMessageHandler {
  private handlers = new Map<GameRoute, (data: any, msg: MessageDecodeResult) => void>();
  
  // 注册消息处理器
  on<T = any>(
    route: GameRoute, 
    handler: (data: T, msg: MessageDecodeResult) => void
  ): void {
    this.handlers.set(route, handler);
  }
  
  // 移除消息处理器
  off(route: GameRoute): void {
    this.handlers.delete(route);
  }
  
  // 处理接收到的消息
  handle(buffer: Uint8Array): void {
    try {
      const pkg: PackageDecodeResult = Package.decode(buffer);
      
      if (pkg.type === Package.TYPE_DATA && pkg.body) {
        const msg: MessageDecodeResult = Message.decode(pkg.body);
        const route = msg.route as GameRoute;
        const handler = this.handlers.get(route);
        
        if (handler) {
          const data = JSON.parse(strdecode(msg.body));
          handler(data, msg);
        } else {
          console.warn(`未找到路由 ${route} 的处理器`);
        }
      }
    } catch (error) {
      console.error('处理消息失败:', error);
    }
  }
}

// 使用示例
class GameClient {
  private ws: WebSocket | null = null;
  private sender: TypedMessageSender;
  private handler: TypedMessageHandler;
  private connected: boolean = false;
  
  constructor() {
    this.sender = new TypedMessageSender((buffer) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(buffer);
      }
    });
    
    this.handler = new TypedMessageHandler();
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    // 登录响应
    this.handler.on<LoginResponse>('user.loginResponse', (data, msg) => {
      if (data.success) {
        console.log('登录成功:', data.userId);
      } else {
        console.error('登录失败:', data.message);
      }
    });
    
    // 聊天消息
    this.handler.on<ChatMessage>('chat.message', (data, msg) => {
      console.log(`${data.username}: ${data.message}`);
    });
  }
  
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';
      
      this.ws.onopen = () => {
        this.connected = true;
        console.log('连接成功');
        
        // 发送握手
        const handshake = Package.encode(Package.TYPE_HANDSHAKE);
        this.ws!.send(handshake);
        
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        const buffer = new Uint8Array(event.data);
        this.handler.handle(buffer);
      };
      
      this.ws.onclose = () => {
        this.connected = false;
        console.log('连接已断开');
      };
      
      this.ws.onerror = (error) => {
        reject(error);
      };
    });
  }
  
  login(username: string, password: string): number {
    const data: LoginRequest = { username, password };
    return this.sender.sendRequest('user.login', data);
  }
  
  sendChat(message: string): void {
    const data: ChatMessage = {
      username: 'current_user',
      message,
      timestamp: Date.now()
    };
    this.sender.sendNotify('chat.send', data);
  }
  
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }
  
  isConnected(): boolean {
    return this.connected;
  }
}

// 使用客户端
const client = new GameClient();

client.connect('ws://localhost:3001')
  .then(() => {
    // 登录
    const loginId = client.login('player1', '123456');
    console.log('发送登录请求，ID:', loginId);
    
    // 发送聊天消息
    setTimeout(() => {
      client.sendChat('Hello, TypeScript!');
    }, 1000);
  })
  .catch(console.error);

export { GameClient, TypedMessageSender, TypedMessageHandler };
export type { LoginRequest, LoginResponse, ChatMessage, GameRoute };
```

### 高级类型定义

```typescript
// 消息类型映射
interface MessageTypeMap {
  'user.login': { request: LoginRequest; response: LoginResponse };
  'user.logout': { request: {}; response: { success: boolean } };
  'room.join': { request: { roomId: string }; response: { success: boolean; players: string[] } };
  'chat.send': { notify: ChatMessage };
  'chat.message': { push: ChatMessage };
}

// 类型安全的客户端
class TypeSafeClient {
  private messageId = 1;
  private pendingRequests = new Map<number, (response: any) => void>();
  
  constructor(private sendBuffer: (buffer: Uint8Array) => void) {}
  
  // 发送请求并等待响应
  async request<K extends keyof MessageTypeMap>(
    route: K,
    data: MessageTypeMap[K]['request']
  ): Promise<MessageTypeMap[K]['response']> {
    return new Promise((resolve) => {
      const id = this.messageId++;
      this.pendingRequests.set(id, resolve);
      
      const body = strencode(JSON.stringify(data));
      const msg = Message.encode(id, Message.TYPE_REQUEST, 0, route as string, body);
      const pkg = Package.encode(Package.TYPE_DATA, msg);
      this.sendBuffer(pkg);
    });
  }
  
  // 发送通知
  notify<K extends keyof MessageTypeMap>(
    route: K,
    data: MessageTypeMap[K]['notify']
  ): void {
    const body = strencode(JSON.stringify(data));
    const msg = Message.encode(0, Message.TYPE_NOTIFY, 0, route as string, body);
    const pkg = Package.encode(Package.TYPE_DATA, msg);
    this.sendBuffer(pkg);
  }
  
  // 处理响应
  handleResponse(msg: MessageDecodeResult): void {
    const callback = this.pendingRequests.get(msg.id);
    if (callback) {
      const data = JSON.parse(strdecode(msg.body));
      callback(data);
      this.pendingRequests.delete(msg.id);
    }
  }
}

// 使用示例
const typeSafeClient = new TypeSafeClient((buffer) => {
  // 发送缓冲区到 WebSocket
});

// 类型安全的 API 调用
typeSafeClient.request('user.login', {
  username: 'player1',
  password: '123456'
}).then((response) => {
  // response 的类型自动推断为 LoginResponse
  if (response.success) {
    console.log('登录成功，用户ID:', response.userId);
  }
});

// 发送通知
typeSafeClient.notify('chat.send', {
  username: 'player1',
  message: 'Hello!',
  timestamp: Date.now()
});
```

## 总结

本文档提供了 `pofresh-protocol` 库的详细使用示例，涵盖了从基础用法到高级优化的各个方面：

1. **基础使用** - 字符串编码、包和消息的编解码
2. **游戏开发** - 客户端-服务器通信、聊天系统
3. **路由压缩** - 提高传输效率
4. **错误处理** - 健壮的异常处理机制
5. **性能优化** - 缓冲区池、连接池、消息队列
6. **浏览器支持** - ES 模块和 UMD 两种方式
7. **TypeScript** - 完整的类型安全支持

这些示例可以帮助开发者快速上手并在实际项目中有效使用 `pofresh-protocol` 库。