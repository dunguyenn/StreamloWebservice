var express = require('express');
var router = express.Router();
var passport = require('passport');
var authController = require('../controllers/authController.js');

// POST login to user account
router.post('/login', function(req, res) {
  return authController.login(req, res);
});

// POST user account to system
router.post('/signup', function(req, res) {
    return authController.createUserAccount(req, res);
});

module.exports = router;
