var Track = require('../models/trackModel.js');

// TODO add search tracks functionality
exports.getTracks = function(req, res) {
    var query = Track.find();
    query.sort({numPlays: 'desc'})
        .limit(10)
        .exec(function(err, results){
            if(err)
                res.status(500).send(err);
            else
                res.json(results);
        });
};

exports.getTracksByTitle = function(req, res) {
    var trackTitle = req.params.trackTitle;

    var query = Track.find({ title : trackTitle });
    console.log(req.params);
    query.sort({numPlays: 'desc'})
        .limit(10)
        .exec(function(err, results){
            if(err)
                res.status(500).send(err);
            else
                res.json(results);
        });
};

// TODO add search people functionality
exports.getPeopleByName = function(req, res) {

};


exports.create = function(req, res) {
    var entry = new Track({
        title: req.body.title
    });

    entry.save(); // Optional callback can be added to handle errors

    // Redirect to home page
    res.redirect(301, '/');
};
