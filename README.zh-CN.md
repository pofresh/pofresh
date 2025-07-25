# Pofresh - 基于Node.js的快速、可扩展游戏服务器框架

Pofresh是一个基于pomelo的快速、可扩展游戏服务器框架，专为实时多人游戏和应用设计的分布式多进程架构。

## 核心特性

- **高性能**: 基于Node.js的事件驱动架构，支持高并发连接
- **可扩展**: 分布式架构，支持水平扩展
- **多进程**: 自动管理多进程，充分利用多核CPU
- **实时通信**: 基于WebSocket的实时双向通信
- **插件系统**: 灵活的插件架构，易于扩展功能
- **管理工具**: 提供CLI工具和Web管理界面

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- pnpm >= 8.0.0

### 安装CLI工具
```bash
npm install -g pofresh-cli
```

### 创建新项目
```bash
pofresh init game-server
cd game-server
npm install
```

### 启动服务器
```bash
pofresh start
```

## 项目结构

```
game-server/
├── app/
│   ├── servers/          # 服务器目录
│   │   ├── connector/    # 连接服务器
│   │   ├── gate/        # 网关服务器
│   │   └── ...          # 其他服务器类型
│   ├── util/            # 工具类
│   └── ...
├── config/              # 配置文件
├── logs/                # 日志文件
└── shared/              # 共享代码
```

## 服务器类型

- **Master**: 主服务器，负责协调管理
- **Connector**: 连接服务器，处理客户端连接
- **Gate**: 网关服务器，负载均衡和路由
- **Backend**: 后端服务器，游戏逻辑和状态管理

## 开发命令

### 包管理
```bash
pnpm install          # 安装依赖
pnpm dev             # 开发模式启动
pnpm build           # 构建所有包
pnpm clean           # 清理构建产物
```

### 代码质量
```bash
pnpm run lint        # 代码检查
pnpm run lint:fix    # 自动修复代码问题
pnpm run format      # 代码格式化
pnpm run test        # 运行测试
```

### 安全检查
```bash
pnpm run security:check  # 安全审计
pnpm run audit          # 检查依赖漏洞
```

## 核心包介绍

### 框架核心
- **pofresh**: 主框架包，应用生命周期管理
- **pofresh-cli**: 命令行工具
- **pofresh-admin**: 管理控制台和监控
- **pofresh-rpc**: 远程过程调用系统
- **pofresh-protocol**: 网络协议处理
- **pofresh-protobuf**: ProtocolTest Buffer支持

### 插件系统
- **pofresh-http**: HTTP服务器集成
- **pofresh-globalchannel-plugin**: 全局频道管理
- **pofresh-status-plugin**: 在线状态管理

## 示例代码

### 创建简单处理器
```javascript
// app/servers/connector/handler/entryHandler.js
module.exports = function(app) {
  return new EntryHandler(app);
};

var EntryHandler = function(app) {
  this.app = app;
};

EntryHandler.prototype.entry = function(msg, session, next) {
  next(null, {code: 200, msg: '欢迎进入游戏世界'});
};
```

### 路由配置
```javascript
// config/servers.json
{
  "development": {
    "connector": [
      {"id": "connector-server-1", "host": "127.0.0.1", "port": 3150, "clientPort": 3010, "frontend": true}
    ],
    "gate": [
      {"id": "gate-server-1", "host": "127.0.0.1", "port": 3160, "clientPort": 3011, "frontend": true}
    ]
  }
}
```

## 监控和管理

### Web管理界面
访问 `http://localhost:3005` 查看管理界面

### CLI命令
```bash
pofresh list          # 列出所有服务器
pofresh stop          # 停止服务器
pofresh restart       # 重启服务器
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 社区支持

- GitHub Issues: [提交问题](https://github.com/your-repo/pofresh/issues)
- 文档: [查看文档](https://your-docs-url.com)

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新详情。