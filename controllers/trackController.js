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
const upload = multer({ storage: storage, limits: { fields: 7, fileSize: 6000000, files: 2, parts: 9 } });
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

function validateGetTracksRequest(queryStrings) {
  let page = queryStrings.page;
  let perPage = queryStrings.per_page;
  let uploaderId = queryStrings.uploaderId;

  if (!Number.isInteger(parseInt(page)) || page - 1 < 0) {
    return { success: false, message: "Invalid page number. Page numbers start from 1 (one-indexed)" };
  }
  if (!Number.isInteger(parseInt(perPage)) || perPage < 1) {
    return { success: false, message: "Invalid per page number" };
  } else if (perPage > 10) {
    return { success: false, message: "Invalid per page number. Maximum number of tracks per page is 10" };
  }
  if (uploaderId) {
    if (!ObjectID.isValid(uploaderId)) {
      return { success: false, message: "Invalid uploaderId" };
    }
  }
  return { success: true };
}

function determineMongooseQueryFilter(queryStrings) {
  let mongooseQueryFilter = {}; // default no filter (find all)

  for (var queryString in queryStrings) {
    switch (queryString) {
      case "title":
        Object.assign(mongooseQueryFilter, { title: queryStrings.title });
        break;
      case "trackURL":
        Object.assign(mongooseQueryFilter, { trackURL: queryStrings.trackURL });
        break;
      case "uploaderId":
        Object.assign(mongooseQueryFilter, { uploaderId: queryStrings.uploaderId });
        break;
      case "city":
        Object.assign(mongooseQueryFilter, { city: queryStrings.city });
        break;
      default:
    }
  }
  return mongooseQueryFilter;
}

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

  let mongooseQueryFilter = determineMongooseQueryFilter(req.query);

  Track.find(mongooseQueryFilter, {})
    .select(
      "title genre description trackURL city numPlays numLikes numComments uploaderId dateUploaded trackBinaryId albumArtBinaryId"
    )
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

function validatePostTrackForm(fields, files) {
  let title = fields.title;
  let genre = fields.genre;
  let city = fields.city;
  let trackURL = fields.trackURL;
  let dateUploaded = fields.dateUploaded;
  let uploaderId = fields.uploaderId;
  let description = fields.description;
  let track = files.track;
  let albumArt = files.albumArt;

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

let postTrackFields = [{ name: "track", maxCount: 1 }, { name: "albumArt", maxCount: 1 }];

exports.postTrack = (req, res) => {
  upload.fields(postTrackFields)(req, res, err => {
    if (err) {
      return res.status(400).json({ message: "Error uploading your track" });
    }
    const validationResult = validatePostTrackForm(req.body, req.files);
    if (!validationResult.success) {
      return res.status(400).json({
        message: validationResult.message
      });
    }

    let trackTitle = req.body.title;
    let uploderId = req.body.uploaderId;

    let db = mongoose.connection.db;
    let trackBucket = new mongodb.GridFSBucket(db, {
      bucketName: "trackBinaryFiles"
    });
    let albumArtBucket = new mongodb.GridFSBucket(db, {
      bucketName: "albumArtBinaryFiles"
    });

    let trackUploadStream = trackBucket.openUploadStream(req.files.track[0].originalname, { contentType: "audio/mp3" });
    let trackGridFSId = trackUploadStream.id;

    let albumArtuploadStream = undefined;
    let albumArtGridFSId = undefined;
    if (req.files.albumArt) {
      albumArtuploadStream = albumArtBucket.openUploadStream(req.files.albumArt[0].originalname, {
        contentType: "image/*"
      });
      albumArtGridFSId = albumArtuploadStream.id;
    }

    var track = new Track({
      title: req.body.title,
      genre: req.body.genre,
      city: req.body.city,
      trackURL: req.body.trackURL,
      dateUploaded: req.body.dateUploaded,
      uploaderId: req.body.uploaderId,
      description: req.body.description,
      trackBinaryId: trackGridFSId,
      albumArtBinaryId: albumArtGridFSId
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
        readableTrackStream.push(req.files.track[0].buffer);
        readableTrackStream.push(null);
        readableTrackStream.pipe(trackUploadStream);

        trackUploadStream.on("error", () => {
          res.status(500).json({ message: "Error uploading file" });
        });

        trackUploadStream.on("finish", () => {
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

              // After user model successfully updated - attempt store album art in gridfs (if album art present in request)
              if (albumArtuploadStream) {
                const readableAlbumArtStream = new Readable();
                readableAlbumArtStream.push(req.files.albumArt[0].buffer);
                readableAlbumArtStream.push(null);
                readableAlbumArtStream.pipe(albumArtuploadStream);

                albumArtuploadStream.on("error", () => {
                  // on error storing album art - undo updates to uploader user model and remove track
                  Track.findOneAndRemove({ _id: track._id }, err => {
                    User.findByIdAndUpdate(
                      uploderId,
                      {
                        $pull: {
                          uploadedTracks: {
                            trackID: track._id
                          }
                        },
                        $inc: {
                          numberOfTracksUploaded: -1
                        }
                      },
                      err => {
                        if (err) {
                          return res.status(500).json({ message: "Error uploading file" });
                        }
                        res.status(500).json({ message: "Error uploading file" });
                      }
                    );
                  });
                });

                albumArtuploadStream.on("finish", () => {
                  let message = {
                    message: "File uploaded successfully",
                    trackBinaryId: track.id
                  };
                  res.status(201).json(message);
                });
              } else {
                let message = {
                  message: "File uploaded successfully",
                  trackBinaryId: track.id
                };
                res.status(201).json(message);
              }
            }
          );
        });
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
      let candidateTrackToBeDeleted = track[0];
      let uploaderIdOfCandidateTrack = candidateTrackToBeDeleted.uploaderId;
      let clientUploaderId = req.decoded.userId;

      if (clientUploaderId == uploaderIdOfCandidateTrack) {
        // if clientUploaderId from provided JWT token equals uploaderId Of CandidateTrack; user has permission to delete this track
        Track.findOneAndRemove({ _id: candidateTrackToBeDeleted._id }, err => {
          if (err) return res.status(500).json({ message: "Error deleting track" });
          res.status(200).json({ message: `Track with trackURL '${trackURL}' deleted successfully` });
        });
      } else {
        res.status(403).json({ message: "Unauthorized to delete this track" });
      }
    }
  });
};

