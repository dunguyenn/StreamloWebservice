var express = require('express');
var protectedTrackRoutes = express.Router();
var trackController = require('../controllers/trackController.js');
var jwtUtils = require('../utils/jwt');

// Binding JWT verify middleware to protected routes
protectedTrackRoutes.use(jwtUtils.verifyToken);

// POST track to the system
protectedTrackRoutes.post('/', function(req, res) {
  return trackController.postTrack(req, res);
});

// Add comment to track by trackURL
protectedTrackRoutes.post('/:trackURL/addComment', function(req, res) {
  return trackController.addCommentToTrackByTrackURL(req, res);
});

// Add desciption to track by trackURL
protectedTrackRoutes.post('/:trackURL/addDescription', function(req, res) {
  //return trackController.addCommentToTrackByTrackURL(req, res);
});

protectedTrackRoutes.patch('/:trackURL', function(req, res) {
  return trackController.updateTrackTitleByTrackURL(req, res);
});

protectedTrackRoutes.delete('/:trackURL', function(req, res) {
  return trackController.deleteTrackByTrackURL(req, res);
});

module.exports = protectedTrackRoutes;
