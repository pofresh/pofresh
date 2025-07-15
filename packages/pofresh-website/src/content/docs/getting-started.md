---
title: "快速开始"
description: "5分钟快速上手Pofresh游戏服务器框架"
category: "开始"
difficulty: "beginner"
sidebar_position: 1
lastUpdated: 2024-01-15
author: "Pofresh团队"
tags: ["入门", "快速开始"]
---

# 快速开始

本指南将帮助你在5分钟内启动并运行你的第一个Pofresh游戏服务器。

## 环境要求

- **Node.js**: 16.0 或更高版本
- **npm**: 或 yarn 包管理器
- **系统**: Windows, macOS, Linux 均支持

## 安装步骤

### 1. 安装 Pofresh CLI

```bash
npm install -g pofresh
```

### 2. 创建新项目

```bash
pofresh init my-game-server
cd my-game-server
```

### 3. 启动服务器

```bash
pofresh start
```

服务器启动后，你会看到类似下面的输出：

```
[INFO] Pofresh server started successfully
[INFO] Server is listening on port 3150
[INFO] Master process started
[INFO] Worker process started
```

## 验证安装

### 测试客户端连接

创建一个简单的测试文件 `test-client.js`：

```javascript
const pomelo = require('pomelo-jsclient');

const client = new pomelo();
client.init({
  host: '127.0.0.1',
  port: 3014
}, function() {
  console.log('✅ 成功连接到服务器');
  
  // 发送测试消息
  client.request('connector.entryHandler.entry', {
    username: 'test_user',
    rid: 'room_1'
  }, function(data) {
    console.log('服务器响应:', data);
  });
});
```

### 运行测试

```bash
npm install pomelo-jsclient
node test-client.js
```

如果看到以下输出，说明安装成功：

```
✅ 成功连接到服务器
服务器响应: { code: 200, user: { id: 1, username: 'test_user' } }
```

## 项目结构

```
my-game-server/
├── app/                    # 应用代码
│   ├── servers/           # 服务器定义
│   │   ├── connector/     # 连接服务器
│   │   ├── gate/         # 网关服务器
│   │   └── chat/         # 聊天服务器
│   ├── handlers/         # 消息处理器
│   ├── remote/           # 远程方法
│   └── models/           # 数据模型
├── config/               # 配置文件
├── logs/                 # 日志文件
└── shared/               # 共享代码
```

## 下一步

恭喜！你已经成功启动了第一个Pofresh游戏服务器。

接下来建议：

1. **阅读架构概览** - 了解Pofresh的工作原理
2. **查看示例代码** - 学习更多使用场景
3. **加入社区** - 获取帮助和分享经验

## 常见问题

**Q: 端口被占用怎么办？**
A: 修改 `config/servers.json` 中的端口配置，然后重启服务器。

**Q: 如何调试？**
A: 使用 `DEBUG=pofresh:* pofresh start` 启动服务器查看详细日志。

**Q: 支持哪些协议？**
A: 支持WebSocket、Socket.IO、原生TCP等多种协议。