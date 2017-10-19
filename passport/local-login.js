var utilsJWT = require('../utils/jwt');
const User = require('mongoose').model('user');
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
    password: password.trim()
  };

  // find a user by email address
  return User.findOne({
    email: userData.email
  }, (err, user) => {
    if (err) {
      let error = { type: "Internal Database Error" }
      return done(error);
    }

    if (!user) {
      let error = { type: "No Matching User Error", message: "No account associated with that email or invalid password" };
      return done(error);
    }

    // check if a hashed user's password is equal to a value saved in the database
    user.comparePassword(userData.password, (passwordErr, isMatch) => {
      if (err) {
        let error = { type: "Internal Database Error" }
        return done(error);
      }

      if (!isMatch) {
        let error = { type: "Incorrect Candidate Password Error", message: "No account associated with that email or invalid password" };
        return done(error);
      }
      
      let token = utilsJWT.generateToken(user); // Generate JWT Token
      return done(null, user, token);
    });
  });
});
