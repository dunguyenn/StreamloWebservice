var Track = require('../models/trackModel.js');
var User = require('../models/userModel.js');
var _ = require('lodash');
var fs = require('fs');
var mongoose = require('mongoose');
var mongodb = require('mongodb');
var ObjectID = require('mongodb').ObjectID;

exports.getTrackStreamByGridFSId = function(req, res) {
  let trackId;
  if(!ObjectID.isValid(req.params.trackId)) {
    res.status(400).json({ message: "Invalid trackID" });
  } else {
    trackId = new ObjectID(req.params.trackId);
    
    let db = mongoose.connection.db;
    var bucket = new mongodb.GridFSBucket(db, {
      bucketName: 'fs'
    });
    
    res.set('content-type', 'audio/mp3');
    res.set('accept-ranges', 'bytes');
    
    // bucket.openDownloadStream Returns a readable stream (GridFSBucketReadStream) for streaming file data from GridFS.
    var downloadStream = bucket.openDownloadStream(trackId);
    
    downloadStream.on('data', (chunk) => {
      res.write(chunk);
    });
    
    downloadStream.on('error', () => {
      res.sendStatus(404);
    });
    
    downloadStream.on('end', () => {
      res.end();
    });
  }
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
      } else if (_.isEmpty(results)) {
        res.sendStatus(404)
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
    else if (_.isEmpty(results)) {
      res.status(404).json({
        message: "No track found with this trackURL"
      });
    } else {
      res.json(results);
    }
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
  //var uploadedFileId;
  let db = req.app.locals.db;
  
  var bucket = new mongodb.GridFSBucket(db, {
    bucketName: 'songs'
  });

  var filePath = req.file.path;
  
  fs.createReadStream(filePath)
    .pipe(bucket.openUploadStream(req.body.title))
    .on('error', function(error) {
      res.sendStatus(500)
    })
    .on('finish', function() {
      res.sendStatus(200)
    });
    
  //   var uploadStream = bucket.openUploadStream(filePath);
  //   
  //   // emitter.once(eventName, listener)
  //   // Adds a one time listener function for the event named eventName. The next time eventName is triggered, 
  //   // this listener is removed and then invoked.  
  //   uploadStream.once('finish', function() {
  //     console.log("finish")
  //     res.sendStatus(200);
  //   });
  //   
  //   uploadStream.once('error', function() {
  //     console.log("error")
  //     res.sendStatus(500);
  //   });


  /*
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

    var entry = new Track({
      title: req.body.title,
      genre: req.body.genre,
      city: req.body.city,
      trackURL: req.body.trackURL,
      dateUploaded: req.body.dateUploaded,
      uploaderId: req.body.uploaderId,
      description: req.body.description,
      trackBinaryId: uploadedFileId
    });

    entry.save(function(err) { // Attempt to save track
      if (err) { // In event of failed track save remove gridfs file
        gfs.remove({
          _id: uploadedFileId
        }, function(gfserr) {
          if (gfserr) {
            console.log("error removing gridfs file");
          }
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
  */
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
    function(err) {
      if (err) {
        res.sendStatus(400);
      } else {
        res.sendStatus(200);
      }
    });
};
