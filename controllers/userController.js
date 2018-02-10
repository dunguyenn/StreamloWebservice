const User = require("../models/userModel.js");
const mongodb = require("mongodb");
const ObjectID = require("mongodb").ObjectID;
const mongoose = require("mongoose");
const _ = require("lodash");

const { Readable } = require("stream");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fields: 1, fileSize: 6000000, files: 1, parts: 1 } });

function validateGetUsersRequest(reqQuery) {
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

exports.getUsers = function(req, res) {
  // Default page to 1 and per_page to 5
  if (!req.query.page) req.query.page = 1;
  if (!req.query.per_page) req.query.per_page = 5;

  const validationResult = validateGetUsersRequest(req.query);
  if (!validationResult.success) {
    return res.status(400).json({
      message: validationResult.message
    });
  }

  let response = {};
  let displayName = req.query.display_name;
  let userURL = req.query.userURL;
  let perPage = parseInt(req.query.per_page);
  let requestedPage = parseInt(req.query.page);

  let getUsersQueryFilter = {};
  let countUsersQueryFilter = {};

  if (displayName && userURL) {
    getUsersQueryFilter.displayName = displayName;
    getUsersQueryFilter.userURL = userURL;

    countUsersQueryFilter.displayName = displayName;
    countUsersQueryFilter.userURL = userURL;
  } else if (displayName) {
    getUsersQueryFilter.displayName = displayName;
    countUsersQueryFilter.displayName = displayName;
  } else if (userURL) {
    getUsersQueryFilter.userURL = userURL;
    countUsersQueryFilter.userURL = userURL;
  }

  let getUsersQuery = User.find(getUsersQueryFilter);
  let countUsersQuery = User.count(countUsersQueryFilter);

  getUsersQuery
    .limit(perPage)
    .skip(perPage * (requestedPage - 1)) // Pagination is 'one-indexed' (pages start at 1). internally zero indexed page is used by mongoose
    .exec(function(err, results) {
      if (err) {
        res.sendStatus(500);
      } else if (_.isEmpty(results)) {
        res.status(404).json({ message: "No user associated with requested information" });
      } else {
        response.users = results;
        countUsersQuery.exec(function(err, totalNumberMatchingUsers) {
          if (err) {
            res.sendStatus(500);
          } else {
            let pageCount = Math.ceil(totalNumberMatchingUsers / perPage);
            response.total = totalNumberMatchingUsers;
            response.page = requestedPage;
            response.pageCount = pageCount;
            res.status(200).json(response);
          }
        });
      }
    });
};

exports.getUserById = function(req, res) {
  let userId = req.params.userId;
  if (!ObjectID.isValid(userId)) {
    res.status(400).json({ message: "Invalid userID" });
  } else {
    let query = User.find({
      _id: userId
    });

    query.exec(function(err, results) {
      if (err) {
        res.sendStatus(500);
      } else if (_.isEmpty(results)) {
        res.status(404).json({ message: "No user associated with requested userID" });
      } else {
        res.status(200).json({
          users: results
        });
      }
    });
  }
};

exports.updateUserByUserId = (req, res) => {
  let userId = req.params.userId;
  if (!ObjectID.isValid(userId)) return res.status(400).json({ message: "Invalid userId in request" });

  let requestorUserIdFromDecodedJWTToken = req.decoded.userId;

  let candidateEmail = req.body.email;
  let candidatePassword = req.body.password;
  let candidateUserURL = req.body.userURL;
  let candidateDisplayName = req.body.displayName;
  let candidateCity = req.body.city;

  User.findOne({ _id: userId }, (err, user) => {
    if (err) return res.status(500).json({ message: "Error updating user information" });
    if (!user) return res.status(404).json({ message: "No user found with requested Id" });

    // check if requestor has permission to update this users information (requestors userId is equal to userId of returned user document)
    if (requestorUserIdFromDecodedJWTToken == user._id) {
      if (candidateEmail) user.email = candidateEmail;
      if (candidatePassword) user.password = candidatePassword;
      if (candidateUserURL) user.userURL = candidateUserURL;
      if (candidateDisplayName) user.displayName = candidateDisplayName;
      if (candidateCity) user.city = candidateCity;

      user.save({ validateBeforeSave: true }, err => {
        if (err) {
          constructResponseErrorsFromMongooseError(err, responseErrors => {
            return res.status(400).json({
              message: "Error updating user information",
              errors: responseErrors
            });
          });
        } else {
          return res.status(200).json({ message: "User information updated successfully" });
        }
      });
    } else {
      return res.status(403).json({ message: "Unauthorized to update this users information" });
    }
  });
};

function constructResponseErrorsFromMongooseError(err, cb) {
  let responseErrors = {};

  // check if err is signaling duplicate email
  let patt = new RegExp(/email/);
  let isDuplicateEmail = patt.test(err.message);
  if (isDuplicateEmail) {
    responseErrors.email = "An account with this email address already exists";
  }

  // check if err is signaling duplicate userURL
  patt = new RegExp(/userURL/);
  let isDuplicateUserURL = patt.test(err.message);
  if (isDuplicateUserURL) {
    responseErrors.userURL = "An account with this userURL already exists";
  }

  // check if password constraints error thrown from user model pre-save hook
  let errString = err.toString();
  if (errString == "Error: Password constraints error. Password is under the minimum length of 8 characters") {
    err.errors = { password: "Password is under the minimum length of 8 characters" };
  }
  if (errString == "Error: Password constraints error. Password is over the maximum length of 50 characters") {
    err.errors = { password: "Password is over the maximum length of 50 characters" };
  }

  for (var error in err.errors) {
    switch (error) {
      case "email":
        responseErrors.email = "Invalid email address";
        break;
      case "password":
        responseErrors.password = err.errors.password;
        break;
      case "userURL":
        responseErrors.userURL = err.errors.userURL;
        break;
      case "displayName":
        if (err.errors.displayName.properties.type == "maxlength") {
          responseErrors.displayName = "Display name exceeds maximum length of 20 characters";
        } else {
          responseErrors.displayName = "Invalid display name";
        }
        break;
      case "city":
        responseErrors.city = "Invalid city. Valid cities include Belfast or Derry";
        break;
      default:
    }
  }
  cb(responseErrors);
}

exports.deleteUserByUserId = (req, res) => {
  let userId = req.params.userId;
  if (!ObjectID.isValid(userId)) return res.status(400).json({ message: "Invalid userId in request" });

  let requestorUserIdFromDecodedJWTToken = req.decoded.userId;

  User.findOne({ _id: userId }, (err, user) => {
    // if mongoError thrown, or no user found return 404
    if (err) return res.status(500).json({ message: "Error deleting user account" });
    if (!user) return res.status(404).json({ message: "No user associated with this Id" });

    // check if requestor has permission to delete this user (requestors userId present in jwt token is equal to userId of returned user document)
    if (requestorUserIdFromDecodedJWTToken == user._id) {
      User.findOneAndRemove({ _id: userId }, (err, doc, result) => {
        if (err) return res.status(500).json({ message: "Error deleting user account" });
        return res.status(200).json({ message: "User deleted successfully" });
      });
    } else {
      return res.status(403).json({ message: "Unauthorized to delete this user" });
    }
  });
};

exports.getUserProfileImageById = (req, res) => {
  let userId = req.params.userId;
  if (!ObjectID.isValid(req.params.userId)) {
    res.status(400).json({ message: "Invalid userId" });
  } else {
    User.findOne({ _id: userId }, (err, user) => {
      if (err) return res.status(500).json({ message: "Error getting user profile image" });
      if (!user) return res.status(404).json({ message: "No user associated with this Id" });

      let profileImageGridFSId = new ObjectID(user.profileImageGridFSId);

      let db = mongoose.connection.db;
      var bucket = new mongodb.GridFSBucket(db, {
        bucketName: "userProfileImageFiles"
      });

      res.set("content-type", "image/png");

      // bucket.openDownloadStream Returns a readable stream (GridFSBucketReadStream) for streaming file data from GridFS.
      var downloadStream = bucket.openDownloadStream(profileImageGridFSId);

      downloadStream.on("data", chunk => {
        res.write(chunk);
      });

      downloadStream.on("error", () => {
        res.sendStatus(404);
      });

      downloadStream.on("end", () => {
        res.end();
      });
    });
  }
};

exports.updateUserProfilePictureByUserId = (req, res) => {
  upload.single("image")(req, res, err => {
    if (err) {
      return res.status(500).json({ message: "Error updating your profile picture" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No new image in request body" });
    }

    let userId = req.params.userId;
    let requestorUserIdFromDecodedJWTToken = req.decoded.userId;

    if (!ObjectID.isValid(req.params.userId)) {
      res.status(400).json({ message: "Invalid userId" });
    } else {
      User.findOne({ _id: userId }, (err, user) => {
        if (err) return res.status(500).json({ message: "Error updating user profile picture" });
        if (!user) return res.status(404).json({ message: "No user associated with this Id" });

        // check if requestor has permission to update this users profile picture (requestors userId is equal to userId of returned user document)
        if (requestorUserIdFromDecodedJWTToken == user._id) {
          let db = mongoose.connection.db;
          let bucket = new mongodb.GridFSBucket(db, {
            bucketName: "userProfileImageFiles"
          });

          // if user already has profile picture, delete old one from gridfs before continuing
          let currentUserProfileGridFSId = user.profileImageGridFSId;
          if (currentUserProfileGridFSId) {
            bucket.delete(currentUserProfileGridFSId, err => {
              if (err) return res.status(500).json({ message: "Error updating user profile picture" });
            });
          }

          let uploadStream = bucket.openUploadStream(userId, { contentType: "image/png" });
          let userImageGridFSId = uploadStream.id;

          const readableImageStream = new Readable();
          readableImageStream.push(req.file.buffer);
          readableImageStream.push(null);
          readableImageStream.pipe(uploadStream);

          uploadStream.on("error", () => {
            res.status(500).json({ message: "Error updating profile picture" });
          });

          uploadStream.on("finish", () => {
            user.profileImageGridFSId = userImageGridFSId;
            user.save({ validateBeforeSave: true }, err => {
              if (err) return res.status(500).json({ message: "Error updating user profile picture" });
              return res.status(200).json({ message: "User profile picture updated successfully" });
            });
          });
        } else {
          return res.status(403).json({ message: "Unauthorized to update this user's profile picture" });
        }
      });
    }
  });
};
