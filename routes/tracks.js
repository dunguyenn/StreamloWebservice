var express = require('express');
var router = express.Router();
var trackController = require('../controllers/trackController.js');

// GET new track search result page
router.get('/tracks', function(req, res) {
    return trackController.getTracks(req, res)
});

router.get('/tracks/:trackTitle', function(req, res) {
    return trackController.getTracksByTitle(req, res)
});


module.exports = router;
