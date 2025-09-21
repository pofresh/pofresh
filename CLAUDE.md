# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## AI 回复要求

在此项目中工作时，请使用中文回复所有消息和响应。

## 环境要求

- **Node.js**: 版本 >= 20.x
- **pnpm**: 用于包管理和工作空间

## 项目概述

pofresh 是一个快速、可扩展的 Node.js 游戏服务器框架，基于原始的 pomelo 框架。它提供了分布式多进程架构，专为实时多人游戏和 Web 应用程序设计。该框架使用 monorepo 结构，采用 pnpm workspaces 和 turbo 进行构建编排。

## 架构

### 核心组件
- **pofresh** (主包): 核心框架，提供应用程序生命周期、服务器管理和组件系统
- **pofresh-admin**: 管理控制台和监控工具  
- **pofresh-cli**: 用于服务器管理的命令行界面
- **pofresh-loader**: 动态模块加载系统
- **pofresh-logger**: 日志基础设施
- **pofresh-monitor**: 进程和系统监控
- **pofresh-protobuf**: 协议缓冲区支持，用于高效序列化
- **pofresh-protocol**: 网络协议处理
- **pofresh-rpc**: 支持多种传输的远程过程调用系统
- **pofresh-scheduler**: 作业调度和 cron 功能

### 服务器架构
该框架使用分布式架构，包含不同的服务器类型：
- **Master**: 中央协调服务器
- **Monitor**: 服务器监控和管理
- **Connector**: 客户端连接处理
- **Game servers**: 应用程序逻辑服务器

### 插件系统
通过位于 `/plugins/` 和 `/plugin/` 目录中的插件进行扩展：
- **pofresh-globalchannel-plugin**: 跨服务器通信通道
- **pofresh-status-plugin**: 服务器状态管理
- **pofresh-http**: HTTP 服务器集成

## 开发命令

### 主项目
```bash
# 运行测试（包含覆盖率检查和代码检查）
npm test
# 或
gulp

# 安装依赖（使用 pnpm 管理工作空间）
pnpm install

# 构建所有包（使用 turbo）
pnpm run build
```

### 单独包开发
导航到 `/packages/` 中的特定包目录：
```bash
# 核心包示例
cd packages/pofresh
npm test
```

### 测试
- 测试使用 **Vitest** 进行测试执行和代码覆盖率分析
- 使用 ESLint 进行代码风格强制检查
- 测试文件位于每个包的 `test/` 目录中

## 关键开发模式

### 应用程序结构
- 主入口点: `packages/pofresh/lib/application.js`
- 核心框架: `packages/pofresh/lib/pofresh.js`
- 服务器实现在 `lib/server/`
- 组件在 `lib/components/`
- 连接器在 `lib/connectors/`

### 组件系统
组件由框架自动加载和管理。常见组件包括：
- Channel: 消息广播
- Session: 用户会话管理
- Connection: 客户端连接处理
- BackendSession: 服务器间会话处理

### RPC 通信
RPC 系统支持多种传输协议：
- Socket.IO (默认)
- WebSocket
- TCP
- MQTT

### 配置
- JSON 格式的服务器配置
- 环境特定配置
- 客户端-服务器通信的协议定义

## 代码风格和质量控制

### 推荐的现代化工具链

**代码质量和格式化**
- **Biome**: 主要的代码检查和格式化工具，替代 ESLint 和 Prettier
- **Ultracite**: 基于 Biome 的代码质量控制工具，提供零配置的严格类型安全和代码质量检查
- **@eslint/js**: 现代 ESLint 配置
- **typescript-eslint**: TypeScript 支持

### 代码质量控制原则

基于 Ultracite 的强制规则：

**类型安全和正确性**
- 零配置，亚秒级性能
- 最大的类型安全
- AI 友好的代码生成
- 严格的错误处理和代码复杂度控制

**可访问性 (a11y)**
- 遵循 Web 内容可访问性指南 (WCAG)
- 禁止使用 `accessKey` 属性
- 确保焦点元素的 ARIA 标签正确
- 使用语义化 HTML 元素

**代码复杂度控制**
- 限制函数认知复杂度
- 禁止使用 `arguments` 对象
- 使用箭头函数替代函数表达式
- 避免深度嵌套的控制结构

### 开发命令

**代码检查和格式化**
```bash
# 检查代码问题（不修复）
pnpm dlx ultracite check

# 自动修复代码问题
pnpm dlx ultracite fix

# 使用 Biome 直接检查
npx biome check .

# 使用 Biome 格式化
npx biome format --write .
```

**提交前检查**
- 项目已配置 lint-staged，会在提交时自动运行 `ultracite fix`
- 支持的文件类型：js, jsx, ts, tsx, json, jsonc, css, scss, md, mdx

### 模块组织
- 每个包都是独立的 npm 模块
- **ESM 模块系统** (`import/export`)
- **移除 CommonJS 支持**
- 公共 API 和内部实现之间清晰分离

### 错误处理
- 使用错误优先回调模式
- 通过 pofresh-logger 进行集中式日志记录
- 基于 EventEmitter 的事件驱动架构

### 生命周期管理
应用程序遵循严格的生命周期：INITED → START → STARTED → STOPED

### 关键架构文件
这些文件需要跨多个文件理解才能掌握整体架构：

1. **`packages/pofresh/lib/application.js`**: 核心应用生命周期管理，协调所有组件和服务器
2. **`packages/pofresh/lib/server/server.js`**: 服务器实例创建和管理，处理不同类型服务器的抽象
3. **`packages/pofresh/lib/master/`**: 主服务器集群协调逻辑，管理worker进程生命周期
4. **`packages/pofresh/lib/components/`**: 插件架构实现，各组件间通过事件总线通信
5. **`packages/pofresh-rpc/`**: RPC基础设施，支持多种传输协议和服务发现

### 分布式架构模式
- **服务注册与发现**: 基于JSON配置的静态服务注册，通过master服务器协调
- **负载均衡**: 客户端连接器级别的负载均衡，支持多种策略
- **故障转移**: 基于心跳检测的故障检测和自动重启机制
- **状态同步**: 通过backendSession组件实现跨服务器状态共享

### 组件间通信机制
- **事件驱动**: 基于EventEmitter的松耦合通信
- **RPC调用**: 同步/异步远程过程调用，支持filter链
- **消息广播**: Channel组件提供发布订阅机制
- **会话管理**: Session组件维护用户状态，BackendSession处理分布式场景

## 包管理

此项目使用 pnpm workspaces，结构如下：
- `packages/`: 核心框架包
- `plugins/`: 插件包  
- `examples/`: 示例应用程序
- `test/`: 测试工具

所有依赖都应通过 pnpm 管理，以确保正确的工作空间链接。