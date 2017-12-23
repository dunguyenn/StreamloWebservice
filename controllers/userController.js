const User = require('../models/userModel.js');
const mongodb = require('mongodb');
const ObjectID = require('mongodb').ObjectID;
const mongoose = require('mongoose');
const fs = require('fs');
const conn = mongoose.connection;
const _ = require('lodash');

exports.getNumberOfMatchingUsersByDisplayName = function(req, res) {
  var displayName = req.query.q;
  var query = User.count({
    displayName: displayName
  });

  query.exec(function(err, results) {
    if (err)
      res.sendStatus(500);
    else
      res.json(results);
  });
};

// TODO implement addProfilePictureToUser function
exports.addProfilePictureToUser = function(req, res) {

};

exports.getUsers = function(req, res) {
  let displayName = req.query.display_name;
  let userURL = req.query.userURL;
  
  var query = User.find({});
  
  if(displayName && userURL) {
    query = User.find({
      displayName: displayName,
      userURL: userURL
    });
  }
  else if (displayName) {
    query = User.find({
      displayName: displayName
    });
  } else if(userURL) {
    query = User.find({
      userURL: userURL
    });
  }
  
  query.exec(function(err, results) {
    if (err) {
      res.sendStatus(500);
    } else if(_.isEmpty(results)) {
      res.status(404).json({ message: "No user associated with requested information" });
    } else {
      res.status(200).json({ 
        users: results
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
