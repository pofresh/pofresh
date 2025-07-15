# Pofresh 官网和文档

基于 Astro + Vue 构建的高性能游戏服务器框架 Pofresh 的官方网站和文档系统。

## 🚀 技术栈

- **框架**: [Astro](https://astro.build/) - 静态站点生成器
- **前端**: [Vue 3](https://vuejs.org/) - 渐进式JavaScript框架
- **样式**: [Tailwind CSS](https://tailwindcss.com/) - 实用优先的CSS框架
- **构建**: Vite - 快速构建工具
- **部署**: Vercel - 全球CDN部署

## 📁 项目结构

```
pofresh-website/
├── src/
│   ├── components/     # Astro组件
│   ├── content/       # 文档内容 (Markdown)
│   ├── layouts/       # 页面布局
│   ├── pages/         # 页面路由
│   └── styles/        # 全局样式
├── public/            # 静态资源
├── astro.config.mjs   # Astro配置
├── tailwind.config.mjs # Tailwind配置
└── package.json       # 项目依赖
```

## 🛠️ 开发指南

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:4321` 查看网站。

### 构建生产版本

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

## 📖 内容管理

### 文档内容

所有文档内容位于 `src/content/docs/` 目录，使用 Markdown 格式编写。

```markdown
---
title: "文档标题"
description: "文档描述"
category: "分类"
difficulty: "beginner" # beginner, intermediate, advanced
sidebar_position: 1
lastUpdated: 2024-01-15
author: "作者名"
tags: ["标签1", "标签2"]
---

# 文档内容
```

### 教程内容

教程内容位于 `src/content/tutorials/` 目录，结构类似文档内容。

### 博客内容

博客文章位于 `src/content/blog/` 目录，包含发布日期等信息。

## 🎨 自定义主题

### 颜色配置

在 `tailwind.config.mjs` 中配置主题颜色：

```javascript
colors: {
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    900: '#1e3a8a',
  },
}
```

### 字体配置

在 `src/components/BaseHead.astro` 中配置字体：

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

## 🚀 部署

### Vercel 部署

1. 推送代码到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置构建命令：
   - 构建命令：`npm run build`
   - 输出目录：`dist`

### 手动部署

```bash
npm run build
# 部署 dist 目录到静态托管服务
```

## 🔍 SEO 优化

### 元数据

每个页面都包含完整的 SEO 元数据：

- 页面标题和描述
- Open Graph 标签
- Twitter 卡片
- 结构化数据

### 站点地图

自动生成站点地图，支持搜索引擎索引。

## 🤝 贡献指南

### 添加新文档

1. 在 `src/content/docs/` 创建新的 Markdown 文件
2. 添加必要的元数据头部
3. 编写文档内容
4. 测试本地预览

### 添加教程

1. 在 `src/content/tutorials/` 创建新的 Markdown 文件
2. 包含完整的代码示例
3. 提供步骤说明

### 添加博客文章

1. 在 `src/content/blog/` 创建新的 Markdown 文件
2. 使用当前日期作为文件名前缀
3. 包含作者信息和标签

## 📊 性能优化

### 构建优化

- 自动代码分割
- 图片优化和懒加载
- 预加载关键资源
- 缓存策略配置

### 运行时优化

- 客户端路由预加载
- 渐进式增强
- 离线支持 (PWA)

## 🔧 开发工具

### 代码质量

```bash
# 代码检查
npm run lint

# 格式化代码
npm run format

# 类型检查
npm run type-check
```

### 调试工具

- 浏览器开发者工具
- Astro Dev Toolbar
- Vue DevTools

## 📞 支持

- **文档**: [官方文档](https://pofresh.dev/docs)
- **社区**: [GitHub Discussions](https://github.com/pofresh/pofresh/discussions)
- **问题反馈**: [GitHub Issues](https://github.com/pofresh/pofresh/issues)

## 📄 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。