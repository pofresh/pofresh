class LogFilter {
    before(_req, _res, next) {
        next();
    }

    after(_req, _res, next) {
        next();
    }
}

module.exports = () => new LogFilter();
