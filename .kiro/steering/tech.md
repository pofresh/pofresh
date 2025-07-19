# 技术栈

## 运行时和包管理
- **Node.js**: 需要 >=16.0.0 版本
- **包管理器**: pnpm >=8.0.0 (指定为 packageManager)
- **单体仓库**: pnpm workspaces 配合 Turbo 进行构建编排

## 构建系统和工具
- **Turbo**: 构建系统编排和缓存
- **ESLint**: 代码检查，使用自定义规则
- **Prettier**: 代码格式化
- **Vitest**: 测试框架，支持覆盖率

## 代码质量标准
- **ES6+**: ECMAScript 2018+ 支持模块化
- **代码检查**: ESLint 推荐规则 + 游戏服务器特定自定义规则
- **格式化**: Prettier 单引号，120字符行长度，4空格缩进
- **测试**: Vitest node 环境，v8 覆盖率

## 常用命令

### 开发
```bash
pnpm dev              # 启动开发模式
pnpm build            # 构建所有包
pnpm clean            # 清理构建产物
```

### 测试和质量
```bash
pnpm test             # 运行测试
pnpm test:watch       # 监视模式运行测试
pnpm test:coverage    # 运行测试并生成覆盖率
pnpm lint             # 代码检查
pnpm lint:fix         # 修复代码检查问题
pnpm format           # 格式化代码
```

### 安全和维护
```bash
pnpm audit            # 安全审计
pnpm security:check   # 组合审计和代码检查
```

## 架构组件
- **核心框架**: 主要的 pofresh 包
- **管理工具**: pofresh-admin 用于服务器管理
- **CLI 工具**: pofresh-cli 用于项目脚手架
- **通信**: pofresh-rpc, pofresh-protocol, pofresh-protobuf
- **工具**: pofresh-loader, pofresh-logger, pofresh-monitor, pofresh-scheduler
- **插件**: 可扩展的插件系统，提供额外功能

## 注意事项
- 使用中文回复