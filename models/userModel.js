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
    },
    userURL: { // This will be users unique page url
        type: String,
        required: true,
        unique: true,
    }, // Must be unique
    displayName: {
        type: String,
    },
    city: {
        type: String,
        required: true,
        maxlength: 20,
        minLength: 5
    },
    numberOfFollowers: {
        type: Number
    },
    numberOfFollowedUsers: {
        type: Number
    },
    description: {
        type: String,
        maxlength: 100
    },
    likedTracks: [{
        likedTrack: {
            type: ObjectId,
        }
    }],
    followedUsers: [{
        followedUser: {
            type: ObjectId,
        }
    }],
    uploadedTracks: [{
        uploadedTrackId: {
            type: ObjectId
        }
    }],


    //Playlists: [{type: objectId}],
});

var TrackSchema = new Schema({
    name: {
        type: String },
});


module.exports = mongoose.model('User', userModel);
