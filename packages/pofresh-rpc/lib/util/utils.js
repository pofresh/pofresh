/**
 * pofresh-rpc utilities module
 * Provides various utility functions for RPC operations
 */

const Utils = {};

/**
 * Invoke callback with arguments
 * @param {Function} cb - callback function
 * @param {...*} args - arguments to pass to callback
 */
Utils.invokeCallback = (cb, ...args) => {
    if (typeof cb === 'function') {
        cb.apply(null, args);
    }
};

/**
 * Apply callback with arguments array
 * @param {Function} cb - callback function
 * @param {Array} args - arguments array to pass to callback
 */
Utils.applyCallback = (cb, args) => {
    if (typeof cb === 'function') {
        cb.apply(null, args);
    }
};

/**
 * Get object class name
 * @param {Object} obj - object to get class name
 * @returns {string|undefined} class name or undefined
 */
Utils.getObjectClass = obj => {
    if (!obj) {
        return;
    }

    const constructor = obj.constructor;
    if (!constructor) {
        return;
    }

    if (constructor.name) {
        return constructor.name;
    }

    const str = constructor.toString();
    if (!str) {
        return;
    }

    let arr = null;
    if (str.charAt(0) === '[') {
        arr = str.match(/\[\w+\s*(\w+)\]/);
    } else {
        arr = str.match(/function\s*(\w+)/);
    }

    if (arr && arr.length === 2) {
        return arr[1];
    }
};

/**
 * Check if value is a float number
 * @param {*} v - value to check
 * @returns {boolean} true if float, false otherwise
 */
Utils.checkFloat = v => v === Number(v) && v % 1 !== 0;

/**
 * Create type checker function
 * @param {string} type - type name
 * @returns {Function} type checker function
 */
Utils.isType = type => obj => ({}).toString.call(obj) === `[object ${type}]`;

/**
 * Check if value is an array
 * @param {*} array - value to check
 * @returns {boolean} true if array, false otherwise
 */
Utils.checkArray = Array.isArray || Utils.isType('Array');

/**
 * Check if value is a number
 * @param {*} number - value to check
 * @returns {boolean} true if number, false otherwise
 */
Utils.checkNumber = Utils.isType('Number');

/**
 * Check if value is a function
 * @param {*} func - value to check
 * @returns {boolean} true if function, false otherwise
 */
Utils.checkFunction = Utils.isType('Function');

/**
 * Check if value is an object
 * @param {*} obj - value to check
 * @returns {boolean} true if object, false otherwise
 */
Utils.checkObject = Utils.isType('Object');

/**
 * Check if value is a string
 * @param {*} string - value to check
 * @returns {boolean} true if string, false otherwise
 */
Utils.checkString = Utils.isType('String');

/**
 * Check if value is a boolean
 * @param {*} obj - value to check
 * @returns {boolean} true if boolean, false otherwise
 */
Utils.checkBoolean = Utils.isType('Boolean');

/**
 * Check if value is a bean object
 * @param {*} obj - value to check
 * @returns {boolean} true if bean, false otherwise
 */
Utils.checkBean = obj => obj?.$id && Utils.checkFunction(obj.writeFields) && Utils.checkFunction(obj.readFields);

/**
 * Check if value is null
 * @param {*} obj - value to check
 * @returns {boolean} true if null, false otherwise
 */
Utils.checkNull = obj => !Utils.isNotNull(obj);

/**
 * Convert arguments to array
 * @param {ArrayLike} args - arguments object
 * @returns {Array} array copy of arguments
 */
Utils.toArray = args => {
    const len = args.length;
    const arr = new Array(len);

    for (let i = 0; i < len; i++) {
        arr[i] = args[i];
    }

    return arr;
};

/**
 * Check if value is not null
 * @param {*} value - value to check
 * @returns {boolean} true if not null, false otherwise
 */
Utils.isNotNull = value => {
    if (value !== null && typeof value !== 'undefined') {
        return true;
    }
    return false;
};

/**
 * Get type of object for serialization
 * @param {*} object - object to get type
 * @returns {number} type code
 */
Utils.getType = object => {
    if (object === null || typeof object === 'undefined') {
        return Utils.typeMap.null;
    }

    if (Buffer.isBuffer(object)) {
        return Utils.typeMap.buffer;
    }

    if (Utils.checkArray(object)) {
        return Utils.typeMap.array;
    }

    if (Utils.checkString(object)) {
        return Utils.typeMap.string;
    }

    if (Utils.checkObject(object)) {
        if (Utils.checkBean(object)) {
            return Utils.typeMap.bean;
        }

        return Utils.typeMap.object;
    }

    if (Utils.checkBoolean(object)) {
        return Utils.typeMap.boolean;
    }

    if (Utils.checkNumber(object)) {
        if (Utils.checkFloat(object)) {
            return Utils.typeMap.float;
        }

        if (Number.isNaN(object)) {
            return Utils.typeMap.null;
        }

        return Utils.typeMap.number;
    }
};

// Type mapping for serialization
const typeArray = ['', 'null', 'buffer', 'array', 'string', 'object', 'bean', 'boolean', 'float', 'number'];
const typeMap = {};
for (let i = 1; i <= typeArray.length; i++) {
    typeMap[typeArray[i]] = i;
}

Utils.typeArray = typeArray;
Utils.typeMap = typeMap;

/**
 * Get bearcat instance (dependency injection container)
 * @returns {Object} bearcat instance
 */
Utils.getBearcat = () => require('bearcat');

/**
 * Generate service mapping for RPC routing
 * @param {Object} services - services object
 * @returns {Array} [namespaceMap, serviceMap, methodMap, namespaceList, serviceList, methodList]
 */
Utils.genServicesMap = services => {
    const nMap = {}; // namespace
    const sMap = {}; // service
    const mMap = {}; // method
    const nList = [];
    const sList = [];
    const mList = [];

    let nIndex = 0;
    let sIndex = 0;
    let mIndex = 0;

    for (const namespace in services) {
        nList.push(namespace);
        nMap[namespace] = nIndex++;
        const s = services[namespace];

        for (const service in s) {
            sList.push(service);
            sMap[service] = sIndex++;
            const m = s[service];

            for (const method in m) {
                const func = m[method];
                if (Utils.checkFunction(func)) {
                    mList.push(method);
                    mMap[method] = mIndex++;
                }
            }
        }
    }

    return [nMap, sMap, mMap, nList, sList, mList];
};

module.exports = Utils;
