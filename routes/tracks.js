var express = require('express');
var router = express.Router();
var trackController = require('../controllers/trackController.js');

// GET all matching tracks by title
router.get('/', function(req, res) {
    return trackController.getTracksByTitle(req, res)
});

// GET number of mathching tracks by title
router.get('/getNumOfTracks', function(req, res) {
    return trackController.getNumberOfTracksByTitle(req, res)
});

router.post('/', function(req, res) {
    return trackController.postTrack(req, res)
});

router.patch('/:trackURL', function(req, res) {
    return trackController.updateTrackByTrackURL(req, res)
});

router.delete('/:trackURL', function(req, res) {
    return trackController.deleteTrackByTrackURL(req, res)
});

module.exports = router;
