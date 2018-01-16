var express = require("express");
var publicTrackRoutes = express.Router();
var trackController = require("../controllers/trackController.js");

// GET all matching tracks by title
publicTrackRoutes.get("/", function(req, res) {
  return trackController.getTracks(req, res);
});

// GET stream of track by ID
publicTrackRoutes.get("/:trackId/stream", function(req, res) {
  return trackController.getTrackStreamByGridFSId(req, res);
});

module.exports = publicTrackRoutes;
