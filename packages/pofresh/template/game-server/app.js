const pofresh = require('pofresh');

/**
 * Init app for client.
 */
const app = pofresh.createApp();
app.set('name', '$');

// app configuration
app.configure('production|development', 'connector', () => {
    app.set('connectorConfig', {
        connector: pofresh.connectors.hybridconnector,
        heartbeat: 3,
        useDict: true,
        useProtobuf: true
    });
});

// start app
app.start();

process.on('uncaughtException', err => {
    console.error(' Caught exception: ' + err.stack);
});
