var User = require('../models/userModel.js');
var mongoose = require('mongoose');
var fs = require('fs');
var grid = require('gridfs-stream');
var conn = mongoose.connection;
grid.mongo = mongoose.mongo;

exports.getUserByName = function(req, res) {
    var perPage = 5
    var page = Math.max(0, req.query.page);
    var requestedUsername = req.query.q;

    var query = User.find({ displayName : requestedUsername });

    query.limit(5)
        .skip(perPage * page)
        .exec(function(err, results){
            if(err)
                res.sendStatus(500);
            else
                res.json(results);
        });
};

exports.getNumberOfPeopleByDisplayName = function(req, res) {
    var displayName = req.query.q;
    var query = User.count({ displayName : displayName });

    query.exec(function(err, results){
            if(err)
                res.sendStatus(500);
            else
                res.json(results);
        });
};

// TODO implement server side validation for signup form
function validateSignupForm(payload) {
    return true;
}

exports.createUserAccount = function(req, res) {
    if(validateSignupForm){
        var entry = new User({
            email: req.body.email,
            password: req.body.password,
            userURL: req.body.userURL,
            displayName: req.body.displayName,
            city: req.body.city
        });

        entry.save(function(err) {
            if(err){
                console.log(err);
                res.status(500).send(err);
            } else {
                res.sendStatus(200);
            }
        });
    }
};

// TODO check this is working
exports.addProfilePictureToUser = function(req, res) {
    var uploadedFileId;

    var fileName = req.body.userURL;
    var filePath = req.file.path;
    var filetype = req.file.mimetype;

    var gfs = grid(conn.db);

    // Streaming to gridfs
    // Filename to store in mongodb
    var writestream = gfs.createWriteStream({
        filename: fileName,
        content_type: 'image/jpeg'
    });
    fs.createReadStream(filePath).pipe(writestream);

    writestream.on('close', function (file) {
        uploadedFileId = file._id;
        console.log(file.filename + 'Written To DB');

        var query = User.update({ trackURL: req.body.userURL}, { profilePictureBinary: uploadedFileId} );

        query.exec(function(err) {
            if(err){
                gfs.remove({_id: uploadedFileId}, function (gfserr) {
                  if (gfserr){
                      console.log("error removing gridfs file");
                  }
                  console.log('Removed gridfs file after unsuccessful db update');
                });
                fs.unlink(filePath);
                res.status(500).send(err);
            } else {
                fs.unlink(filePath);
                res.sendStatus(200);
            }
        });
    });
};

exports.getUserByURL = function(req, res) {
    var userURL = req.params.userURL;
    var query = User.findOne({userURL: userURL});

    query.exec(function(err, results){
            if(err)
                res.sendStatus(500);
            else
                res.json(results);
        });
};

exports.getUserById = function(req, res) {
    var userId = req.params.userId;
    var query = User.findOne({_id: userId});

    query.exec(function(err, results){
            if(err)
                res.sendStatus(500);
            else
                res.json(results);
        });
};
