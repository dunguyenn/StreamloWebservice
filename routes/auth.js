var express = require('express');
var router = express.Router();
var passport = require('passport');
var authController = require('../controllers/authController.js');

router.post('/signin', passport.authenticate('local'), function(req, res) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.

    res.json(req.user);
});

// POST user account to system
router.post('/signup', function(req, res) {
    return authController.createUserAccount(req, res);
});

module.exports = router;
