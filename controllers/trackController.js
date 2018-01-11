const Track = require("../models/trackModel.js");
const User = require("../models/userModel.js");
const _ = require("lodash");
const moment = require("moment");
const validator = require("validator");
const fs = require("fs");
const mongoose = require("mongoose");
const mongodb = require("mongodb");
const ObjectID = require("mongodb").ObjectID;
const { Readable } = require("stream");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fields: 7, fileSize: 6000000, files: 1, parts: 8 } });
const logger = require("winston");

exports.getTrackStreamByGridFSId = function(req, res) {
  let trackId;
  if (!ObjectID.isValid(req.params.trackId)) {
    res.status(400).json({ message: "Invalid trackID" });
  } else {
    trackId = new ObjectID(req.params.trackId);

    let db = mongoose.connection.db;
    var bucket = new mongodb.GridFSBucket(db, {
      bucketName: "trackBinaryFiles"
    });

    res.set("content-type", "audio/mp3");
    res.set("accept-ranges", "bytes");

    // bucket.openDownloadStream Returns a readable stream (GridFSBucketReadStream) for streaming file data from GridFS.
    var downloadStream = bucket.openDownloadStream(trackId);

    downloadStream.on("data", chunk => {
      res.write(chunk);
    });

    downloadStream.on("error", () => {
      res.sendStatus(404);
    });

    downloadStream.on("end", () => {
      res.end();
    });
  }
};

function validateGetTracksRequest(reqQuery) {
  let page = reqQuery.page;
  let perPage = reqQuery.per_page;

  if (!Number.isInteger(parseInt(page)) || page - 1 < 0) {
    return { success: false, message: "Invalid page number. Page numbers start from 1 (one-indexed)" };
  }
  if (!Number.isInteger(parseInt(perPage)) || perPage < 1) {
    return { success: false, message: "Invalid per page number" };
  } else if (perPage > 10) {
    return { success: false, message: "Invalid per page number. Maximum number of tracks per page is 10" };
  }
  return { success: true };
}

function determineMongooseQueryFilter() {}

exports.getTracks = (req, res) => {
  // Default page to 1 and per_page to 5
  if (!req.query.page) req.query.page = 1;
  if (!req.query.per_page) req.query.per_page = 5;

  const validationResult = validateGetTracksRequest(req.query);
  if (!validationResult.success) {
    return res.status(400).json({
      message: validationResult.message
    });
  }

  let response = {};
  let requestedPage = parseInt(req.query.page);
  let perPage = parseInt(req.query.per_page);
  let trackTitle = req.query.title;
  let trackURL = req.query.trackURL;

  let mongooseQueryFilter = {}; // default no filter (find all)
  if (trackTitle && trackURL) {
    // if both trackTitle && trackURL query strings present filter for both
    mongooseQueryFilter = { title: trackTitle, trackURL: trackURL };
  } else if (trackTitle) {
    mongooseQueryFilter = { title: trackTitle };
  } else if (trackURL) {
    mongooseQueryFilter = { trackURL: trackURL };
  }

  Track.find(mongooseQueryFilter)
    .sort({
      numPlays: "desc"
    })
    .limit(perPage)
    .skip(perPage * (requestedPage - 1)) // Pagination is 'one-indexed' (pages start at 1). internally zero indexed page is used by mongoose
    .exec((err, results) => {
      if (err) {
        res.sendStatus(500);
      } else if (_.isEmpty(results)) {
        res.status(404).json({ message: "Unable to find track" });
      } else {
        response.tracks = results;
        getNumberOfTracks(mongooseQueryFilter, (err, totalNumberMatchingTracks) => {
          if (err) {
            res.sendStatus(500);
          } else {
            let pageCount = Math.ceil(totalNumberMatchingTracks / perPage);
            response.total = totalNumberMatchingTracks;
            response.page = requestedPage;
            response.pageCount = pageCount;
            res.status(200).json(response);
          }
        });
      }
    });
};

