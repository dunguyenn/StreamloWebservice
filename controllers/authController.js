var validator = require("validator");
var passport = require("passport");

// Initial validation check before querying database
function validateSignupForm(payload) {
  if (!payload.email || typeof payload.email !== "string" || !validator.isEmail(payload.email)) {
    return {
      success: false,
      message: "Please provide a valid email address."
    };
  }

  if (!payload.password || typeof payload.password !== "string") {
    return {
      success: false,
      message: "Please provide a valid password."
    };
  } else if (payload.password.trim().length < 8) {
    return {
      success: false,
      message: "Password must have at least 8 characters."
    };
  } else if (payload.password.trim().length > 50) {
    return {
      success: false,
      message: "Password can have a maximum of 50 characters."
    };
  }

  if (!payload.userURL || typeof payload.userURL !== "string") {
    return {
      success: false,
      message: "Please provide a userURL."
    };
  } else if (payload.userURL.trim().length > 20) {
    return {
      success: false,
      message: "UserURL can have a maximum of 20 characters"
    };
  }

  if (!payload.displayName || typeof payload.displayName !== "string") {
    return {
      success: false,
      message: "Please provide a display name."
    };
  } else if (payload.displayName.trim().length > 20) {
    return {
      success: false,
      message: "Display name can have a maximum of 20 characters"
    };
  }

  if (!payload.city || typeof payload.city !== "string") {
    return {
      success: false,
      message: "Please provide a city name."
    };
  }

  return {
    success: true
  };
}

exports.createUserAccount = function(req, res) {
  const validationResult = validateSignupForm(req.body);
  if (!validationResult.success) {
    return res.status(400).json({
      message: validationResult.message
    });
  }

  // Use passport local strategy to create user account.
  // authenticate() calls itself here, rather than being used as route middleware.
  // This gives the callback access to the req and res objects through closure.
  return passport.authenticate("local-signup", (err, user) => {
    if (err) {
      return res.status(err.httpStatusCode).json({
        message: err.message
      });
    }

    return res.status(200).json({
      message: "You have successfully signed up! Now you should be able to log in."
    });
  })(req, res);
};

// Initial validation check before querying database
function validateLoginForm(payload) {
  if (typeof payload.email !== "string" || !validator.isEmail(payload.email)) {
    return {
      success: false,
      message: "Please provide a valid email address."
    };
  }

  if (!payload.password || typeof payload.password !== "string") {
    return {
      success: false,
      message: "Please provide a valid password."
    };
  } else if (payload.password.trim().length < 8) {
    return {
      success: false,
      message: "Password must have at least 8 characters."
    };
  } else if (payload.password.trim().length > 50) {
    return {
      success: false,
      message: "Password can have a maximum of 50 characters."
    };
  }

  return {
    success: true
  };
}

exports.login = function(req, res) {
  const validationResult = validateLoginForm(req.body);
  if (!validationResult.success) {
    return res.status(400).json({
      message: validationResult.message
    });
  }

  // Use passport local strategy to login to user.
  // authenticate() calls itself here, rather than being used as route middleware.
  // This gives the callback access to the req and res objects through closure.
  return passport.authenticate("local-login", (err, user, JWTToken) => {
    if (err) {
      return res.status(err.httpStatusCode).json({
        message: err.message
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

    return res.status(200).json({
      message: "You have successfully logged in!",
      profile: userProfile,
      token: JWTToken
    });
  })(req, res);
};
