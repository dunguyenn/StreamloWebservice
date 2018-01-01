var express = require("express");
var protectedTrackRoutes = express.Router();
var trackController = require("../controllers/trackController.js");
var jwtUtils = require("../utils/jwt");

// Binding JWT verify middleware to protected routes
protectedTrackRoutes.use(jwtUtils.verifyToken);

// POST track to the system
protectedTrackRoutes.post("/", function(req, res) {
  return trackController.postTrack(req, res);
});

// Add comment to track by trackURL
protectedTrackRoutes.post("/:trackURL/comments", function(req, res) {
  return trackController.addCommentToTrackByTrackURL(req, res);
});

// Update track description by trackURL
protectedTrackRoutes.patch("/:trackURL/description", function(req, res) {
  return trackController.updateTrackDescriptionByTrackURL(req, res);
});

// Update track title by trackURL
protectedTrackRoutes.patch("/:trackURL/title", function(req, res) {
  return trackController.updateTrackTitleByTrackURL(req, res);
});

// Delete track by trackURL
protectedTrackRoutes.delete("/:trackURL", function(req, res) {
  return trackController.deleteTrackByTrackURL(req, res);
});

module.exports = protectedTrackRoutes;
