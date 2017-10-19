var validator = require('validator');
var passport = require('passport');

// Initial validation check before querying database
function validateSignupForm(payload) {
  const errors = {};
  let isFormValid = true;
  
  if (!payload.email || typeof payload.email !== 'string' || !validator.isEmail(payload.email)) {
    isFormValid = false;
    errors.email = 'Please provide a valid email address.';
  }
  
  if (!payload.password || typeof payload.password !== 'string') {
    errors.password = 'Please provide a valid password';
    isFormValid = false;
  } else if (payload.password.trim().length < 8) {
    errors.password = 'Password must have at least 8 characters.';
    isFormValid = false;
  } else if (payload.password.trim().length > 50) {
    errors.password = 'Password can have a maximum of 50 characters.';
    isFormValid = false;
  }

  if (!payload.userURL || typeof payload.userURL !== 'string') {
    isFormValid = false;
    errors.userURL = 'Please provide a userURL.';
  }

  return {
    success: isFormValid,
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
      // the Mongo code is for a duplicate key error
      // the 409 HTTP status code is for conflict error
      if (err.name === 'MongoError' && err.code === 11000) {
        let patt = new RegExp(/email/);
        let isDuplicateEmail = patt.test(err.message);
        let errors;
        if(isDuplicateEmail) {
          errors = { email: 'This email is already taken.' }
        } else {
          errors = { userURL: 'This userURL is already taken.' }
        }

        return res.status(409).json({
          success: false,
          message: 'Check the form for errors.',
          errors
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal Server Error'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'You have successfully signed up! Now you should be able to log in.'
    });
  })(req, res);
};

// Initial validation check before querying database
function validateLoginForm(payload) {
  const errors = {};
  let isFormValid = true;

  if (typeof payload.email !== 'string' || !validator.isEmail(payload.email)) {
    isFormValid = false;
    errors.email = 'Please provide a valid email address.';
  }

  if (typeof payload.password !== 'string' || payload.password.trim().length < 8) {
    isFormValid = false;
    errors.password = 'Password must have at least 8 characters.';
  }

  return {
    success: isFormValid,
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
  
  // Use passport local strategy to login to user.
  // authenticate() calls itself here, rather than being used as route middleware.
  // This gives the callback access to the req and res objects through closure.
  return passport.authenticate('local-login', (err, user, JWTToken) => {
    if (err) {
      switch(err.type) {
        case "No Matching User Error":
          return res.status(400).json({
            success: false,
            errors: { email: err.message }
          });
        case "Incorrect Candidate Password Error":
          return res.status(400).json({
            success: false,
            errors: { email: err.message }
          });
        default:
          return res.status(500)
      }
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

    return res.status(200).json({
      success: true,
      message: 'You have successfully logged in!',
      profile: userProfile,
      token: JWTToken
    });
  })(req, res);
}