exports.deleteTrackByTrackId = function(req, res) {
  let trackId = req.params.trackId;

  let query = Track.find({
    _id: trackId
  });

  query.exec(function(err, track) {
    if (err) return res.sendStatus(500);
    else if (track.length == 0) {
      res.status(404).json({ message: "No track with this trackId found on the system" });
    } else {
      let candidateTrackToBeDeleted = track[0];
      let uploaderIdOfCandidateTrack = candidateTrackToBeDeleted.uploaderId;
      let clientUploaderId = req.decoded.userId;

      if (clientUploaderId == uploaderIdOfCandidateTrack) {
        // if clientUploaderId from provided JWT token equals uploaderId Of CandidateTrack; user has permission to delete this track
        Track.findOneAndRemove({ _id: candidateTrackToBeDeleted._id }, err => {
          if (err) return res.status(500).json({ message: "Error deleting track" });
          res.status(200).json({ message: `Track with trackId '${trackId}' deleted successfully` });
        });
      } else {
        res.status(403).json({ message: "Unauthorized to delete this track" });
      }
    }
  });
};

exports.getTrackCommentsById = function(req, res) {
  // Default page to 1 and per_page to 5
  if (!req.query.page) req.query.page = 1;
  if (!req.query.per_page) req.query.per_page = 5;

  let trackId = req.params.trackId;
  if (!ObjectID.isValid(trackId)) {
    res.status(400).json({ message: "Invalid trackId format" });
  } else {
    let requestedPage = parseInt(req.query.page);
    let perPage = parseInt(req.query.per_page);

    let query = Track.find({
      _id: trackId
    }).select("comments");

    query.exec(function(err, track) {
      if (err) return res.sendStatus(500);
      else if (track.length == 0) {
        res.status(404).json({ message: "No track found with this trackId" });
      } else {
        let matchingTrackComments = track[0].comments;
        let totalNumberCommentsForMatchingTrack = matchingTrackComments.length;
        if (totalNumberCommentsForMatchingTrack == 0) {
          res.status(404).json({ message: "No comments found on this track" });
        } else {
          getPageOfComments(matchingTrackComments, requestedPage, perPage, (err, commentsPage) => {
            if (err) return res.status(200).json({ message: "errorMessage" });
            if (commentsPage.length == 0) return res.status(200).json({ message: "No comments found on this page" });
            let pageCount = Math.ceil(totalNumberCommentsForMatchingTrack / perPage);
            let response = {
              comments: commentsPage,
              total: totalNumberCommentsForMatchingTrack,
              page: requestedPage,
              pageCount: pageCount
            };
            res.status(200).json(response);
          });
        }
      }
    });
  }
};

