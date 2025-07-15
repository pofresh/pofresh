---
title: "创建第一个聊天服务器"
description: "从零开始创建一个支持实时聊天的游戏服务器，学习基本的Pofresh概念"
level: "beginner"
estimatedTime: "30分钟"
technologies: ["Node.js", "WebSocket", "Pofresh"]
prerequisites: ["已安装Node.js 16+", "已安装Pofresh CLI"]
githubUrl: "https://github.com/pofresh/tutorial-chat-server"
demoUrl: "https://chat-demo.pofresh.dev"
---

# 创建第一个聊天服务器

本教程将带你从零开始创建一个支持实时聊天的游戏服务器，通过这个项目你将学习到Pofresh的基本概念和使用方法。

## 项目目标

我们将创建一个简单的聊天室应用，支持以下功能：
- 用户加入/离开聊天室
- 实时消息广播
- 用户列表显示
- 简单的用户认证

## 步骤1：创建项目

首先，使用Pofresh CLI创建一个新的项目：

```bash
pofresh init chat-server
cd chat-server
```

## 步骤2：配置服务器

编辑 `config/servers.json` 文件，配置聊天服务器：

```json
{
  "development": {
    "chat-server": [
      {"id": "chat-server-1", "host": "127.0.0.1", "port": 3050, "clientPort": 3050}
    ]
  }
}
```

## 步骤3：创建聊天处理器

创建 `app/servers/chat/handler/chatHandler.js` 文件：

```javascript
module.exports = function(app) {
  return new ChatHandler(app);
};

var ChatHandler = function(app) {
  this.app = app;
};

ChatHandler.prototype.send = function(msg, session, next) {
  var channelService = this.app.get('channelService');
  var channel = channelService.getChannel('pofresh', false);
  
  if (!channel) {
    return next(new Error('Channel not found'));
  }
  
  var username = session.get('username');
  var content = msg.content;
  
  var message = {
    from: username,
    content: content,
    timestamp: Date.now()
  };
  
  channel.pushMessage('onChat', message);
  
  next(null, {code: 200});
};

ChatHandler.prototype.add = function(msg, session, next) {
  var channelService = this.app.get('channelService');
  var channel = channelService.getChannel('pofresh', true);
  
  var username = msg.username;
  var sid = session.frontendId;
  var uid = msg.username;
  
  if (!channel.getMember(uid)) {
    channel.add(uid, sid);
    session.set('username', username);
    session.pushAll();
  }
  
  var users = [];
  channel.getMembers().forEach(function(uid) {
    users.push({username: uid});
  });
  
  next(null, {code: 200, users: users});
};
```

## 步骤4：创建远程方法

创建 `app/servers/chat/remote/chatRemote.js` 文件：

```javascript
module.exports = function(app) {
  return new ChatRemote(app);
};

var ChatRemote = function(app) {
  this.app = app;
};

ChatRemote.prototype.kick = function(uid, sid, cb) {
  var channelService = this.app.get('channelService');
  var channel = channelService.getChannel('pofresh', false);
  
  if (!channel) {
    return cb();
  }
  
  channel.leave(uid, sid);
  cb();
};
```

## 步骤5：配置路由

编辑 `app/servers/chat/connector.json` 文件：

```json
{
  "connector": [
    {
      "handler": "chatHandler",
      "remote": "chatRemote"
    }
  ]
}
```

## 步骤6：创建客户端

创建 `public/index.html` 文件：

```html
<!DOCTYPE html>
<html>
<head>
    <title>Pofresh Chat Demo</title>
    <script src="https://cdn.jsdelivr.net/npm/pomelo-jsclient@1.0.0/lib/pomelo-client.js"></script>
</head>
<body>
    <h1>Pofresh Chat Demo</h1>
    <div id="login">
        <input type="text" id="username" placeholder="Enter username">
        <button onclick="login()">Login</button>
    </div>
    
    <div id="chat" style="display:none">
        <div id="messages"></div>
        <input type="text" id="message" placeholder="Enter message">
        <button onclick="send()">Send</button>
    </div>

    <script>
        var pomelo = window.pomelo;
        var username = '';

        function login() {
            username = document.getElementById('username').value;
            if (!username) {
                alert('Please enter username');
                return;
            }

            pomelo.init({
                host: '127.0.0.1',
                port: 3050
            }, function() {
                pomelo.request('connector.entryHandler.entry', {
                    username: username
                }, function(data) {
                    document.getElementById('login').style.display = 'none';
                    document.getElementById('chat').style.display = 'block';
                    
                    pomelo.on('onChat', function(data) {
                        var messages = document.getElementById('messages');
                        messages.innerHTML += `<p><strong>${data.from}:</strong> ${data.content}</p>`;
                    });
                });
            });
        }

        function send() {
            var content = document.getElementById('message').value;
            if (!content) {
                return;
            }

            pomelo.request('chat.chatHandler.send', {
                content: content
            }, function(data) {
                document.getElementById('message').value = '';
            });
        }
    </script>
</body>
</html>
```

## 步骤7：启动服务器

```bash
pofresh start
```

## 测试应用

1. 打开浏览器访问 `http://localhost:3050`
2. 输入用户名并登录
3. 在多个浏览器窗口中打开页面，测试实时聊天功能

## 项目总结

通过本教程，你学习了：
- 如何使用Pofresh创建游戏服务器
- 如何处理客户端连接和消息
- 如何使用频道系统进行消息广播
- 如何创建处理器和远程方法

## 下一步

你可以继续扩展这个项目：
- 添加用户认证和权限管理
- 实现私聊功能
- 添加聊天室管理
- 集成数据库存储聊天记录
- 添加表情和图片支持

## 完整代码

完整代码可以在 [GitHub](https://github.com/pofresh/tutorial-chat-server) 上找到，包含更多高级功能和最佳实践。