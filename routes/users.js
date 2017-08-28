var express = require('express');
var publicUserRoutes = express.Router();
var userController = require('../controllers/userController.js');

// GET all matching users by display name
publicUserRoutes.get('/', function(req, res) {
  return userController.getUsersByDisplayName(req, res);
});

// GET user information by userURL
publicUserRoutes.get('/:userURL', function(req, res) {
  return userController.getUserByURL(req, res);
});

// GET user by mongoID
publicUserRoutes.get('/id/:userId', function(req, res) {
  return userController.getUserById(req, res);
});

// GET number of mathching users by displayName
publicUserRoutes.get('/count/byDisplayname', function(req, res) {
  return userController.getNumberOfMatchingUsersByDisplayName(req, res);
});

module.exports = publicUserRoutes;