let getPageOfComments = (trackComments, reqPage, perPage, cb) => {
  // calculate initialComment on this page by skiping the first x number of comments
  // where x is the product of perPage * (requestedPage - 1)

  let commentsPage = [];
  let firstCommentNum = perPage * (reqPage - 1);
  let lastCommentNum = firstCommentNum + perPage;

  for (let commentNum = firstCommentNum; commentNum < lastCommentNum; commentNum++) {
    if (!trackComments[commentNum]) break;
    commentsPage.push(trackComments[commentNum]);
  }
  cb(null, commentsPage);
};

exports.addCommentToTrackByTrackURL = function(req, res) {
  let commenterUserId = req.body.user;
  if (!ObjectID.isValid(commenterUserId)) {
    return res.status(400).json({ message: "Invalid userID format" });
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
            $push: { comments: com },
            numComments: track.numComments + 1
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

function validateDeleteCommentReq(req) {
  let commentId = req.params.commentId;

  if (!commentId) {
    return { success: false, message: "No commmentId in request body" };
  } else if (!ObjectID.isValid(commentId)) {
    return { success: false, message: "Invalid commentId in request body" };
  }

  return { success: true };
}

exports.removeCommentFromTrackByCommentId = (req, res) => {
  const validationResult = validateDeleteCommentReq(req);
  if (!validationResult.success) {
    return res.status(400).json({
      message: validationResult.message
    });
  }

  let commentId = req.params.commentId;
  let decodedUserIdFromProvidedJWTToken = req.decoded.userId;

  Track.findOne(
    {
      "comments._id": commentId
    },
    function(err, track) {
      if (!track) return res.status(400).json({ message: "Comment not found" });
      // get comment with _id = commentId
      let trackComments = track.comments;
      function findCommentById(comment) {
        return comment._id == commentId;
      }

      let matchingCommentIndex = trackComments.findIndex(findCommentById);
      let mathcingCommentToRemove = trackComments[matchingCommentIndex];

      if (mathcingCommentToRemove.user == decodedUserIdFromProvidedJWTToken) {
        // if comment userId equals userId from provided JWT Token; user has permission to delete this comment
        track.comments.pull(commentId);
        track.numComments = track.numComments - 1;
        track.save({ validateBeforeSave: false }, error => {
          if (err) return res.status(500).json({ message: "Error deleting comment" });
          return res.status(200).json({ message: "Comment deleted" });
        });
      } else {
        return res.status(403).json({ message: "Unauthorized to delete this comment" });
      }
    }
  );
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

exports.getTrackAlbumArtById = (req, res) => {
  let trackId = req.params.trackId;
  if (!ObjectID.isValid(req.params.trackId)) {
    res.status(400).json({ message: "Invalid trackId" });
  } else {
    Track.findOne({ _id: trackId }, (err, track) => {
      if (err) return res.status(500).json({ message: "Error getting track album art" });
      if (!track) return res.status(404).json({ message: "No track associated with this Id" });

      let trackAlbumArtGridFSId = new ObjectID(track.albumArtBinaryId);

      let db = mongoose.connection.db;
      var bucket = new mongodb.GridFSBucket(db, {
        bucketName: "albumArtBinaryFiles"
      });

      res.set("content-type", "image/png");

      // bucket.openDownloadStream Returns a readable stream (GridFSBucketReadStream) for streaming file data from GridFS.
      var downloadStream = bucket.openDownloadStream(trackAlbumArtGridFSId);

      downloadStream.on("data", chunk => {
        res.write(chunk);
      });

      downloadStream.on("error", () => {
        // If this track has no album art associated with it - return default album art
        var options = {
          root: "public",
          dotfiles: "deny",
          headers: {
            "content-type": "image/png"
          }
        };

        res.sendFile("defaultAlbumArt.png", options);
      });

      downloadStream.on("end", () => {
        res.end();
      });
    });
  }
};
