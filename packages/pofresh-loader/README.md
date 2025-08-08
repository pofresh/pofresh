# pofresh-loader - loader module for pofresh

Load codes for pofresh based on the convention over configuration rules.

pofresh-rpc could load modules in batch but not load the sub-directory recursively.

+ Tags: node.js

## Regulation
Module name

Module would use the filename by default. For example: load ```lib/a.js``` and the return result would be: ```{a: require('./lib/a')}```

It would use the name if the module with a name property. For example

```javascript
a.js
exports.name = 'test';
```
the return result would be: ```{test: require('./lib/a')}```

Module definiation

If the module exported as a function, pofresh-loader would take it as a factory method and generate a new instance of module by calling the function. And it would return the module directly for other situation.

```javascript
module.exports = function(context) {
	return {};	// return some module instance
};
```

## Installation
```
npm install pofresh-loader
```

## Usage
``` javascript
const Loader = require('pofresh-loader');

// Load modules asynchronously
const res = await Loader.load('.');
console.log('res: %j', res);

// Load with context
const context = { app: 'myApp' };
const modules = await Loader.load('./modules', context);

// Load with reload option
const reloadedModules = await Loader.load('./modules', context, true);
```

## API
### Loader.load(path, context, isReload)
Load all modules in the path asynchronously.
#### Parameters
+ **path** {String} - Path to load modules from (required)
+ **context** {Object} - Context passed to factory functions (optional)
+ **isReload** {Boolean} - Whether to reload cached modules (optional, default: false)

#### Returns
+ **Promise<Object>** - Object containing loaded modules with their names as keys

#### Throws
+ **Error** - When path is invalid, not accessible, or not a directory
