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

var userModel = new Schema({
	email: {
        type: String,
        required: true,
        unique: true,
        set: toLower,
        validate: emailAddressValidator },
    password: {
        type: String,
        required: true, },
    userURL: { // This will be users unique page url
        type: String,
        required: true,
        unique: true, }, // Must be unique
    displayName: {
        type: String, },
    city: {
        type: String,
        required: true },
    //likedTracks: [{type: objectId }],
    //FollowedUsers: [type: objectId}],
    //Playlists: [{type: objectId}],
});

var TrackSchema = new Schema({
    name: {
        type: String },
});


module.exports = mongoose.model('User', userModel);
