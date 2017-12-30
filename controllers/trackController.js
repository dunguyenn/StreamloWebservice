const Track = require('../models/trackModel.js');
const User = require('../models/userModel.js');
const _ = require('lodash');
const moment = require('moment');
const validator = require('validator');
const fs = require('fs');
const mongoose = require('mongoose');
const mongodb = require('mongodb');
const ObjectID = require('mongodb').ObjectID;
const { Readable } = require('stream');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fields: 7, fileSize: 6000000, files: 1, parts: 8 }});
const logger = require('winston');

exports.getTrackStreamByGridFSId = function(req, res) {
  let trackId;
  if(!ObjectID.isValid(req.params.trackId)) {
    res.status(400).json({ message: "Invalid trackID" });
  } else {
    trackId = new ObjectID(req.params.trackId);
    
    let db = mongoose.connection.db;
    var bucket = new mongodb.GridFSBucket(db, {
      bucketName: 'trackBinaryFiles'
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
            response.total = results;
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
  if(!ObjectID.isValid(req.params.uploaderId)) {
    return res.status(400).json({ message: "Invalid trackID" });
  } else {
    var reqUploaderId = req.params.uploaderId;

    var query = Track.find({
      uploaderId: reqUploaderId
    });

    query.limit(5)
      .exec(function(err, results) {
        if (err) {
          res.sendStatus(500);
        } else if (_.isEmpty(results)) {
          res.sendStatus(404);
        } else {
          res.json(results);
        }
      });
    }
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
  
  // Create instance of mongoose Track model to perform city name validation against
  var trackToBeValidated = new Track();
  trackToBeValidated.city = requestedCity
  trackToBeValidated.validate(function(error) {
    if(error.errors.city) {
      res.status(400).json({ message: "Invalid city name"});
    } else {
      var query = Track.find({
        city: requestedCity
      });

      query.sort({
          numPlays: 'desc'
        })
        .limit(10)
        .exec(function(err, results) {
          if (err) res.sendStatus(500);
          else if(_.isEmpty(results)) {
            res.status(200).json({ message: "No tracks found for this city"});
          } else {
            res.status(200).json(results);
          }
      });
    }
  });  
};

function validatePostTrackForm(fields, file) {
  let title = fields.title;
  let genre = fields.genre;
  let city = fields.city;
  let trackURL = fields.trackURL;
  let dateUploaded = fields.dateUploaded;
  let uploaderId = fields.uploaderId;
  let description = fields.description;
  let track = file;
  
  if (!title || typeof title !== 'string') {
    return { success: false, message: "No track title in request body." }
  }
  if (!genre || typeof genre !== 'string') {
    return { success: false, message: "No genre in request body." }
  }
  if (!city || typeof city !== 'string') {
    return { success: false, message: "No city in request body." }
  }
  if (!trackURL || typeof trackURL !== 'string') {
    return { success: false, message: "No trackURL in request body." }
  } else if (!validator.isURL(trackURL, { require_tld: false })) {
    return { success: false, message: "Invalid trackURL in request body." }
  }
  if (!dateUploaded || typeof dateUploaded !== 'string') {
    return { success: false, message: "No dateUploaded in request body." }
  } else if(!moment(dateUploaded, moment.ISO_8601).isValid()) {
    logger.warn('Invalid dateUploaded in request body');
    return { success: false, message: "Invalid dateUploaded in request body." }
  } else if(moment(dateUploaded).isBefore(moment(), 'minute')) {
    return { success: false, message: "Date invalid, it is more then thirty minutes before upload date." }
  }
  if (!uploaderId || typeof uploaderId !== 'string') {
    return { success: false, message: "No uploaderId in request body." }
  }
  if (!description || typeof description !== 'string') {
    return { success: false, message: "No description in request body." }
  }
  if (!track || typeof track !== 'object') {
    return { success: false, message: "No track in request body." }
  }
  
  return { success: true };
}

exports.postTrack = (req, res) => {
  upload.single('track')(req, res, (err) => {
    if(err) {
      return res.status(400).json({ message: 'Error uploading your track' });
    }
    const validationResult = validatePostTrackForm(req.body, req.file);
    if (!validationResult.success) {
      return res.status(400).json({
        message: validationResult.message
      });
    }
    
    let trackTitle = req.body.title;
    let uploderId = req.body.uploaderId;

    // Covert buffer to Readable Stream
    const readableTrackStream = new Readable();
    readableTrackStream.push(req.file.buffer);
    readableTrackStream.push(null);
    
    let db = mongoose.connection.db;
    let bucket = new mongodb.GridFSBucket(db, {
      bucketName: 'trackBinaryFiles'
    });

    let uploadStream = bucket.openUploadStream(trackTitle, { contentType: 'audio/mp3' });
    let trackGridFSId = uploadStream.id;
    readableTrackStream.pipe(uploadStream);

    uploadStream.on('error', () => {
      res.status(500).json({ message: "Error uploading file" });
    });

    uploadStream.on('finish', () => {
      var track = new Track({
        title: req.body.title,
        genre: req.body.genre,
        city: req.body.city,
        trackURL: req.body.trackURL,
        dateUploaded: req.body.dateUploaded,
        uploaderId: req.body.uploaderId,
        description: req.body.description,
        trackBinaryId: trackGridFSId
      });
      
      track.save(function(err, track) { // Attempt to save track
        if (err) { // In event of failed track save remove gridfs file
          bucket.delete(trackGridFSId);
          switch(err.message) {
            case "No User associated with uploaderID":
              res.status(400).json({ message: "No User account associated with uploaderID" });
              break;
            default:
              res.status(500).json({ message: "Error uploading file" });
          }
        } else { // If track model saves, update uploaders user model
          User.findByIdAndUpdate(
            uploderId, {
              $push: {
                "uploadedTracks": {
                  uploadedTrackId: trackGridFSId,
                  trackID: track._id
                }
              },
              $inc: {
                "numberOfTracksUploaded": 1
              }
            },
            function(err) {
              if (err) { // If uploaders user model fails to update, remove uploaded track from gridfs
                bucket.delete(trackGridFSId);
                res.status(500).json({ message: "Error uploading file" });
              }
            }
          );        
          let message = {
            message: "File uploaded successfully",
            trackBinaryId: track.id
          }
          res.status(201).json(message);
        }
      });
    });
  });
};

exports.updateTrackTitleByTrackURL = function(req, res) {
  var trackURL = req.params.trackURL;
  var newTitle = req.body.newTitle;
  
  Track.findOneAndUpdate({ trackURL: trackURL }, { title: newTitle }, { runValidators: true },  (err, results) => {
    if (err) {
      switch(err.errors.title.kind) {
        case "maxlength":
          res.status(400).json({ message: "New track title exceeds maximum length of track title (100 characters)" });
          break;
        default: 
          res.sendStatus(500);
      }  
    } else if(!results) {
      res.status(400).json({ message: 'No track associated with that trackURL' });
    } else {
      res.status(200).json({ message: `Old track title (${results.title}) updated. New title is (${newTitle})` });
    }
  });
};

exports.deleteTrackByTrackURL = function(req, res) {
  let trackURL = req.params.trackURL;
  
  let query = Track.find({
    trackURL: trackURL
  });
  
  query.exec(function(err, track) {
    if(err) return res.sendStatus(500);
    else if(track.length == 0) {
      res.status(404).json({ message: "No track with this trackURL found on the system" })
    } else {
      let uploaderIdOfCandidateTrack = track[0].uploaderId;
      let clientUploaderId = req.decoded.userId;

      if(clientUploaderId == uploaderIdOfCandidateTrack) {
        res.status(200).json({ message: `Track with trackURL '${trackURL}' deleted successfully` });
      } else {
        res.status(403).json({ message: 'JWT token provided does not map to a user who has permission to delete this track.' });
      }
    }
  });
};

exports.addCommentToTrackByTrackURL = function(req, res) {
  let commenterUserId = req.body.user;
  if(!ObjectID.isValid(commenterUserId)) {
    res.status(400).json({ message: "Invalid userID format" });
  } else {
    var com = {
      user: commenterUserId,
      datePosted: req.body.date,
      body: req.body.body
    }
    var trackURL = req.params.trackURL;
    
    Track.findOne({ trackURL: trackURL }, function(err, track) {
      if (err) return res.sendStatus(400);
      if(_.isEmpty(track)) return res.sendStatus(400);
      let trackId = track._id;
      User.findById(commenterUserId, (err, user) => {
        if (!user) return res.status(400).json({ message: "No user associated with the commenter" });
        Track.update({ _id: trackId }, {
          $push: { "comments": com }
        }, function(err) {
          if (err) return res.sendStatus(400);
          else return res.status(200).json({ message: "Comment successfully added" });
        });
      })
    })
  }
};

exports.updateTrackDescriptionByTrackURL = (req, res) => {
  var trackURL = req.params.trackURL;
  var newDescription = req.body.newDescription;
  
  Track.findOneAndUpdate({ trackURL: trackURL }, { description: newDescription }, { runValidators: true },  (err, results) => {
    if (err) {
      switch(err.errors.description.kind) {
        case "maxlength":
          res.status(400).json({ message: "New description exceeds maximum length of description (4000 characters)" });
          break;
        default: 
          res.sendStatus(500);
      }  
    } else if(!results) {
      res.status(404).json({ message: 'No track associated with requested trackURL' });
    } else {
      if(results.description == newDescription) {
        res.status(400).json({ message: `Track description not updated. Old track description (${results.description}) is the same as new requested track description (${newDescription})` });
      } else {
        res.status(200).json({ message: `Old track description (${results.description}) updated. New description is (${newDescription})` });
      }
    }
  });
};
