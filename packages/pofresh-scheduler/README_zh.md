# pofresh-scheduler

pofresh-scheduler 是一个 Node.js 的调度工具，其目的是提供一个高效的产品级调度模块，能够支持大量的作业调度。

作为一个调度工具，它支持两种类型的触发器：使用 JavaScript 对象的简单触发器和使用 Cron 时间字符串的 Cron 时间触发器。

## 安装

```
npm install pofresh-schedule
```

## 调度简单作业

简单作业将接收一个对象作为触发器，该对象包含三个属性：一个 JS 函数作为对象，以及一个作为作业参数的对象。

### 简单触发器示例

```javascript
// 在当前时间 10000ms 后触发，运行 10 次，间隔为 1000ms
const trigger1 = {
  start: Date.now() + 10000, // 开始时间，使用日期对象中的时间
  period: 1000,              // 触发间隔，精度为毫秒
  count: 10                  // 触发次数，在此情况下触发器将触发 10 次
}

// 立即触发，运行 10 次，间隔为 1000ms
const trigger2 = {
  period: 1000,
  count: 10
}

// 立即触发，永远运行，间隔为 1000ms
const trigger3 = {
  period: 1000
}

// 在当前时间 3000ms 后触发，仅运行一次
const trigger4 = {
  start: Date.now() + 3000
}

// 立即触发，仅运行一次
const trigger5 = {
}

// 非法！'count' 属性不能在没有 'period' 的情况下单独使用
const trigger6 = {
  count: 10
}
```

### 简单作业示例

```javascript
const schedule = require('pofresh-schedule');

const simpleJob = function(data) {
  console.log("运行作业: " + data.name);
}

schedule.scheduleJob({start: Date.now(), period: 3000, count: 10}, simpleJob, {name: 'simpleJobExample'});
```

## 调度 Cron 作业

Cron 作业是使用 cron 触发器的作业，它就像简单作业一样，只是使用 cron 触发器而不是简单触发器。

### Cron 作业示例

```javascript
const schedule = require('pofresh-schedule');

const cronJob = function(data) {
  console.log("运行作业: " + data.name);
}

schedule.scheduleJob("0 0/15 8 * * *", cronJob, {name: 'cronJobExample'});
```

### Cron 触发器语法

Cron 触发器有 7 个字段，格式非常类似于 Linux 中的 cronTab，只是在开头增加了一个秒字段。字段和边界如下：

```
*     *     *     *   *    *        要执行的命令
-     -     -     -   -    -
|     |     |     |   |    |
|     |     |     |   |    +----- 星期几 (0 - 6) (星期日=0)
|     |     |     |   +------- 月份 (1 - 12)
|     |     |     +--------- 日期 (1 - 31)
|     |     +----------- 小时 (0 - 23)
|     +------------- 分钟 (0 - 59)
+------------- 秒 (0 - 59)
```

### Cron 触发器示例

"0/2 0 8 * * 6"    每个星期六的 08:00:00、08:00:02、08:00:04... 触发
"0 30 10 1 4 *"     每年 4 月 1 日 10:30 触发
"15 15 15 10 10 *"  每年 10 月 10 日 15:15:15 触发

### 特殊字符

pofresh-schedule 允许三种特殊字符：'-'、'/' 和 ','。

- '-' 表示范围。例如，秒字段中的 1-3 表示第 1、2 和 3 秒
- '/' 表示增量。例如，秒字段中的 1/20 表示第 1、21 和 41 秒，1/2 表示每个奇数秒如 1、3、5...
- ',' 表示附加值。例如，秒字段中的 1, 10, 15 表示第 1、10 和 15 秒。您可以将 '-' 和 '/' 与 ',' 一起使用，例如，秒字段中的 11,20-22,0/2 表示第 11、21 和所有偶数秒

## 取消作业

```javascript
const schedule = require('pofresh-schedule');

const simpleJob = function() {
  console.log("运行简单作业");
}

// 添加一个简单作业并保存 ID
const id = schedule.scheduleJob({period: 1000}, simpleJob, {});

/**
 * 做一些其他事情
 */

// 取消作业
schedule.cancelJob(id);
```

当您取消一个作业时，它将立即停止调度并删除该作业。