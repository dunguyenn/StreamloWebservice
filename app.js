var express = require('express');
var mongoose = require('mongoose');

var db = mongoose.connect('mongodb://localhost/StreamloWebServiceDB');
var track = require('./models/trackModel');

var app = express();

var port =  process.env.port ||  3001;

app.get('/', function(req, res){
     res.send('Welcome to my API!');
});

app.listen(port, function(){
   console.log('Running on port: ' + port );
});
