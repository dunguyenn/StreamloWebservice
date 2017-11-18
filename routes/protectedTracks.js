var express = require('express');
var protectedTrackRoutes = express.Router();
var trackController = require('../controllers/trackController.js');
var jwtUtils = require('../utils/jwt');
const multer = require('multer');
const storage = multer.memoryStorage()
const upload = multer({ storage: storage, limits: { fields: 7, fileSize: 6000000, files: 1, parts: 8 }});

// Binding JWT verify middleware to protected routes
protectedTrackRoutes.use(jwtUtils.verifyToken);

// POST track to the system
protectedTrackRoutes.post('/', upload.single('track'), function(req, res) {
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
