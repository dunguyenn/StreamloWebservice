const User = require("../models/userModel.js");
const mongodb = require("mongodb");
const ObjectID = require("mongodb").ObjectID;
const mongoose = require("mongoose");
const fs = require("fs");
const conn = mongoose.connection;
const _ = require("lodash");

// TODO implement addProfilePictureToUser function
exports.addProfilePictureToUser = function(req, res) {};

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
