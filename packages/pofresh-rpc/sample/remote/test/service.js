// remote service

module.exports = function (_context) {
    return {
        echo: function (msg, data, cb) {
            // setTimeout(function() {
            // console.log('echo msg', msg);
            // console.log('echo data', data);
            cb(null, msg);
            // cb(null, msg, 'aaa' + Date.now());
            // }, 15000);
        }
    };
};
