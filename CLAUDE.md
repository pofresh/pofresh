# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供在此代码库中工作的指导。

## 项目概述

**pofresh** 是一个基于 pomelo 的 Node.js 游戏服务器框架，具有快速、可扩展的特点。它提供了分布式多进程架构，专为实时多人游戏和应用而设计。

## 架构

### 核心组件
- **pofresh** (主包)：核心框架，负责应用生命周期管理
- **pofresh-cli**：服务器管理命令行界面
- **pofresh-admin**：管理控制台和监控
- **pofresh-rpc**：远程过程调用系统，支持多种传输协议
- **pofresh-protocol**：网络协议处理
- **pofresh-protobuf**：协议缓冲区支持
- **pofresh-logger**：日志工具
- **pofresh-loader**：动态模块加载
- **pofresh-scheduler**：作业调度系统
- **pofresh-monitor**：系统和进程监控

### 插件架构
- **pofresh-http**：HTTP 服务器集成
- **pofresh-globalchannel-plugin**：全局频道管理
- **pofresh-status-plugin**：在线状态管理

### 服务器类型
- **Master**：中央协调服务器
- **Connector**：客户端连接处理
- **Backend**：游戏逻辑和状态管理
- **Gate**：负载均衡和路由

## 开发命令

### 包管理
- `pnpm install` - 安装依赖
- `pnpm dev` - 启动开发模式 (Turbo)
- `pnpm build` - 构建所有包 (Turbo)
- `pnpm clean` - 清理构建产物

### 代码质量
- `pnpm run lint` - 检查所有包和插件的代码质量
- `pnpm run lint:fix` - 自动修复代码质量问题
- `pnpm run format` - 使用 Prettier 格式化代码
- `pnpm run test` - 运行所有测试 (使用 Vitest)
- `pnpm run test:watch` - 运行测试并监听文件变化
- `pnpm run test:coverage` - 运行测试并生成覆盖率报告

### 安全
- `pnpm run security:check` - 运行安全审计和代码检查
- `pnpm run audit` - 检查易受攻击的依赖项

### 测试
- `pnpm test` - 运行所有测试 (使用 Vitest)
- 测试文件位于每个包的 `/test/` 目录中
- 使用根目录共享的 Vitest 配置，子项目无需单独安装测试依赖
- 支持多项目工作区配置，统一管理所有包的测试

## 项目结构

```
├── packages/           # 核心框架包
│   ├── pofresh/       # 主框架
│   ├── pofresh-cli/   # CLI 工具
│   └── ...            # 其他核心包
├── plugin/            # 可选插件
│   ├── pofresh-http/
│   └── ...
├── template/          # 项目模板 (游戏服务器、Web服务器)
└── turbo.json         # Turbo 构建配置
```

## 关键文件

- **packages/pofresh/lib/application.js:39** - 应用初始化
- **packages/pofresh/lib/pofresh.js:72** - 主框架入口点
- **packages/pofresh/template/game-server/** - 新项目的模板
- **gulpfile.js:21** - 测试运行器配置

## 环境要求
- Node.js >= 16.0.0
- pnpm >= 8.0.0

## 常见开发任务

### 开始新项目
1. 使用 CLI: `pofresh init your-project`
2. 参考 `template/game-server/` 中的模板结构

### 添加组件
- 组件放在 `packages/pofresh/lib/components/`
- 由框架自动加载

### 添加插件
- 插件放在 `plugin/` 目录
- 使用现有插件作为模板

## 注意事项
- 确保所有包都使用一致的依赖版本，并使用 pnpm 管理依赖。
- 使用中文回复