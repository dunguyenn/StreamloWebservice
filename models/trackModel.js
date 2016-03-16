var mongoose = require('mongoose');
var validator = require('validator');
var Schema = mongoose.Schema;

//// Custom Validators
var trackURLValidator = [ // Only numbers, letters, underscores and hyphens are permitted
    function (val) {
		var regex = new RegExp('^[-a-zA-z0-9_]*$');
		return regex.test(val);
    },
    // Customer error text...
    'Track URL must be valid'
];

// TODO Complete dateUploadedValidator
var dateUploadedValidator = [ // Only dates after date.now permitted
    function (val) {
		return true
    },
    // Customer error text...
    'Enter a valid date'
];

//// Custom emunerations
var genreEnu = {
  values: 'Pop Rock Dance Country Alternative'.split(' '),
  message: 'Genre validator failed for path `{PATH}` with value `{VALUE}`'
}

var trackSchema = new Schema({
	title: {
		type: String,
		required: true,
	 	maxlength: 100 },
	artist: {
		type: String,
		required: true,
		maxlength: 50 },
	genre: {
		type: String,
		required: true,
	 	enum: genreEnu },
	description: {
		type: String,
	 	maxlength: 4000 },
	trackURL: { // Unique URL track will reside on
		type: String,
		unique: true,
		maxlength: 255, // A Track URL must be between 3 and 255 characters
		minlength: 3,
		validate: trackURLValidator },
	tags: {
		type: String },
	numPlays: {
		type: Number },
	numLikes: {
		type: Number },
	dateUploaded: {
		type: Date,
		validate: dateUploadedValidator},
	track: {
		type: Buffer },
	comments: {
		type: String }
});

module.exports = mongoose.model('Track', trackSchema);
