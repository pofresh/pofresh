const app = require('express')();
const serveStatic = require('serve-static');

const env = process.env.NODE_ENV || 'development';
if ('development' === env) {
  app.use(serveStatic(__dirname + '/public'));
} else {
  const oneYear = 31557600000;
  app.use(serveStatic(__dirname + '/public', { maxAge: oneYear }));
}

app.listen(3001, function() {
  console.log("Web server has started.\nPlease log on http://127.0.0.1:3001");
});
