# 项目结构

## 单体仓库组织

这是一个 pnpm workspace 单体仓库，具有以下顶级结构：

```
├── packages/          # 核心框架包
├── plugin/           # 官方插件
├── test/             # 共享测试工具
├── .kiro/            # Kiro AI 助手配置
└── [配置文件]         # 根级配置
```

## 包结构

### 核心包 (`packages/`)
- **pofresh**: 主框架包（入口点）
- **pofresh-admin**: 服务器管理工具
- **pofresh-cli**: 命令行界面和项目脚手架
- **pofresh-loader**: 模块加载工具
- **pofresh-logger**: 日志框架
- **pofresh-monitor**: 服务器监控工具
- **pofresh-protobuf**: ProtocolTest buffer 支持
- **pofresh-protocol**: 通信协议实现
- **pofresh-rpc**: 远程过程调用框架
- **pofresh-scheduler**: 任务调度工具

### 官方插件 (`plugin/`)
- **pofresh-globalchannel-plugin**: 全局频道管理
- **pofresh-http**: HTTP 服务器集成
- **pofresh-status-plugin**: 服务器状态监控

## 标准包布局

每个包遵循以下结构：
```
package-name/
├── lib/              # 源代码
├── test/             # 包特定测试
├── bin/              # 可执行脚本（如适用）
├── template/         # 模板（用于 CLI 包）
├── package.json      # 包配置
├── README.md         # 包文档
└── index.js          # 包入口点
```

## 配置文件

### 根级别
- **package.json**: 工作区配置和脚本
- **pnpm-workspace.yaml**: 工作区包定义
- **turbo.json**: 构建系统配置
- **.eslintrc.js**: 代码检查规则
- **.prettierrc**: 代码格式化规则
- **vitest.config.js**: 测试配置

### 代码质量
- 测试位于每个包内的 `test/` 目录
- 为 `lib/` 目录生成覆盖率报告
- 代码检查应用于 `packages/` 和 `plugin/` 目录
- 格式化应用于包和插件中的所有 JavaScript 文件

## 开发工作流

1. **根命令**: 从项目根目录运行工作区范围的操作
2. **包隔离**: 每个包都可以独立测试和构建
3. **共享配置**: ESLint、Prettier 和 Vitest 配置是共享的
4. **插件架构**: 插件扩展核心功能而不修改核心包