var express = require('express');
var router = express.Router();
var authController = require('../controllers/authController.js');

// GET all matching tracks by title
router.get('/signup', function(req, res) {
    return authController.signup(req, res);
});

router.post('/signup', function(req, res) {
    return authController.createAccount(req, res);
});

module.exports = router;
