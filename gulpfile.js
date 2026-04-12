var gulp = require('gulp');
var less = require('gulp-less');
var cleanCSS = require('gulp-clean-css');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var browserSync = require('browser-sync').create();

// Compile LESS files
function compileLess() {
    return gulp.src('less/freelancer.less')
        .pipe(less())
        .pipe(gulp.dest('css'))
        .pipe(browserSync.stream());
}

// Minify compiled CSS
function minifyCss() {
    return gulp.src('css/freelancer.css')
        .pipe(cleanCSS({ compatibility: '*' }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('css'))
        .pipe(browserSync.stream());
}

// Minify JS
function minifyJs() {
    return gulp.src('js/freelancer.js')
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('js'))
        .pipe(browserSync.stream());
}

// BrowserSync
function serve(done) {
    browserSync.init({
        server: { baseDir: '' }
    });
    done();
}

// Watch files
function watchFiles() {
    gulp.watch('less/*.less', gulp.series(compileLess, minifyCss));
    gulp.watch('js/freelancer.js', minifyJs);
    gulp.watch('*.html').on('change', browserSync.reload);
}

// Build task
var build = gulp.series(compileLess, gulp.parallel(minifyCss, minifyJs));

// Dev task
var dev = gulp.series(build, serve, watchFiles);

exports.less = compileLess;
exports.css = gulp.series(compileLess, minifyCss);
exports.js = minifyJs;
exports.dev = dev;
exports.default = build;
