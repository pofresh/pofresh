#!/bin/bash

echo "🚀 启动 Pofresh 官网和文档系统..."
echo "📁 当前目录: $(pwd)"

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ 未找到Node.js，请先安装Node.js 16+"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

echo "🔧 启动开发服务器..."
echo "🌐 访问地址: http://localhost:4321"
echo "📖 文档地址: http://localhost:4321/docs"
echo "🎓 教程地址: http://localhost:4321/tutorials"
echo "📰 博客地址: http://localhost:4321/blog"

npm run dev -- --host 0.0.0.0 --port 4321