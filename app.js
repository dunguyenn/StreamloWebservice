/**
 * Module dependencies.
 */
const express = require('express');
const errorHandler = require('errorhandler');
const mongoose = require('mongoose');
const bodyParser = require('body-parser')
const dotenv = require('dotenv');
const passport = require('passport');
const cors = require('cors');
const compression = require('compression');
const bluebird = require('bluebird')

/**
 * Load environment variables from .env file.
 * if there is a variable in the .env file which collides with one that already 
 * exists in your environment, then that variable will be skipped
 */
dotenv.config();

/**
 * Create Express server.
 */
var app = express();

/**
 * Connect Mongoose to MongoDB.
 */
let options = {
  useMongoClient: true,
  autoIndex: true, // Build indexes
  reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
  reconnectInterval: 500, // Reconnect every 500ms
  poolSize: 10, // Maintain up to 10 socket connections
  bufferMaxEntries: 0 // If not connected, return errors immediately rather than waiting for reconnect
};

mongoose.Promise = bluebird;
if(process.env.NODE_ENV == 'test') {
  mongoose.connect(process.env.MONGODBTEST, options);
} else {
  mongoose.connect(process.env.MONGODB, options);
}
mongoose.connection.on('error', () => {
  console.log('MongoDB Connection Error. Please make sure that MongoDB is running.');
  process.exit(1);
});

/**
 * Express configuration.
 */
 // app.use is Binding application-level middleware to an instance of the app object
app.set('port', process.env.PORT || 3001);
app.use(cors());
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
  extended: false
})); // for parsing application/x-www-form-urlencoded
app.use(errorHandler()); // Error Handler
app.use(compression());

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
var tracksRouter = require('./routes/publicTracks');
var protectedTracksRouter = require('./routes/protectedTracks');
var usersRouter = require('./routes/publicUsers');
var protectedUsersRouter = require('./routes/protectedUsers');
var authRouter = require('./routes/publicAuth');
app.use('/tracks', tracksRouter);
app.use('/tracks', protectedTracksRouter);
app.use('/users', usersRouter);
app.use('/users', protectedUsersRouter);
app.use('/auth', authRouter);

var server = app.listen(app.get('port'));

module.exports = server;