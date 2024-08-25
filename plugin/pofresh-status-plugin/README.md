pofresh-status-plugin
====================

pofresh-status-plugin is a plugin for pofresh, it can be used in pofresh(>=2.0.0).

pofresh-status-plugin provides global status service for pofresh, which uses persistent storage to save users information.

##Installation

```
npm install pofresh-status-plugin
```

##Usage

```
var status = require('pofresh-status-plugin');

app.use(status, {status: {
  host: '127.0.0.1',
  port: 6379
}});

```

##API

###getSidsByUid(uid, cb)
get frontend server id by user id
####Arguments
+ uid - user id
+ cb - callback function

####Return
+ err - error
+ list - array of frontend server ids

###getStatusByUid(uid, cb)
####Arguments
+ uid - user id
+ cb - callback function

####Return
+ err - error
+ status - boolean, true if user is online (at least one session with a frontend) or false otherwise

###getStatusByUids(uids, cb)
####Arguments
+ uids - array of user ids
+ cb - callback function

####Return
+ err - error
+ statuses - object with uid as keys and boolean as value, true if user is online (at least one session with a frontend) or false otherwise

###pushByUids(uids, route, msg, cb)
####Arguments
+ uids - array of user ids
+ route - route string
+ msg - messages would be sent to clients
+ cb - callback function

####Return
+ err - error
+ fails - array of failed to send user ids

##Notice

status plugin use redis as a default persistent storage, you can change it with your own implementation. 

```
var status = require('pofresh-status-plugin');
var mysqlStatusManager = require('./mysqlStatusManager');

app.use(status, {status: {
  host: '127.0.0.1',
  port: 6379,
  channelManager: mysqlStatusManager
}});

```
in >=0.0.3 version add cleanOnStartUp option, when you enable this option, status plugin would clean up the old data with the given prefix string.

```
app.use(status, {status: {
  host: '127.0.0.1',
  port: 6379,
  cleanOnStartUp: true
}});

```
