var express = require('express');
var router = express.Router();
var multer = require('multer');
var upload = multer({ dest: './uploads/' });
var userController = require('../controllers/userController.js');

// GET all matching users by display name
router.get('/', function(req, res) {
    return userController.getUserByName(req, res);
});


// GET user information by userURL
router.get('/:userURL', function(req, res) {
    return userController.getUserByURL(req, res);
});

// GET user by mongoID
router.get('/id/:userId', function(req, res) {
    return userController.getUserById(req, res);
});

// GET number of mathching tracks by title
router.get('/getNumOfPeople', function(req, res) {
    return userController.getNumberOfPeopleByDisplayName(req, res);
});

// POST user account to system
router.post('/', upload.single('profilePicture'), function(req, res) {
    return userController.createUserAccount(req, res);
});



module.exports = router;
