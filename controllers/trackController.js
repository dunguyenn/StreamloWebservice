var Track = require('../models/trackModel.js');
var User = require('../models/userModel.js');
var mongoose = require('mongoose');
var fs = require('fs');
var grid = require('gridfs-stream');
var conn = mongoose.connection;
grid.mongo = mongoose.mongo;

// TODO support seeking requests from clientside
exports.getTrackStreamByGridFSId = function(req, res) {
  var trackId = req.params.trackId;
  var gfs = grid(conn.db);

  gfs.findOne({
    _id: trackId
  }, function(err, file) {
    if (err) {
      res.json(err);
    } else {
      var mime = 'audio/mp3';
      res.set('Content-Type', mime);
      var read_stream = gfs.createReadStream(file);
      read_stream.pipe(res);
    }
  });
};

exports.getTracksByTitle = (req, res) => {
  let response = {};
  var perPage = 5
  var page = Math.max(0, req.query.page);

  var trackTitle = req.query.q;
  var query = Track.find({
    title: trackTitle
  });

  query.sort({
      numPlays: 'desc'
    })
    .limit(perPage)
    .skip(perPage * page)
    .exec((err, results) => {
      if (err) {
        res.sendStatus(500);
      } else {
        response.tracks = results;
        getNumberOfTracksByTitle(trackTitle, (err, results) => {
          if (err) {
            res.sendStatus(500);
          } else {
            response.numMatchingTracks = results;
            res.json(response);
          }
        });
      }
    });
};

let getNumberOfTracksByTitle = (trackTitle, cb) => {
  let query = Track.count({
    title: trackTitle
  });

  query.exec((err, results) => {
    if (err) {
      cb(err);
    } else {
      cb(null, results);
    }
  });
};

exports.getTracksByUploaderId = function(req, res) {
  var reqUploaderId = req.params.uploaderId;

  var query = Track.find({
    uploaderId: reqUploaderId
  });

  query.limit(5)
    .exec(function(err, results) {
      if (err)
        res.sendStatus(500);
      else
        res.json(results);
    })
};

exports.getTrackByURL = function(req, res) {
  var trackURL = req.params.trackURL;
  var query = Track.findOne({
    trackURL: trackURL
  });

  query.exec(function(err, results) {
    if (err)
      res.sendStatus(500);
    else
      res.json(results);
  });
};

exports.getChartOfCity = function(req, res) {
  var requestedCity = req.params.city;
  var query = Track.find({
    city: requestedCity
  });

  query.sort({
      numPlays: 'desc'
    })
    .limit(10)
    .exec(function(err, results) {
      if (err)
        res.sendStatus(500);
      else
        res.json(results);
    });
};

exports.postTrack = function(req, res) {
  var uploadedFileId;

  var fileName = req.body.title;
  var uploderId = req.body.uploaderId;

  var filePath = req.file.path;
  var filetype = req.file.mimetype;

  var gfs = grid(conn.db);

  // Streaming to gridfs
  // Filename to store in mongodb
  var writestream = gfs.createWriteStream({
    filename: fileName,
    content_type: 'audio/mp3'
  });
  fs.createReadStream(filePath).pipe(writestream);

  writestream.on('close', function(file) {
    uploadedFileId = file._id;
    console.log(file.filename + 'Written To DB');

    var entry = new Track({
      title: req.body.title,
      genre: req.body.genre,
      city: req.body.city,
      trackURL: req.body.trackURL,
      dateUploaded: req.body.dateUploaded,
      uploaderId: req.body.uploaderId,
      description: req.body.description,
      trackBinary: uploadedFileId
    });

    entry.save(function(err) { // Attempt to save track
      if (err) { // In event of failed track save remove gridfs file
        gfs.remove({
          _id: uploadedFileId
        }, function(gfserr) {
          if (gfserr) {
            console.log("error removing gridfs file");
          }
          console.log('Removed gridfs file after unsuccessful db update');
        });
        console.log(err);
        fs.unlink(filePath);
        res.sendStatus(500);
      } else { // In event of sucessful track save add uploaded gridfs trackId to uploaders uploaded files object
        var query = User.findByIdAndUpdate(
          uploderId, {
            $push: {
              "uploadedTracks": {
                uploadedTrackId: uploadedFileId
              }
            }
          }, {
            safe: true,
            upsert: true,
            new: true
          },
          function(gfserr, model) {
            if (gfserr) { // In event of failed query remove gridfs file
              gfs.remove({
                _id: uploadedFileId
              }, function(gfserr) {
                if (gfserr) {
                  console.log("error removing gridfs file");
                }
                console.log('Removed gridfs file after unsuccessful db update');
              });
              fs.unlink(filePath);
              res.sendStatus(500);
            }
          }
        );

        // Also increment number of uploaded tracks on uploder
        query = User.findByIdAndUpdate(
          uploderId, {
            $inc: {
              "numberOfTracksUploaded": 1
            }
          }, {
            safe: true,
            upsert: true,
            new: true
          },
          function(gfserr, model) {
            if (gfserr) { // In event of failed query remove gridfs file
              gfs.remove({
                _id: uploadedFileId
              }, function(gfserr) {
                if (gfserr) {
                  console.log("error removing gridfs file");
                }
                console.log('Removed gridfs file after unsuccessful db update');
              });
              fs.unlink(filePath);
              res.sendStatus(500);
            }
          }
        );
        fs.unlink(filePath);
        res.sendStatus(200);
      }
    });
  });
};

// TODO updating track name
exports.updateTrackTitleByTrackURL = function(req, res) {
  var trackURL = req.params.trackURL;
  var updatedTitle = req.body.title;
  var query = Track.update({
    trackURL: trackURL
  }, {
    title: updatedTitle
  });

  query.exec(function(err, results) {
    if (err)
      res.sendStatus(500);
    else
      res.json("Track Title Updated");
  });
};

exports.deleteTrackByTrackURL = function(req, res) {
  var trackURL = req.params.trackURL;
  var query = Track.remove({
    trackURL: trackURL
  });
  query.exec(function(err, results) {
    if (err)
      res.sendStatus(500);
    else
      res.json("Track deleted");
  });
};

// Add comment ot track by track URL
exports.addCommentToTrackByTrackURL = function(req, res) {
  var com = {
    user: req.body.user,
    datePosted: req.body.date,
    body: req.body.body
  }
  var trackURL = req.params.trackURL;

  var query = Track.findOneAndUpdate({
      trackURL: trackURL
    }, {
      $push: {
        "comments": com
      }
    }, {
      safe: true,
      upsert: false,
      new: false
    },
    function(err, model) {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      }
    }
  );
  res.sendStatus(200);
};
