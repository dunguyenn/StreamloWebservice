var User = require('../models/userModel.js');
var mongoose = require('mongoose');
var conn = mongoose.connection;

exports.signup = function(req, res) {
    console.log(req.body);
    res.sendStatus(200);
};

exports.createAccount = function(req, res) {
    console.log(req.body);
    res.sendStatus(200);
}
