var mongoose = require('mongoose');
var validator = require('validator');
var bcrypt = require('bcrypt');
var Schema = mongoose.Schema;
const SALT_WORK_FACTOR = 10;

// Custom Validators
var emailAddressValidator = [
  function(val) {
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

function toLower(val) {
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
  },
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

userModel.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

// The pre-save hook method.
userModel.pre('save', function saveHook(next) {
  const user = this;

  // proceed further only if the password is modified or the user is new
  if (!user.isModified('password')) return next();

  // Generate a salt
  return bcrypt.genSalt(SALT_WORK_FACTOR, (saltError, salt) => {
    if (saltError) {
      return next(saltError);
    }

    // hash the password along with our new salt
    return bcrypt.hash(user.password, salt, (hashError, hash) => {
      if (hashError) {
        return next(hashError);
      }

      // replace the cleartext password with the hashed one
      user.password = hash;

      return next();
    });
  });
});

module.exports = mongoose.model('user', userModel);
