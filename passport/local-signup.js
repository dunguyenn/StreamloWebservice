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
      // 11000 == the Mongo code is for a duplicate key error
      // the 409 HTTP status code is for conflict error
      if (err.name === 'MongoError' && err.code === 11000) {
        let patt = new RegExp(/email/);
        let isDuplicateEmail = patt.test(err.message);
        if(isDuplicateEmail) {
          return done({ httpStatusCode: 409, message: "This email is already taken." })
        }
        return done({ httpStatusCode: 409, message: "This userURL is already taken." });
      }
      return done({ httpStatusCode: 500, message: "Internal Server Error" });
    }
    return done(null, newUser);
  });
});
