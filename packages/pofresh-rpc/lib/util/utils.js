const Utils = {};

Utils.invokeCallback = cb => {
    if (typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};

Utils.applyCallback = (cb, args) => {
    if (typeof cb === 'function') {
        cb.apply(null, args);
    }
};

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
 * Utils check float
 *
 * @param  {Float}   float
 * @return {Boolean} true|false
 * @api public
 */
Utils.checkFloat = v => v === Number(v) && v % 1 !== 0;

/**
 * Utils check type
 *
 * @param  {String}   type
 * @return {Function} high order function
 * @api public
 */
Utils.isType = type => obj => ({}).toString.call(obj) === `[object ${type}]`;

/**
 * Utils check array
 *
 * @param  {Array}   array
 * @return {Boolean} true|false
 * @api public
 */
Utils.checkArray = Array.isArray || Utils.isType('Array');

/**
 * Utils check number
 *
 * @param  {Number}  number
 * @return {Boolean} true|false
 * @api public
 */
Utils.checkNumber = Utils.isType('Number');

/**
 * Utils check function
 *
 * @param  {Function}   func function
 * @return {Boolean}    true|false
 * @api public
 */
Utils.checkFunction = Utils.isType('Function');
/**
 * Utils check object
 *
 * @param  {Object}   obj object
 * @return {Boolean}  true|false
 * @api public
 */
Utils.checkObject = Utils.isType('Object');

/**
 * Utils check string
 *
 * @param  {String}   string
 * @return {Boolean}  true|false
 * @api public
 */
Utils.checkString = Utils.isType('String');

/**
 * Utils check boolean
 *
 * @param  {Object}   obj object
 * @return {Boolean}  true|false
 * @api public
 */
Utils.checkBoolean = Utils.isType('Boolean');

/**
 * Utils check bean
 *
 * @param  {Object}   obj object
 * @return {Boolean}  true|false
 * @api public
 */
Utils.checkBean = obj => obj?.$id && Utils.checkFunction(obj.writeFields) && Utils.checkFunction(obj.readFields);

Utils.checkNull = obj => !Utils.isNotNull(obj);

/**
 * Utils args to array
 *
 * @param  {Object}  args arguments
 * @return {Array}   array
 * @api public
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
 * Utils check is not null
 *
 * @param  {Object}   value
 * @return {Boolean}  true|false
 * @api public
 */
Utils.isNotNull = value => {
    if (value !== null && typeof value !== 'undefined') {
        return true;
    }
    return false;
};

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

const typeArray = ['', 'null', 'buffer', 'array', 'string', 'object', 'bean', 'boolean', 'float', 'number'];
const typeMap = {};
for (let i = 1; i <= typeArray.length; i++) {
    typeMap[typeArray[i]] = i;
}

Utils.typeArray = typeArray;

Utils.typeMap = typeMap;

Utils.getBearcat = () => require('bearcat');

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
