var express = require('express');
var router = express.Router();
var userController = require('../controllers/userController.js');

// GET all matching users by display name
router.get('/', function(req, res) {
    return userController.getUserByName(req, res)
});

// GET number of mathching tracks by title
router.get('/getNumOfPeople', function(req, res) {
    return userController.getNumberOfPeopleByDisplayName(req, res)
});

router.post('/userName', function(req, res) {
    return userController.createUserAccount(req, res)
});



module.exports = router;
