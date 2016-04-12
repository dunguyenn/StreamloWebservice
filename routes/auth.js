var express = require('express');
var router = express.Router();
var authController = require('../controllers/authController.js');
var passport = require('passport');

router.post('/signin', passport.authenticate('local', { failureRedirect: '/' }), function(req, res) {
        // If this function gets called, authentication was successful.
        // `req.user` contains the authenticated user.
        console.log("hereiam");
        console.log(req.session);
        res.sendStatus(418)
        //res.json(req.user);
    });

router.post('/signup', function(req, res) {
    return authController.signUp(req, res);
});

module.exports = router;
