var express = require("express");
var publicTrackRoutes = express.Router();
var trackController = require("../controllers/trackController.js");

// GET all matching tracks by title
publicTrackRoutes.get("/", function(req, res) {
  return trackController.getTracks(req, res);
});

// GET track by trackId
publicTrackRoutes.get("/:trackId", function(req, res) {
  return trackController.getTrackByTrackId(req, res);
});

// GET stream of track by ID
publicTrackRoutes.get("/:trackId/stream", function(req, res) {
  return trackController.getTrackStreamByTrackId(req, res);
});

// GET comments of track by ID
publicTrackRoutes.get("/:trackId/comments", function(req, res) {
  return trackController.getTrackCommentsById(req, res);
});

// GET album art of track by ID
publicTrackRoutes.get("/:trackId/albumArt", function(req, res) {
  return trackController.getTrackAlbumArtByTrackId(req, res);
});

module.exports = publicTrackRoutes;
