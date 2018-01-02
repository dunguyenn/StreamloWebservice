var express = require("express");
var publicTrackRoutes = express.Router();
var trackController = require("../controllers/trackController.js");

// GET all matching tracks by title
publicTrackRoutes.get("/", function(req, res) {
  return trackController.getTracks(req, res);
});

// GET track by trackURL
publicTrackRoutes.get("/:trackURL", function(req, res) {
  return trackController.getTrackByURL(req, res);
});

// GET stream of track by ID
publicTrackRoutes.get("/:trackId/stream", function(req, res) {
  return trackController.getTrackStreamByGridFSId(req, res);
});

// GET all tracks with uploaderId
publicTrackRoutes.get("/uploaderId/:uploaderId", function(req, res) {
  return trackController.getTracksByUploaderId(req, res);
});

// GET top 10 tracks of city sorted by number of plays
publicTrackRoutes.get("/:city/chart", function(req, res) {
  return trackController.getChartOfCity(req, res);
});

module.exports = publicTrackRoutes;
