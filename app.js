/**
 * Module dependencies.
 */
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser')
var dotenv = require('dotenv');

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
app.use(bodyParser.json()); //// for parsing application/json
app.use(bodyParser.urlencoded({ extended: false })); // for parsing application/x-www-form-urlencoded

/**
 * Routes configuration.
 */
var tracksRouter = require('./routes/tracks');
var usersRouter = require('./routes/users');
app.use('/tracks', tracksRouter);
app.use('/users', usersRouter);



app.get('/', function(req, res){
     res.send('Welcome to my API!');
});

app.listen(app.get('port'), function(){
   console.log('Express server listening on port ' + app.get('port'));
});
