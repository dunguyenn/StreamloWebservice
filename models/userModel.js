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

//// Custom emunerations
var cityEnu = {
  values: 'Belfast Derry-Londonderry'.split(' '),
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
        unique: true,
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

module.exports = mongoose.model('User', userModel);
