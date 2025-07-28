# 测试目录结构

本目录包含了 pofresh-protobuf 的所有测试文件，采用了清晰的分层结构：

## 目录结构

```
tests/
├── fixtures/           # 测试数据和配置文件
│   ├── example.json    # 示例 protobuf 定义
│   ├── msg.json        # 消息定义
│   ├── protos.json     # 协议定义
│   ├── rootMsg.json    # 根消息定义
│   ├── rootMsgTC.js    # 根消息测试用例
│   ├── rootProtos.json # 根协议定义
│   └── testMsg.js      # 测试消息
├── integration/        # 集成测试
│   ├── protobuf.test.js    # protobuf 集成测试
│   └── root-msg.test.js    # 复杂消息集成测试
└── unit/              # 单元测试
    ├── client/        # 客户端相关测试
    │   ├── encoder.test.js     # 客户端编码器测试
    │   ├── protobuf.test.js    # 客户端 protobuf 测试
    │   └── root-msg.test.js    # 客户端根消息测试
    ├── codec.test.js          # 编解码器测试
    └── string-buffer.test.js  # 字符串缓冲区性能测试
```

## 测试分类

### 单元测试 (Unit Tests)
- **codec.test.js**: 测试基础的编解码功能，包括 UInt32、SInt32 等数据类型的编码和解码
- **string-buffer.test.js**: 测试字符串处理的性能，比较不同字符串拼接方法的效率
- **client/**: 客户端相关的单元测试
  - **encoder.test.js**: 测试客户端编码器的浮点数、双精度数和 UTF8 字符串处理
  - **protobuf.test.js**: 测试客户端 protobuf 的基本功能
  - **root-msg.test.js**: 测试客户端复杂消息的处理

### 集成测试 (Integration Tests)
- **protobuf.test.js**: 测试完整的 protobuf 编码解码流程
- **root-msg.test.js**: 测试复杂嵌套消息的完整处理流程

### 测试数据 (Fixtures)
- 包含所有测试用到的配置文件、消息定义和测试用例数据
- 与测试逻辑分离，便于维护和复用

## 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行客户端测试
npm run test:client

# 监视模式运行测试
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage
```

## 工具脚本

```bash
# 生成 protobuf 定义文件
npm run generate:protos
```

## 技术栈

- **测试框架**: Vitest
- **断言库**: Vitest 内置的 expect
- **模块系统**: ES Modules
- **Node.js 环境**: 支持最新的 Node.js 特性