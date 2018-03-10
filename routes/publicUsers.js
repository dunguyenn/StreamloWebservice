var express = require("express");
var publicUserRoutes = express.Router();
var userController = require("../controllers/userController.js");

// GET all users
publicUserRoutes.get("/", function(req, res) {
  return userController.getUsers(req, res);
});

// GET user by userID(Mongo ObjectID)
publicUserRoutes.get("/:userId", function(req, res) {
  return userController.getUserById(req, res);
});

// GET user profile image by userID
publicUserRoutes.get("/:userId/profileImage", function(req, res) {
  return userController.getUserProfileImageById(req, res);
});

// GET followed users by userID
publicUserRoutes.get("/:userId/followees", function(req, res) {
  return userController.getFollowedUsersById(req, res);
});

// GET liked Tracks by userID
publicUserRoutes.get("/:userId/liked", function(req, res) {
  return userController.getLikedTracksByUserId(req, res);
});

module.exports = publicUserRoutes;
