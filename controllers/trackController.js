var Track = require('../models/trackModel.js');

exports.create = function(req, res) {
    var entry = new Track({
        title: req.body.title
    });

    entry.save(); // Optional callback can be added to handle errors

    // Redirect to home page
    res.redirect(301, '/');
};
