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
  User.find({}, (err, count) => {
    console.log(count);
  });
  //console.log(userData.email);
  // find a user by email address
  return User.findOne({
    email: userData.email
  }, (err, user) => {
  //  console.log(user);
  //  console.log(err);
    if (err) {
      return done(err);
    }

    if (!user) {
      const error = new Error('Incorrect email or password');
      error.name = 'IncorrectCredentialsError';

      return done(error);
    }

    // check if a hashed user's password is equal to a value saved in the database
    user.comparePassword(userData.password, (passwordErr, isMatch) => {
      if (err) {
        return done(err);
      }

      if (!isMatch) {
        const error = new Error('Incorrect email or password');
        error.name = 'IncorrectCredentialsError';

        return done(error);
      }
      let token = utilsJWT.generateToken(user); // Generate JWT Token
      return done(null, user, token);
    });
  });
});
