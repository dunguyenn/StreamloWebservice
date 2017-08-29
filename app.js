/**
 * Module dependencies.
 */
var express = require('express');
var errorHandler = require('errorhandler');
var mongoose = require('mongoose');
var bodyParser = require('body-parser')
var dotenv = require('dotenv');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var cors = require('cors');
var morgan = require('morgan')

/**
 * Load environment variables from .env file, where DB URIs etc are configured.
 */
dotenv.load();

/**
 * Connect to MongoDB.
 */
var db = mongoose.connect(process.env.MONGODB);
var conn = mongoose.connection;
mongoose.connection.on('error', function() {
  console.log('MongoDB Connection Error. Please make sure that MongoDB is running.');
  process.exit(1);
});

/**
 * Create Express server.
 */
var app = express();

/**
 * Express configuration.
 */

// app.use is Binding application-level middleware to an instance of the app object
app.set('port', process.env.PORT || 3001);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
})); // for parsing application/x-www-form-urlencoded
app.use(cookieParser());

/**
 * Error Handler.
 */
app.use(errorHandler());

/**
 * HTTP request logger middleware.
 */
app.use(morgan('dev'));

/**
 * Load Passport Strategys.
 */
const localSignupStrategy = require('./passport/local-signup');
const localLoginStrategy = require('./passport/local-login');
passport.use('local-signup', localSignupStrategy);
passport.use('local-login', localLoginStrategy);

/**
 * Routes configuration.
 */
var tracksRouter = require('./routes/tracks');
var protectedTracksRouter = require('./routes/protectedTracks');
var usersRouter = require('./routes/users');
var protectedUsersRouter = require('./routes/protectedUsers');
var authRouter = require('./routes/auth');
app.use('/tracks', tracksRouter);
app.use('/tracks', protectedTracksRouter);
app.use('/users', usersRouter);
app.use('/users', protectedUsersRouter);
app.use('/auth', authRouter);

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + process.env.PORT);
});
