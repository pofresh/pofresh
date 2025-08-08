const pofresh = require('pofresh');
const httpTool = require('../../');
const path = require('path');

/**
 * Init app for client.
 */
const app = pofresh.createApp();
app.set('name', 'example');

// app configuration
app.configure('development', 'gamehttp', () => {
    app.loadConfig('httpConfig', path.join(app.getBase(), 'config/http.json'));
    app.use(httpTool, {
        httpComponent: app.get('httpConfig').gamehttp
    });
    // need put the certificate in config
    // app.use(httpTool, {
    //  httpComponent: app.get('httpConfig').gamehttps,
    // });

    httpTool.filter(require('./app/filters/log')());
    httpTool.afterFilter((_req, res) => {
        res.send(res.get('resp'));
    });
});
// start app
app.start();

process.on('uncaughtException', _err => {});
