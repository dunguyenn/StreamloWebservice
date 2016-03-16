var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser')

var tracksRouter = require('./routes/tracks');
var usersRouter = require('./routes/users');

var db = mongoose.connect('mongodb://localhost/StreamloWebServiceDB');
var track = require('./models/trackModel');

var app = express();
var port =  process.env.port ||  3001;

// Binding application-level middleware to an instance of the app object
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/tracks', tracksRouter);
app.use('/users', usersRouter);

app.get('/', function(req, res){
     res.send('Welcome to my API!');
});

app.listen(port, function(){
   console.log('Running on port: ' + port );
});
