const User = require('../models/userModel.js');
const mongodb = require('mongodb');
const ObjectID = require('mongodb').ObjectID;
const mongoose = require('mongoose');
const fs = require('fs');
const conn = mongoose.connection;
const _ = require('lodash');

// TODO implement addProfilePictureToUser function
exports.addProfilePictureToUser = function(req, res) {

};

exports.getUsers = function(req, res) {
  // Default page to 1 and per_page to 5
  if(!req.query.page) req.query.page = 1;
  if(!req.query.per_page) req.query.per_page = 5;
  
  let response = {};

  let displayName = req.query.display_name;
  let userURL = req.query.userURL;
  //let perPage = req.query.per_page;
  let perPage = 5;
  let requestedPage = req.query.page;
  
  let getUsersQueryFilter = {};
  let countUsersQueryFilter = {};
  
  if(displayName && userURL) {
    getUsersQueryFilter.displayName = displayName;
    getUsersQueryFilter.userURL = userURL;
    
    countUsersQueryFilter.displayName = displayName;
    countUsersQueryFilter.userURL = userURL;
  } else if (displayName) {
    getUsersQueryFilter.displayName = displayName;
    countUsersQueryFilter.displayName = displayName;
  } else if(userURL) {
    getUsersQueryFilter.userURL = userURL;
    countUsersQueryFilter.userURL = userURL;
  }
  
  let getUsersQuery = User.find(getUsersQueryFilter);
  let countUsersQuery = User.count(countUsersQueryFilter);
  
  getUsersQuery.limit(perPage)
    .skip(perPage * (requestedPage - 1)) // Pagination is 'one-indexed' (pages start at 1). internally zero indexed page is used by mongoose
    .exec(function(err, results) {
      if (err) {
        res.sendStatus(500);
      } else if(_.isEmpty(results)) {
        res.status(404).json({ message: "No user associated with requested information" });
      } else {
        response.users = results;
        countUsersQuery.exec(function(err, results) {
          response.total = results;
          res.status(200).json(response);
        });
      }
    });
};

exports.getUserById = function(req, res) {
  let userId = req.params.userId;
  if(!ObjectID.isValid(userId)) {
    res.status(400).json({ message: "Invalid userID" });
  } else {
    let query = User.find({
      _id: userId
    });

    query.exec(function(err, results) {
      if (err) {
        res.sendStatus(500);
      } else if(_.isEmpty(results)) {
        res.status(404).json({ message: "No user associated with requested userID" });
      } else {
        res.status(200).json({ 
          users: results
        });
      }
    });
  }
};
