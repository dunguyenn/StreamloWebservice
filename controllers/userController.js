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
  let response = {};

  let displayName = req.query.display_name;
  let userURL = req.query.userURL;
  let perPage = 5
  let page = req.query.page;
  
  let getUsersquery = User.find({});
  let countUsersQuery = User.count({});
  
  if(displayName && userURL) {
    getUsersquery = User.find({
      displayName: displayName,
      userURL: userURL
    });
    countUsersQuery = User.count({
      displayName: displayName,
      userURL: userURL
    });
  }
  else if (displayName) {
    getUsersquery = User.find({
      displayName: displayName
    });
    countUsersQuery = User.count({
      displayName: displayName
    });
  } else if(userURL) {
    getUsersquery = User.find({
      userURL: userURL
    });
    countUsersQuery = User.count({
      userURL: userURL
    });
  }
  
  getUsersquery.limit(perPage)
    .skip(perPage * page)
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
