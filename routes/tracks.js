var express = require('express');
var router = express.Router();
var multer = require('multer');
var upload = multer({ dest: './uploads/' });
var trackController = require('../controllers/trackController.js');


// GET all matching tracks by title
router.get('/', function(req, res) {
    return trackController.getTracksByTitle(req, res);
});

router.get('/:trackURL', function(req, res) {
    return trackController.getTrackByURL(req, res);
});

// GET stream of track by ID
router.get('/:trackId/stream', function(req, res) {
    return trackController.getTrackStreamByGridFSId(req, res);
});

// GET number of mathching tracks by title
router.get('/getNumOfTracks', function(req, res) {
    return trackController.getNumberOfTracksByTitle(req, res);
});

// POST track to the system
router.post('/', upload.single('track'), function(req, res) {
    return trackController.postTrack(req, res);
});

// Add description to track by id
router.post

router.patch('/:trackURL', function(req, res) {
    return trackController.updateTrackTitleByTrackURL(req, res);
});

router.delete('/:trackURL', function(req, res) {
    return trackController.deleteTrackByTrackURL(req, res);
});

module.exports = router;
