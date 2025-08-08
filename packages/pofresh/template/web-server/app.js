const app = require('express')();
const serveStatic = require('serve-static');

const env = process.env.NODE_ENV || 'development';
if (env === 'development') {
    app.use(serveStatic(`${__dirname}/public`));
} else {
    const oneYear = 31_557_600_000;
    app.use(serveStatic(`${__dirname}/public`, { maxAge: oneYear }));
}

app.listen(3001);
