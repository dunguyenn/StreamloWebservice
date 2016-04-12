var express = require('express');
var router = express.Router();
var passport = require('passport');

router.post('/signin', passport.authenticate('local'), function(req, res) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.

    //console.log(req.session);
    //res.sendStatus(200);
    res.json(req.user);
});

router.post('/logout', function(req, res){
    req.logout();
    res.sendStatus(200);
});

module.exports = router;
