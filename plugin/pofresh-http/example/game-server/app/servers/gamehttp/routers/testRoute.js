module.exports = (_app, express, plugin) => {
    const router = express.Router();
    if (plugin.useSSL) {
        router.get('/testHttps', (_req, res, next) => {
            res.set('resp', 'https success');
            next();
        });
    } else {
        router.get('/testHttp', (_req, res, next) => {
            res.set('resp', 'http success');
            next();
        });
    }
    return router;
};
