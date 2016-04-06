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
    /*
    var likedTracks = [];
    var track1 = { likedTrack: req.body.likedTrackId }
    var track2 = { likedTrack: req.body.likedTrackId2 }
    likedTracks.push(track1, track2);

    var followedUsers = []
    var user1 = { followedUser: req.body.followedUserId }
    var user2 = { followedUser: req.body.followedUserId2 }
    followedUsers.push(user1, user2);
    */

    var entry = new User({
        email: req.body.email,
        password: req.body.password,
        userURL: req.body.userURL,
        displayName: req.body.displayName,
        city: req.body.city
        /*
        likedTracks: likedTracks,
        followedUsers: followedUsers
        */
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

exports.addLikedTrackToUser = function(req, res) {

};
