var validator = require('validator');
var passport = require('passport');
var utilsJWT = require('../utils/jwt');

/**
 * Validate the sign up form
*/
function validateSignupForm(payload) {
  const errors = {};
  let isFormValid = true;
  let message = '';

  if (!payload || typeof payload.email !== 'string' || !validator.isEmail(payload.email)) {
    isFormValid = false;
    errors.email = 'Please provide a valid email address.';
  }

  if (!payload || typeof payload.password !== 'string' || payload.password.trim().length < 8) {
    isFormValid = false;
    errors.password = 'Password must have at least 8 characters.';
  }

  if (!payload || typeof payload.userURL !== 'string') {
    isFormValid = false;
    errors.userURL = 'Please provide a userURL.';
  }

  if (!isFormValid) {
    message = 'Check the form for errors.';
  }

  return {
    success: isFormValid,
    message,
    errors
  };
}

exports.createUserAccount = function(req, res) {
  // Run request body through server side validation
  const validationResult = validateSignupForm(req.body);

  // Check if request body passed server side validation
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: validationResult.message,
      errors: validationResult.errors
    });
  }

  // Use passport local strategy to create user account.
  // authenticate() calls itself here, rather than being used as route middleware.
  // This gives the callback access to the req and res objects through closure.
  return passport.authenticate('local-signup', (err, user) => {
    if (err) {
      if (err.name === 'MongoError' && err.code === 11000) {
        // the Mongo code is for a duplicate key error
        // the 409 HTTP status code is for conflict error
        return res.status(409).json({
          success: false,
          message: 'Check the form for errors.',
          errors: {
            email: 'This email or userURL is already taken.' // TODO more specific error message for duplicate email/userURL
          }
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Could not process the form.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'You have successfully signed up! Now you should be able to log in.'
    });
  })(req, res);
};

function validateLoginForm(payload) {
  const errors = {};
  let isFormValid = true;
  let message = '';

  if (!payload || typeof payload.email !== 'string' || !validator.isEmail(payload.email)) {
    isFormValid = false;
    errors.email = 'Please provide a valid email address.';
  }

  if (!payload || typeof payload.password !== 'string' || payload.password.trim().length < 8) {
    isFormValid = false;
    errors.password = 'Password must have at least 8 characters.';
  }

  if (!isFormValid) {
    message = 'Check the form for errors.';
  }

  return {
    success: isFormValid,
    message,
    errors
  };
}

exports.login = function(req, res) {
  // Run request body through server side validation
  const validationResult = validateLoginForm(req.body);

  // Check if request body passed server side validation
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      message: validationResult.message,
      errors: validationResult.errors
    });
  }

  // Use passport local strategy to create user account.
  // authenticate() calls itself here, rather than being used as route middleware.
  // This gives the callback access to the req and res objects through closure.
  return passport.authenticate('local-login', (err, user) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.name
      });
    }

    let userProfile = {
      id: user._id,
      email: user.email,
      //email_verified: user.email_verified, // TODO add email verification
      userURL: user.userURL,
      displayName: user.displayName,
      city: user.city,
      numTracksUploaded: user.numberOfTracksUploaded,
      numFollowedUsers: user.numberOfFollowedUsers,
      numFollowers: user.numberOfFollowers
    };

    let token = utilsJWT.generateToken(user); // Generate JWT Token

    return res.status(200).json({
      success: true,
      message: 'You have successfully logged in!',
      profile: userProfile,
      token: token
    });
  })(req, res);
}
