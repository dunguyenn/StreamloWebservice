var express = require('express');
var router = express.Router();
var multer = require('multer');
var upload = multer({ dest: './uploads/' });
var trackController = require('../controllers/trackController.js');


// GET all matching tracks by title
router.get('/', function(req, res) {
    return trackController.getTracksByTitle(req, res);
});

// GET track by trackURL
router.get('/:trackURL', function(req, res) {
    return trackController.getTrackByURL(req, res);
});

// GET stream of track by ID
router.get('/:trackId/stream', function(req, res) {
    return trackController.getTrackStreamByGridFSId(req, res);
});

// GET all tracks with uploaderId
router.get('/uploaderId/:uploaderId', function(req, res) {
    return trackController.getTracksByUploaderId(req, res);
});

// GET number of mathching tracks by title
router.get('/getNumOfTracks', function(req, res) {
    return trackController.getNumberOfTracksByTitle(req, res);
});

// GET top 10 tracks of city sorted by number of plays
router.get('/:city/chart', function(req, res) {
    return trackController.getChartOfCity(req, res);
});

// POST track to the system
// TODO Add auth nessesary
router.post('/', upload.single('track'), function(req, res) {
    return trackController.postTrack(req, res);
});

// Add comment to track by trackURL
// TODO Add auth nessesary
router.post('/:trackURL/addComment',function(req, res) {
    return trackController.addCommentToTrackByTrackURL(req, res);
});

// Add desciption to track by trackURL
router.post('/:trackURL/addDescription', function(req, res) {
    //return trackController.addCommentToTrackByTrackURL(req, res);
});


router.patch('/:trackURL', function(req, res) {
    return trackController.updateTrackTitleByTrackURL(req, res);
});

router.delete('/:trackURL', function(req, res) {
    return trackController.deleteTrackByTrackURL(req, res);
});

module.exports = router;
