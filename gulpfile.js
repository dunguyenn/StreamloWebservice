var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');

var config = {
  paths: {
    test: './test/*.js',
    js: [
      './controllers/*.js',
      './models/*.js',
      './routes/*.js',
      './app.js'
    ]
  }
};

gulp.task('mocha', function() {
  return gulp.src(config.paths.test, {
      read: false
    })
    .pipe(mocha({
      reporter: 'list'
    }))
    .on('error', gutil.log);
});

gulp.task('nodemon', function() {
  nodemon({
      script: 'app.js',
      ext: 'js',
      ignore: ['./node_modules/**']
    })

    .on('restart', function() {
      console.log('Restarting');
    });
});

gulp.task('watch-mocha', function() {
  gulp.run('mocha');
  gulp.watch(config.paths.js, ['mocha']);
});

gulp.task('default', ['nodemon', 'watch-mocha']);
