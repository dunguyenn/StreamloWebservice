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

var dateUploadedValidator = [ // Only dates after date.now permitted
    function (val) {
        var date = new Date();
        date.setHours(date.getHours() - 1);

        if(val < date){
            return false;
        } else {
            return true
        }
    },
    // Customer error text...
    'Enter a valid date'
];

//// Custom emunerations
var genreEnu = {
  values: 'Pop Rock Dance Country Alternative'.split(' '),
  message: 'Genre validator failed for path `{PATH}` with value `{VALUE}`'
};

var cityEnu = {
  values: 'Belfast Derry'.split(' '),
  message: 'Genre validator failed for path `{PATH}` with value `{VALUE}`'
};

var ObjectId = Schema.Types.ObjectId;
var trackSchema = new Schema({
	title: {
		type: String,
		required: true,
	 	maxlength: 100
    },
	genre: {
		type: String,
		required: true,
	 	enum: genreEnu
    },
	description: {
		type: String,
	 	maxlength: 4000
    },
	trackURL: { // Unique URL track will reside on
		type: String,
		unique: true,
		maxlength: 255, // A Track URL must be between 3 and 255 characters
		minlength: 3,
		validate: trackURLValidator
    },
    city: {
        type: String,
        required: true,
        maxlength: 20,
        minLength: 5,
        enum: cityEnu
    },
	numPlays: {
		type: Number,
        default: 0
    },
	numLikes: {
		type: Number,
        default: 0
    },
    numComments: {
        type: Number,
        default: 0
    },
    uploaderId: {
		type: ObjectId,
        required: true
    },
	dateUploaded: {
		type: Date,
		validate: dateUploadedValidator
    },
	trackBinary: {
		type: ObjectId,
        required: true
    },
    albumArtBinary: {
        type: ObjectId
    },
	comments: [{
        user: ObjectId,
        datePosted: Date,
        body: String
    }]
});



module.exports = mongoose.model('Track', trackSchema);
