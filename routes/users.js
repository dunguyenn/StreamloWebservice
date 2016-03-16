var express = require('express');
var router = express.Router();
var userController = require('../controllers/userController.js');

// GET user by username route
router.get('/:userName', function(req, res) {
    return userController.getUserByName(req, res)
});

router.post('/userName', function(req, res) {
    return userController.createUserAccount(req, res)
});



module.exports = router;
