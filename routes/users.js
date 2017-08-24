var express = require('express');
var router = express.Router();
var multer = require('multer');
var upload = multer({
  dest: './uploads/'
});
var userController = require('../controllers/userController.js');

// GET all matching users by display name
router.get('/', function(req, res) {
  return userController.getUsersByDisplayName(req, res);
});

// GET user information by userURL
router.get('/:userURL', function(req, res) {
  return userController.getUserByURL(req, res);
});

// GET user by mongoID
router.get('/id/:userId', function(req, res) {
  return userController.getUserById(req, res);
});

// GET number of mathching users by displayName
router.get('/count/byDisplayname', function(req, res) {
  return userController.getNumberOfMatchingUsersByDisplayName(req, res);
});

// POST picture to user account by userURL
router.post('/:userURL/addProfilePicture', upload.single('profilePicture'), function(req, res) {
  return userController.addProfilePictureToUser(req, res);
});

module.exports = router;
