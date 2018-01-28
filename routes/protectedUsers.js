var express = require("express");
var protectedUserRoutes = express.Router();
var multer = require("multer");
var upload = multer({ dest: "./uploads/" });
var userController = require("../controllers/userController.js");
var jwtUtils = require("../utils/jwt");

// Binding JWT verify middleware to protected routes
protectedUserRoutes.use(jwtUtils.verifyToken);

// POST picture to user account by userURL
protectedUserRoutes.post("/:userURL/addProfilePicture", upload.single("profilePicture"), function(req, res) {
  return userController.addProfilePictureToUser(req, res);
});

// PATCH user information by userId
protectedUserRoutes.patch("/:userId", function(req, res) {
  return userController.updateUserByUserId(req, res);
});

module.exports = protectedUserRoutes;
