var express = require('express');
var router = express.Router();
var trackController = require('../controllers/trackController.js');

// GET track by title route
router.get('/:trackTitle', function(req, res) {
    return trackController.getTracksByTitle(req, res)
});

router.post('/', function(req, res) {
    return trackController.postTrack(req, res)
});

module.exports = router;
