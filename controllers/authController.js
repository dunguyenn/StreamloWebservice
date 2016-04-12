var User = require('../models/userModel.js');
var mongoose = require('mongoose');
var conn = mongoose.connection;
var mongodb = require('mongodb').MongoClient; // TODO remove once mongoose workin also from NPM package

exports.signUp = function(req, res) {
    console.log(req.body);

    var url = 'mongodb://localhost:27017/test';
    mongodb.connect(url, function(err, db) {
        var collection = db.collection('passportusers');
        var user = {
            username: req.body.userName,
            password: req.body.password
        };

        collection.insert(user, function(err, results) {
            // Passport middleware adds this login function to req object
            req.login(results.ops[0], function() {
                console.log(req.session);
                res.json(req.user);
            });
        });
    });
};
