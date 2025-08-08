// remote service

module.exports = _context => ({
    echo(msg, data, cb) {
        // setTimeout(function() {
        // console.log('echo msg', msg);
        // console.log('echo data', data);
        cb(null, msg);
        // cb(null, msg, 'aaa' + Date.now());
        // }, 15000);
    }
});
