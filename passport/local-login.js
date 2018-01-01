var utilsJWT = require("../utils/jwt");
const User = require("mongoose").model("user");
const PassportLocalStrategy = require("passport-local").Strategy;

/**
 * Return the Passport Local Strategy object.
 */
module.exports = new PassportLocalStrategy(
  {
    usernameField: "email",
    passwordField: "password",
    session: false,
    passReqToCallback: true
  },
  (req, email, password, done) => {
    const userData = {
      email: email.trim(),
      password: password.trim()
    };

    // find a user by email address
    return User.findOne(
      {
        email: userData.email
      },
      (err, user) => {
        if (err) {
          return done({ httpStatusCode: 500, message: "Internal Database Error" });
        }

        if (!user) {
          return done({ httpStatusCode: 400, message: "No account associated with that email or invalid password" });
        }

        // check if a hashed user's password is equal to a value saved in the database
        user.comparePassword(userData.password, (passwordErr, isMatch) => {
          if (err) {
            return done({ httpStatusCode: 500, message: "Internal Database Error" });
          }

          if (!isMatch) {
            return done({ httpStatusCode: 400, message: "No account associated with that email or invalid password" });
          }

          let token = utilsJWT.generateToken(user); // Generate JWT Token
          return done(null, user, token);
        });
      }
    );
  }
);
