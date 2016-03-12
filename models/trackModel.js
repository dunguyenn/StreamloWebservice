var mongoose = require('mongoose');
	Schema = mongoose.Schema;

var trackModel = new Schema({
	title: {type: String},
	artist: {type: String},
	genre: {type: String},
	numPlays: {type: Number},
	numLikes: {type: Number},
	dateUploaded: {type: Date},
	track: {type: Buffer},
	comments: [{body: String, date: Date}]
});

// Possible use child schema for comments
/*
var commentsSchema = new Schema({

});
*/

module.exports = mongoose.model('Track', trackModel);
