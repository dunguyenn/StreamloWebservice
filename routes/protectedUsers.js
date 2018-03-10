var express = require("express");
var protectedUserRoutes = express.Router();
var userController = require("../controllers/userController.js");
var jwtUtils = require("../utils/jwt");

// Binding JWT verify middleware to protected routes
protectedUserRoutes.use(jwtUtils.verifyToken);

// POST picture to user account by userId
protectedUserRoutes.patch("/:userId/profileImage", function(req, res) {
  return userController.updateUserProfilePictureByUserId(req, res);
});

// PATCH user information by userId
protectedUserRoutes.patch("/:userId", function(req, res) {
  return userController.updateUserByUserId(req, res);
});

// DELETE user by userId
protectedUserRoutes.delete("/:userId", function(req, res) {
  return userController.deleteUserByUserId(req, res);
});

// POST user to followed users by userId
protectedUserRoutes.post("/:userId/followees", function(req, res) {
  return userController.addUserToFollowedUsersById(req, res);
});

// DELETE followed users by userID
protectedUserRoutes.delete("/:userId/followees/:userIdOfFollowee", function(req, res) {
  return userController.deleteFollowedUserFromFollowedUsersList(req, res);
});

// POST liked Track to user by userID
protectedUserRoutes.post("/:userId/liked", function(req, res) {
  return userController.addTrackToLikedTracksByUserId(req, res);
});

// DELETE liked Track from user by userID
protectedUserRoutes.delete("/:userId/liked/:trackId", function(req, res) {
  return userController.deleteTrackFromUserByUserId(req, res);
});

module.exports = protectedUserRoutes;
