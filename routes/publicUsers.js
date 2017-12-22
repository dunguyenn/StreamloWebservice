var express = require('express');
var publicUserRoutes = express.Router();
var userController = require('../controllers/userController.js');

// GET user by userID(Mongo ObjectID)
publicUserRoutes.get('/:userId', function(req, res) {
  return userController.getUserById(req, res);
});

module.exports = publicUserRoutes;
