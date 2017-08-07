var User = require('../models/userModel.js');
var mongoose = require('mongoose');
var validator = require('validator');
var passport = require('passport');
var fs = require('fs');
var grid = require('gridfs-stream');
var conn = mongoose.connection;
grid.mongo = mongoose.mongo;

exports.getUserByName = function(req, res) {
    var perPage = 5
    var page = Math.max(0, req.query.page);
    var requestedUsername = req.query.q;

    var query = User.find({ displayName : requestedUsername });

    query.limit(5)
        .skip(perPage * page)
        .exec(function(err, results){
            if(err)
                res.sendStatus(500);
            else
                res.json(results);
        });
};

exports.getNumberOfPeopleByDisplayName = function(req, res) {
    var displayName = req.query.q;
    var query = User.count({ displayName : displayName });

    query.exec(function(err, results){
            if(err)
                res.sendStatus(500);
            else
                res.json(results);
        });
};

// TODO implement server side validation for signup form
/**
 * Validate the sign up form
 *
 * @param {object} payload - the HTTP body message
 * @returns {object} The result of validation. Object contains a boolean validation result,
 *                   errors tips, and a global message for the whole form.
 */
function validateSignupForm(payload) {
  const errors = {};
  let isFormValid = true;
  let message = '';

  if (!payload || typeof payload.email !== 'string' || !validator.isEmail(payload.email)) {
    isFormValid = false;
    errors.email = 'Please provide a correct email address.';
  }

  if (!payload || typeof payload.password !== 'string' || payload.password.trim().length < 8) {
    isFormValid = false;
    errors.password = 'Password must have at least 8 characters.';
  }

  if (!payload || typeof payload.userURL !== 'string' ) {
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
  // authenticate() itself here, rather than being used as route middleware.
  // This gives the callback access to the req and res objects through closure.
  return passport.authenticate('local-signup', (err) => {
    if (err) {
      if (err.name === 'MongoError' && err.code === 11000) {
        // the Mongo code is for a duplicate key error
        // the 409 HTTP status code is for conflict error
        return res.status(409).json({
          success: false,
          message: 'Check the form for errors.',
          errors: {
            email: 'This email or userURL is already taken.' //TODO more specific error message for duplicate email/userURL
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

// TODO check this is working
exports.addProfilePictureToUser = function(req, res) {
    var uploadedFileId;

    var fileName = req.body.userURL;
    var filePath = req.file.path;
    var filetype = req.file.mimetype;

    var gfs = grid(conn.db);

    // Streaming to gridfs
    // Filename to store in mongodb
    var writestream = gfs.createWriteStream({
        filename: fileName,
        content_type: 'image/jpeg'
    });
    fs.createReadStream(filePath).pipe(writestream);

    writestream.on('close', function (file) {
        uploadedFileId = file._id;
        console.log(file.filename + 'Written To DB');

        var query = User.update({ trackURL: req.body.userURL}, { profilePictureBinary: uploadedFileId} );

        query.exec(function(err) {
            if(err){
                gfs.remove({_id: uploadedFileId}, function (gfserr) {
                  if (gfserr){
                      console.log("error removing gridfs file");
                  }
                  console.log('Removed gridfs file after unsuccessful db update');
                });
                fs.unlink(filePath);
                res.status(500).send(err);
            } else {
                fs.unlink(filePath);
                res.sendStatus(200);
            }
        });
    });
};

exports.getUserByURL = function(req, res) {
    var userURL = req.params.userURL;
    var query = User.findOne({userURL: userURL});

    query.exec(function(err, results){
            if(err)
                res.sendStatus(500);
            else
                res.json(results);
        });
};

exports.getUserById = function(req, res) {
    var userId = req.params.userId;
    var query = User.findOne({_id: userId});

    query.exec(function(err, results){
            if(err)
                res.sendStatus(500);
            else
                res.json(results);
        });
};
