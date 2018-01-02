var express = require("express");
var publicAuthRoutes = express.Router();
var passport = require("passport");
var authController = require("../controllers/authController.js");

// POST login to user account
publicAuthRoutes.post("/login", function(req, res) {
  return authController.login(req, res);
});

// POST user account to system
publicAuthRoutes.post("/signup", function(req, res) {
  return authController.createUserAccount(req, res);
});

module.exports = publicAuthRoutes;
