var User = require('../models/userModel.js');


// TODO add search people functionality
exports.getUserByName = function(req, res) {
    var requestedUsername = req.query.q;
    var query = User.find({ displayName : requestedUsername });

    query.limit(10)
        .exec(function(err, results){
            if(err)
                res.status(500).send(err);
            else
                res.json(results);
        });
};

exports.getNumberOfPeopleByDisplayName = function(req, res) {
    var displayName = req.query.q;
    var query = User.count({ displayName : displayName });

    query.exec(function(err, results){
            if(err)
                res.status(500).send(err);
            else
                res.json(results);
        });
};

exports.createUserAccount = function(req, res) {
    var entry = new User({
        email: req.body.email,
        password: req.body.password,
        userURL: req.body.userURL,
        displayName: req.body.displayName,
        city: req.body.city
    });

    entry.save(function(err) {
        if(err){
            var errMsg = 'Error creating user ' + err;
            res.send(errMsg);
        } else {
            res.redirect(301, '/');
        }
    });
};
