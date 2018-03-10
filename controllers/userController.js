const User = require("../models/userModel.js");
const Track = require("../models/trackModel.js");

const mongodb = require("mongodb");
const ObjectID = require("mongodb").ObjectID;
const mongoose = require("mongoose");
const _ = require("lodash");

const { Readable } = require("stream");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fields: 1, fileSize: 6000000, files: 1, parts: 1 } });

function validatePageQueryStrings(reqQuery) {
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

  const pageValidationResult = validatePageQueryStrings(req.query);
  if (!pageValidationResult.success) {
    return res.status(400).json({
      message: pageValidationResult.message
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
    User.find({
      _id: userId
    })
      .select("-password")
      .exec(function(err, results) {
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
        // If this user has no profile picture associated with it - return default profile picture
        var options = {
          root: "public",
          dotfiles: "deny",
          headers: {
            "content-type": "image/png"
          }
        };

        res.sendFile("defaultProfilePicture.png", options);
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

exports.getFollowedUsersById = (req, res) => {
  // Default page to 1 and per_page to 5
  if (!req.query.page) req.query.page = 1;
  if (!req.query.per_page) req.query.per_page = 5;

  const pageValidationResult = validatePageQueryStrings(req.query);
  if (!pageValidationResult.success) {
    return res.status(400).json({
      message: pageValidationResult.message
    });
  }

  let response = {};
  let userId = req.params.userId;
  let perPage = parseInt(req.query.per_page);
  let requestedPage = parseInt(req.query.page);

  if (!ObjectID.isValid(userId)) return res.status(400).json({ message: "Invalid userId in request" });

  let query = User.findOne({
    _id: userId
  }).select("followees");

  query.exec((err, user) => {
    if (err) return res.status(500).json({ message: "Error updating user information" });
    if (!user) return res.status(404).json({ message: "No user found with requested Id" });

    let matchingUserFollowees = user.followees;
    let totalNumberFolloweesForMatchingUser = matchingUserFollowees.length;

    if (matchingUserFollowees.length == 0) {
      return res.status(200).json({ followees: matchingUserFollowees });
    }

    getPageOfAttributes(matchingUserFollowees, requestedPage, perPage, followeesPage => {
      if (followeesPage.length == 0) return res.status(200).json({ message: "No followees found on this page" });
      let pageCount = Math.ceil(totalNumberFolloweesForMatchingUser / perPage);
      let response = {
        followees: followeesPage,
        total: totalNumberFolloweesForMatchingUser,
        page: requestedPage,
        pageCount: pageCount
      };
      res.status(200).json(response);
    });
  });
};

let getPageOfAttributes = (userAttributes, reqPage, perPage, cb) => {
  // calculate initial Followee on this page by skiping the first x number of Followees
  // where x is the product of perPage * (requestedPage - 1)

  let attributesPage = [];
  let firstAttributeNum = perPage * (reqPage - 1);
  let lastAttributeNum = firstAttributeNum + perPage;

  for (let AttributeNum = firstAttributeNum; AttributeNum < lastAttributeNum; AttributeNum++) {
    if (!userAttributes[AttributeNum]) break;
    attributesPage.push(userAttributes[AttributeNum]);
  }
  cb(attributesPage);
};

exports.addUserToFollowedUsersById = (req, res) => {
  let followerUserId = req.params.userId;
  let followeeUserId = req.body.followeeUserId;

  if (!ObjectID.isValid(followerUserId)) return res.status(400).json({ message: "Invalid follower userId in request" });
  if (!ObjectID.isValid(followeeUserId)) return res.status(400).json({ message: "Invalid followee userId in request" });

  // check if candidate follower is attempting to follow him/her self
  if (followerUserId == followeeUserId) return res.status(400).json({ message: "Unable to follow yourself" });

  let requestorUserIdFromDecodedJWTToken = req.decoded.userId;

  User.findOne({ _id: followerUserId }, (err, followerUser) => {
    if (err) return res.status(500).json({ message: "Error updating user information" });
    if (!followerUser)
      return res.status(404).json({ message: "userId of follower in request body does not map to user on system" });

    let userIdOfCandidateFollower = followerUser.id;

    // query db to check if userId of candidate Followee maps to a user on database
    User.findOne({ _id: followeeUserId }, (err, followeeUser) => {
      if (err) return res.status(500).json({ message: "Error updating user information" });
      if (!followeeUser)
        return res.status(404).json({ message: "userId of followee in request body does not map to user on system" });

      // check if requestor has permission to follow a user from this account (requestors userId is equal to userId of returned user document)
      if (requestorUserIdFromDecodedJWTToken == userIdOfCandidateFollower) {
        // check if follower is already following candidate followee
        let followerIsAlreadyFollowingFollowee = false;
        followerUser.followees.forEach(followedUser => {
          if (followedUser.userId == followeeUserId) {
            followerIsAlreadyFollowingFollowee = true;
          }
        });
        if (followerIsAlreadyFollowingFollowee) {
          return res
            .status(400)
            .json({ message: `This user ${userIdOfCandidateFollower} already follows ${followeeUserId}` });
        }

        // If follower is not already following candidate followee - proceed to update follower
        User.findByIdAndUpdate(
          userIdOfCandidateFollower,
          {
            $push: {
              followees: {
                userId: followeeUserId
              }
            },
            $inc: {
              numberOfFollowees: 1
            }
          },
          err => {
            if (err) return res.status(500).json({ message: "Error following user" });

            User.findByIdAndUpdate(
              followeeUserId,
              {
                $inc: {
                  numberOfFollowers: 1
                }
              },
              err => {
                if (err) {
                  // If error occurs updating followee - rollback changes made to follower - then return 500 error
                  User.findByIdAndUpdate(
                    userIdOfCandidateFollower,
                    {
                      $pull: {
                        followees: {
                          userId: followeeUserId
                        }
                      },
                      $inc: {
                        numberOfFollowees: -1
                      }
                    },
                    err => {
                      return res.status(500).json({ message: "Error following user" });
                    }
                  );
                }
                return res
                  .status(200)
                  .json({ message: `User ${userIdOfCandidateFollower} is now following user ${followeeUserId}` });
              }
            );
          }
        );
      } else {
        return res.status(403).json({ message: "Unauthorized to follow a user from this account" });
      }
    });
  });
};

exports.deleteFollowedUserFromFollowedUsersList = (req, res) => {
  let followerUserId = req.params.userId;
  let candidateExFolloweeUserId = req.params.userIdOfFollowee;

  if (!ObjectID.isValid(followerUserId)) return res.status(400).json({ message: "Invalid follower userId in request" });
  if (!ObjectID.isValid(candidateExFolloweeUserId))
    return res.status(400).json({ message: "Invalid followee userId in request" });

  // check if follower is attempting to unfollow him/her self
  if (followerUserId == candidateExFolloweeUserId)
    return res.status(400).json({ message: "Unable to unfollow yourself" });

  let requestorUserIdFromDecodedJWTToken = req.decoded.userId;

  User.findOne({ _id: followerUserId }, (err, followerUser) => {
    if (err) return res.status(500).json({ message: "Error updating user information" });
    if (!followerUser)
      return res.status(404).json({ message: "userId of follower in request body does not map to user on system" });

    let userIdOfFollower = followerUser.id;

    // query db to check if userId of Followee maps to a user on database
    User.findOne({ _id: candidateExFolloweeUserId }, (err, followeeUser) => {
      if (err) return res.status(500).json({ message: "Error updating user information" });
      if (!followeeUser)
        return res.status(404).json({ message: "userId of followee in request body does not map to user on system" });

      // check if requestor has permission to unfollow the followee user from this account (requestors userId is equal to userId of returned user document)
      if (requestorUserIdFromDecodedJWTToken == userIdOfFollower) {
        // check if follower is currently following followee - if not then proceed no further
        let followerIsNotCurrentlyFollowingFollowee = true;
        followerUser.followees.forEach(followedUser => {
          if (followedUser.userId == candidateExFolloweeUserId) {
            followerIsNotCurrentlyFollowingFollowee = false;
          }
        });
        if (followerIsNotCurrentlyFollowingFollowee) {
          return res.status(400).json({
            message: `This user ${userIdOfFollower} is not currently following the user ${candidateExFolloweeUserId}`
          });
        }

        User.findByIdAndUpdate(
          userIdOfFollower,
          {
            $pull: {
              followees: {
                userId: candidateExFolloweeUserId
              }
            },
            $inc: {
              numberOfFollowees: -1
            }
          },
          err => {
            if (err) return res.status(500).json({ message: "Error following user" });
            // update followee - decrement number of followers by 1

            User.findByIdAndUpdate(
              candidateExFolloweeUserId,
              {
                $inc: {
                  numberOfFollowers: -1
                }
              },
              err => {
                if (err) {
                  // If error occurs updating followee - rollback changes made to follower - then return 500 error
                  User.findByIdAndUpdate(
                    userIdOfFollower,
                    {
                      $push: {
                        followees: {
                          userId: candidateExFolloweeUserId
                        }
                      },
                      $inc: {
                        numberOfFollowees: 1
                      }
                    },
                    err => {
                      return res.status(500).json({ message: "Error following user" });
                    }
                  );
                }
                return res.status(200).json({
                  message: `User ${userIdOfFollower} is no longer following user ${candidateExFolloweeUserId}`
                });
              }
            );
          }
        );
      } else {
        return res.status(403).json({ message: "Unauthorized to unfollow a user from this account" });
      }
    });
  });
};

exports.getLikedTracksByUserId = (req, res) => {
  // Default page to 1 and per_page to 5
  if (!req.query.page) req.query.page = 1;
  if (!req.query.per_page) req.query.per_page = 5;

  const pageValidationResult = validatePageQueryStrings(req.query);
  if (!pageValidationResult.success) {
    return res.status(400).json({
      message: pageValidationResult.message
    });
  }

  let response = {};
  let userId = req.params.userId;
  let perPage = parseInt(req.query.per_page);
  let requestedPage = parseInt(req.query.page);

  if (!ObjectID.isValid(userId)) return res.status(400).json({ message: "Invalid userId in request" });

  let query = User.findOne({
    _id: userId
  }).select("likedTracks");

  query.exec((err, user) => {
    if (err) return res.status(500).json({ message: "Error getting user information" });
    if (!user) return res.status(404).json({ message: "No user found with requested userId" });

    let matchingUserLikedTracks = user.likedTracks;
    let totalNumberLikedTracksForMatchingUser = matchingUserLikedTracks.length;

    if (matchingUserLikedTracks.length == 0) {
      return res.status(200).json({ likedTracks: matchingUserLikedTracks });
    }

    getPageOfAttributes(matchingUserLikedTracks, requestedPage, perPage, likedTracksPage => {
      if (likedTracksPage.length == 0) return res.status(200).json({ message: "No liked tracks found on this page" });
      let pageCount = Math.ceil(totalNumberLikedTracksForMatchingUser / perPage);
      let response = {
        likedTracks: likedTracksPage,
        total: totalNumberLikedTracksForMatchingUser,
        page: requestedPage,
        pageCount: pageCount
      };
      res.status(200).json(response);
    });
  });
};

exports.addTrackToLikedTracksByUserId = (req, res) => {
  let userId = req.params.userId;
  let trackId = req.params.trackId;

  if (!ObjectID.isValid(userId)) return res.status(400).json({ message: "Invalid userId in request" });
  if (!ObjectID.isValid(trackId)) return res.status(400).json({ message: "Invalid trackId in request" });

  let requestorUserIdFromDecodedJWTToken = req.decoded.userId;

  User.findOne({ _id: userId }, (err, user) => {
    if (err) return res.status(500).json({ message: "Error updating user information" });
    if (!user) return res.status(404).json({ message: "userId in request body does not map to user on system" });

    let userIdOfCandidateLiker = user.id;

    // query db to check if trackId in req maps to a track on database
    Track.findOne({ _id: trackId }, (err, track) => {
      if (err) return res.status(500).json({ message: "Error updating user information" });
      if (!track) return res.status(404).json({ message: "trackId in request body does not map to track on system" });

      // check if requestor has permission to like a track from this account (requestors userId is equal to userId of returned user document)
      if (requestorUserIdFromDecodedJWTToken == userIdOfCandidateLiker) {
        // check if follower is already following candidate followee
        let userHasAlreadyLikedTrack = false;
        user.likedTracks.forEach(likedTrack => {
          if (likedTrack.trackId == trackId) {
            userHasAlreadyLikedTrack = true;
          }
        });
        if (userHasAlreadyLikedTrack) {
          return res
            .status(400)
            .json({ message: `This user ${userIdOfCandidateLiker} already likes the track ${trackId}` });
        }

        // If user has not already liked candidate liked track - proceed to update user
        User.findByIdAndUpdate(
          userIdOfCandidateLiker,
          {
            $push: {
              likedTracks: {
                trackId: trackId
              }
            }
          },
          err => {
            if (err) return res.status(500).json({ message: "Error liking track" });

            // If user update successful - proceed to update track
            Track.findByIdAndUpdate(
              trackId,
              {
                $inc: {
                  numLikes: 1
                }
              },
              err => {
                if (err) {
                  // If error occurs updating track - rollback changes made to user - then return 500 error
                  User.findByIdAndUpdate(
                    userIdOfCandidateLiker,
                    {
                      $pull: {
                        likedTracks: {
                          trackId: trackId
                        }
                      }
                    },
                    err => {
                      return res.status(500).json({ message: "Error liking track" });
                    }
                  );
                }
                return res.status(200).json({ message: `User ${userIdOfCandidateLiker} has liked ${trackId}` });
              }
            );
          }
        );
      } else {
        return res.status(403).json({ message: "Unauthorized to like a track from this account" });
      }
    });
  });
};

exports.deleteTrackFromUserByUserId = (req, res) => {
  let userId = req.params.userId;
  let trackId = req.params.trackId;

  if (!ObjectID.isValid(userId)) return res.status(400).json({ message: "Invalid userId in request" });
  if (!ObjectID.isValid(trackId)) return res.status(400).json({ message: "Invalid trackId in request" });

  let requestorUserIdFromDecodedJWTToken = req.decoded.userId;

  User.findOne({ _id: userId }, (err, user) => {
    if (err) return res.status(500).json({ message: "Error updating user information" });
    if (!user) return res.status(404).json({ message: "userId in request body does not map to user on system" });

    // query db to check if trackId of track maps to a track on database
    Track.findOne({ _id: trackId }, (err, track) => {
      if (err) return res.status(500).json({ message: "Error updating user information" });
      if (!track) return res.status(404).json({ message: "trackId in request body does not map to track on system" });

      // check if requestor has permission to remove this track from likedTracks list on this account (requestors userId is equal to userId of returned user document)
      if (requestorUserIdFromDecodedJWTToken == userId) {
        // check if user liked tracks list contains track - if not then proceed no further
        let userHasNotLikedThisTrack = true;
        user.likedTracks.forEach(likedTrack => {
          if (likedTrack.trackId == trackId) {
            userHasNotLikedThisTrack = false;
          }
        });
        if (userHasNotLikedThisTrack) {
          return res.status(400).json({
            message: `Unable to remove track from liked tracks list. This user ${userId} has not liked this track ${trackId}`
          });
        }

        User.findByIdAndUpdate(
          userId,
          {
            $pull: {
              likedTracks: {
                trackId: trackId
              }
            }
          },
          err => {
            if (err) return res.status(500).json({ message: "Error unliking track" });
            // update track - decrement number of likes by 1

            Track.findByIdAndUpdate(
              trackId,
              {
                $inc: {
                  numLikes: -1
                }
              },
              err => {
                if (err) {
                  // If error occurs updating track - rollback changes made to user - then return 500 error
                  User.findByIdAndUpdate(
                    userId,
                    {
                      $push: {
                        likedTracks: {
                          trackId: trackId
                        }
                      }
                    },
                    err => {
                      return res.status(500).json({ message: "Error unliking track user" });
                    }
                  );
                }
                return res.status(200).json({
                  message: `User ${userId} has removed track ${trackId} from likes list`
                });
              }
            );
          }
        );
      } else {
        return res.status(403).json({ message: "Unauthorized to unlike a track from this account" });
      }
    });
  });
};
