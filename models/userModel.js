var mongoose = require("mongoose");
var validator = require("validator");
var bcrypt = require("bcrypt");
var Schema = mongoose.Schema;
const SALT_WORK_FACTOR = 10;

// Custom Validators
var emailAddressValidator = [
  function(val) {
    return validator.isEmail(val);
  },
  // Customer error text...
  "Enter a valid email address."
];

// Custom emunerations
var cityEnu = {
  values: "Belfast Derry".split(" "),
  message: "City validation failed"
};

function toLower(val) {
  return val.toLowerCase();
}

var ObjectId = Schema.Types.ObjectId;
var userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    set: toLower,
    validate: emailAddressValidator
  },
  password: {
    type: String,
    required: true
  },
  userURL: {
    type: String,
    required: true,
    maxlength: 20,
    unique: true
  },
  displayName: {
    type: String,
    required: true,
    maxlength: 20
  },
  city: {
    type: String,
    required: true,
    enum: cityEnu
  },
  numberOfFollowers: {
    type: Number,
    default: 0
  },
  numberOfFollowees: {
    type: Number,
    default: 0
  },
  numberOfTracksUploaded: {
    type: Number,
    default: 0
  },
  profileImageGridFSId: {
    type: ObjectId
  },
  likedTracks: [
    {
      likedTrack: {
        type: ObjectId
      }
    }
  ],
  followees: [
    {
      userId: {
        type: ObjectId
      }
    }
  ],
  uploadedTracks: [
    {
      trackID: {
        type: ObjectId
      }
    }
  ]
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

// The pre-save hook method.
userSchema.pre("save", function saveHook(next) {
  const user = this;

  // proceed further only if the password is modified or the user is new
  if (!user.isModified("password")) return next();

  // check if candidate password is within password constraints
  let candidatePasswordLength = user.password.length;
  if (candidatePasswordLength < 8) {
    let validationError = new Error("Password constraints error. Password is under the minimum length of 8 characters");
    return next(validationError);
  }

  if (candidatePasswordLength > 50) {
    let validationError = new Error("Password constraints error. Password is over the maximum length of 50 characters");
    return next(validationError);
  }

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

// after removal of a user, also remove of the users uploaded tracks
userSchema.post("findOneAndRemove", function(doc) {
  const Track = require("../models/trackModel.js");

  if (doc == null || doc.uploadedTracks === undefined || doc.uploadedTracks.length == 0) {
    // array empty or does not exist
    return;
  } else {
    doc.uploadedTracks.forEach((track, index, array) => {
      Track.findOneAndRemove({ _id: track.trackID }, function(err) {
        return;
      });
    });
  }

  // TODO post findOneAndRemove on User - also remove associated profile pictures
});

module.exports = mongoose.model("user", userSchema);
