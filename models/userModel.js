var mongoose = require('mongoose');
var validator = require('validator');
var Schema = mongoose.Schema;

// Custom Validators
var emailAddressValidator = [
    function (val) {
        return validator.isEmail(val);
    },
    // Customer error text...
    'Enter a valid email address.'
];

// Custom emunerations
var cityEnu = {
  values: 'Belfast Derry'.split(' '),
  message: 'Genre validator failed for path `{PATH}` with value `{VALUE}`'
};

function toLower(val){
    return val.toLowerCase();
}

var ObjectId = Schema.Types.ObjectId;
var userModel = new Schema({
	email: {
        type: String,
        required: true,
        unique: true,
        set: toLower,
        validate: emailAddressValidator
    },
    password: {
        type: String,
        required: true,
        maxlength: 50,
        minLength: 5
    },
    userURL: { // This will be users unique page url
        type: String,
        required: true,
        unique: true
    }, // Must be unique
    displayName: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true,
        maxlength: 20,
        minLength: 5,
        enum: cityEnu
    },
    numberOfFollowers: {
        type: Number,
        default: 0
    },
    numberOfFollowedUsers: {
        type: Number,
        default: 0
    },
    numberOfTracksUploaded: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        maxlength: 100
    },
    profilePictureBinary: {
        type: ObjectId
    },
    likedTracks: [{
        likedTrack: {
            type: ObjectId
        }
    }],
    followedUsers: [{
        followedUser: {
            type: ObjectId
        }
    }],
    uploadedTracks: [{
        uploadedTrackId: {
            type: ObjectId
        }
    }]
});

userModel.methods.validPassword = function (password, cb) {
  return this.model('User').findOne({
      email: this.email,
      password: password
    },
    function (err, row) {
      if (row) {
          cb(true);
      } else {
          cb(false);
      }
  });
};

/**
 * The pre-save hook method.
 */
 /*
userModel.pre('save', function saveHook(next) {
  const user = this;

  // proceed further only if the password is modified or the user is new
  if (!user.isModified('password')) return next();


  return bcrypt.genSalt((saltError, salt) => {
    if (saltError) { return next(saltError); }

    return bcrypt.hash(user.password, salt, (hashError, hash) => {
      if (hashError) { return next(hashError); }

      // replace a password string with hash value
      user.password = hash;

      return next();
    });
  });
});
*/

module.exports = mongoose.model('User', userModel);
