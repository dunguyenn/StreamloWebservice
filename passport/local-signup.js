var userSchema = require('../models/userModel.js');
const User = require('mongoose').model('user', userSchema);
const PassportLocalStrategy = require('passport-local').Strategy;

/**
 * Return the Passport Local Strategy object.
 */
module.exports = new PassportLocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  session: false,
  passReqToCallback: true
}, (req, email, password, done) => {
  const userData = {
    email: email.trim(),
    password: password.trim(),
    userURL: req.body.userURL.trim(),
    displayName: req.body.displayName.trim(),
    city: req.body.city.trim()
  };

  const newUser = new User(userData);
  newUser.save((err) => {
    if (err) {
      console.error(err);
      return done(err);
    }

    return done(null, newUser);
  });
});