let getNumberOfTracks = (mongooseQueryFilter, cb) => {
  let query = Track.count(mongooseQueryFilter);
  query.exec((err, totalNumberMatchingTracks) => {
    if (err) {
      cb(err);
    } else {
      cb(null, totalNumberMatchingTracks);
    }
  });
};

exports.getTracksByUploaderId = function(req, res) {
  if (!ObjectID.isValid(req.params.uploaderId)) {
    return res.status(400).json({ message: "Invalid trackID" });
  } else {
    var reqUploaderId = req.params.uploaderId;

    var query = Track.find({
      uploaderId: reqUploaderId
    });

    query.limit(5).exec(function(err, results) {
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

exports.getChartOfCity = function(req, res) {
  var requestedCity = req.params.city;

  // Create instance of mongoose Track model to perform city name validation against
  var trackToBeValidated = new Track();
  trackToBeValidated.city = requestedCity;
  trackToBeValidated.validate(function(error) {
    if (error.errors.city) {
      res.status(400).json({ message: "Invalid city name" });
    } else {
      var query = Track.find({
        city: requestedCity
      });

      query
        .sort({
          numPlays: "desc"
        })
        .limit(10)
        .exec(function(err, results) {
          if (err) res.sendStatus(500);
          else if (_.isEmpty(results)) {
            res.status(200).json({ message: "No tracks found for this city" });
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

  if (!title || typeof title !== "string") {
    return { success: false, message: "No track title in request body." };
  }
  if (!genre || typeof genre !== "string") {
    return { success: false, message: "No genre in request body." };
  }
  if (!city || typeof city !== "string") {
    return { success: false, message: "No city in request body." };
  }
  if (!trackURL || typeof trackURL !== "string") {
    return { success: false, message: "No trackURL in request body." };
  } else if (!validator.isURL(trackURL, { require_tld: false })) {
    return { success: false, message: "Invalid trackURL in request body." };
  }
  if (!dateUploaded || typeof dateUploaded !== "string") {
    return { success: false, message: "No dateUploaded in request body." };
  } else if (!moment(dateUploaded, moment.ISO_8601).isValid()) {
    logger.warn("Invalid dateUploaded in request body");
    return { success: false, message: "Invalid dateUploaded in request body." };
  } else if (moment(dateUploaded).isBefore(moment(), "minute")) {
    return { success: false, message: "Date invalid, it is more then thirty minutes before upload date." };
  }
  if (!uploaderId || typeof uploaderId !== "string") {
    return { success: false, message: "No uploaderId in request body." };
  }
  if (!description || typeof description !== "string") {
    return { success: false, message: "No description in request body." };
  }
  if (!track || typeof track !== "object") {
    return { success: false, message: "No track in request body." };
  }

  return { success: true };
}

exports.postTrack = (req, res) => {
  upload.single("track")(req, res, err => {
    if (err) {
      return res.status(400).json({ message: "Error uploading your track" });
    }
    const validationResult = validatePostTrackForm(req.body, req.file);
    if (!validationResult.success) {
      return res.status(400).json({
        message: validationResult.message
      });
    }

    let trackTitle = req.body.title;
    let uploderId = req.body.uploaderId;

    let db = mongoose.connection.db;
    let bucket = new mongodb.GridFSBucket(db, {
      bucketName: "trackBinaryFiles"
    });

    let uploadStream = bucket.openUploadStream(trackTitle, { contentType: "audio/mp3" });
    let trackGridFSId = uploadStream.id;

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

    track.save(function(err, track) {
      if (err) {
        switch (err.message) {
          case "No User associated with uploaderID":
            res.status(400).json({ message: "No User account associated with uploaderID" });
            break;
          default:
            res.status(500).json({ message: "Error uploading file" });
        }
      } else {
        // If track document saves successfully, attempt to stream track from buffer to gridfs
        // Covert buffer to Readable Stream
        const readableTrackStream = new Readable();
        readableTrackStream.push(req.file.buffer);
        readableTrackStream.push(null);
        readableTrackStream.pipe(uploadStream);

        uploadStream.on("error", () => {
          res.status(500).json({ message: "Error uploading file" });
        });

        uploadStream.on("finish", () => {
          // If track piped to gridFS successfully, attempt to update user model
          User.findByIdAndUpdate(
            uploderId,
            {
              $push: {
                uploadedTracks: {
                  trackID: track._id
                }
              },
              $inc: {
                numberOfTracksUploaded: 1
              }
            },
            err => {
              if (err) {
                // If uploaders user document fails to update, delete track document
                // && Delete track file from gridFS (handled by TrackModel middleware)
                Track.findOneAndRemove({ _id: track._id }, err => {
                  res.status(500).json({ message: "Error uploading file" });
                });
              }
            }
          );
        });
        let message = {
          message: "File uploaded successfully",
          trackBinaryId: track.id
        };
        res.status(201).json(message);
      }
    });
  });
};

exports.updateTrackTitleByTrackURL = function(req, res) {
  var trackURL = req.params.trackURL;
  var newTitle = req.body.newTitle;

  Track.findOneAndUpdate({ trackURL: trackURL }, { title: newTitle }, { runValidators: true }, (err, results) => {
    if (err) {
      switch (err.errors.title.kind) {
        case "maxlength":
          res.status(400).json({ message: "New track title exceeds maximum length of track title (100 characters)" });
          break;
        default:
          res.sendStatus(500);
      }
    } else if (!results) {
      res.status(400).json({ message: "No track associated with that trackURL" });
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
    if (err) return res.sendStatus(500);
    else if (track.length == 0) {
      res.status(404).json({ message: "No track with this trackURL found on the system" });
    } else {
      let uploaderIdOfCandidateTrack = track[0].uploaderId;
      let clientUploaderId = req.decoded.userId;

      if (clientUploaderId == uploaderIdOfCandidateTrack) {
        res.status(200).json({ message: `Track with trackURL '${trackURL}' deleted successfully` });
      } else {
        res
          .status(403)
          .json({ message: "JWT token provided does not map to a user who has permission to delete this track." });
      }
    }
  });
};

exports.addCommentToTrackByTrackURL = function(req, res) {
  let commenterUserId = req.body.user;
  if (!ObjectID.isValid(commenterUserId)) {
    res.status(400).json({ message: "Invalid userID format" });
  } else {
    var com = {
      user: commenterUserId,
      datePosted: req.body.date,
      body: req.body.body
    };
    var trackURL = req.params.trackURL;

    Track.findOne({ trackURL: trackURL }, function(err, track) {
      if (err) return res.sendStatus(400);
      if (_.isEmpty(track)) return res.sendStatus(400);
      let trackId = track._id;
      User.findById(commenterUserId, (err, user) => {
        if (!user) return res.status(400).json({ message: "No user associated with the commenter" });
        Track.update(
          { _id: trackId },
          {
            $push: { comments: com }
          },
          function(err) {
            if (err) return res.sendStatus(400);
            else return res.status(200).json({ message: "Comment successfully added" });
          }
        );
      });
    });
  }
};

exports.updateTrackDescriptionByTrackURL = (req, res) => {
  var trackURL = req.params.trackURL;
  var newDescription = req.body.newDescription;

  Track.findOneAndUpdate(
    { trackURL: trackURL },
    { description: newDescription },
    { runValidators: true },
    (err, results) => {
      if (err) {
        switch (err.errors.description.kind) {
          case "maxlength":
            res
              .status(400)
              .json({ message: "New description exceeds maximum length of description (4000 characters)" });
            break;
          default:
            res.sendStatus(500);
        }
      } else if (!results) {
        res.status(404).json({ message: "No track associated with requested trackURL" });
      } else {
        if (results.description == newDescription) {
          res.status(400).json({
            message: `Track description not updated. Old track description (${
              results.description
            }) is the same as new requested track description (${newDescription})`
          });
        } else {
          res.status(200).json({
            message: `Old track description (${results.description}) updated. New description is (${newDescription})`
          });
        }
      }
    }
  );
};
