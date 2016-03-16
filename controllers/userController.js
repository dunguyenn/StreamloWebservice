var User = require('../models/userModel.js');


// TODO add search people functionality
exports.getUserByName = function(req, res) {
    var requestedUsername = req.params.userName;
    var query = User.find({ userName : requestedUsername });

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
