const {src, series} = require('gulp');
const gulpClean = require('gulp-clean');
const shell = require('gulp-shell');
const gulpJshint = require('gulp-jshint');


const srcPath = ['test/manager/taskManager.js', 'test/filters/**/*.js',
    'test/remote/*.js', 'test/service/*.js', 'test/modules/*.js', 'test/util/*.js', 'test/*.js'];

function clean() {
    return src('coverage/*', {allowEmpty: true}).pipe(gulpClean());
}


function jshint() {
    return src('lib/*').pipe(gulpJshint()).pipe(gulpJshint.reporter('default'));
}

let paths = '';
srcPath.forEach(p => paths += p + ' ');
exports.default = series(clean, shell.task('nyc mocha ' + paths), jshint);