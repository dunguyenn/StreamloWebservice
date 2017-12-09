const request = require('supertest');
const chai = require('chai');
const moment = require('moment');
const { Readable } = require('stream');
const fs = require('fs');

const should = chai.should();
const assert = chai.assert;

const mongodb = require('mongodb');
const ObjectID = require('mongodb').ObjectID;
const mongoose = require('mongoose');

const Track = require('../../models/trackModel.js');
const User = require('../../models/userModel.js');
const utilsJWT = require('../../utils/jwt');

describe('Track Service Integration Tests', function() {
  var app;
  var testUser;
  var testUserToken;
  var testTrackId;
  var testTrack;
  var trackGridFSId;
  
  before(function(done) {
    app = require('../../app');
    // create test user for use with track service tests
    const testUserData = new User({
      email: "test@hotmail.com",
      password: "password",
      userURL: "testurl",
      displayName: "testDisplayName",
      city: "Belfast"
    });
    
    User(testUserData).save((err, user) => {
      testUser = user;
      testUserToken = utilsJWT.generateToken(user);
    }).then(() => {
      // Add test track to database in order to test against.
      const readableTrackStream = new Readable();
      readableTrackStream.push(fs.readFileSync('test/littleidea.mp3'));
      readableTrackStream.push(null);
      
      let db = mongoose.connection.db;
      let bucket = new mongodb.GridFSBucket(db, {
        bucketName: 'trackBinaryFiles'
      });
      let uploadStream = bucket.openUploadStream("little idea", { contentType: 'audio/mp3' });
      trackGridFSId = uploadStream.id;
      readableTrackStream.pipe(uploadStream);
      
      uploadStream.on('finish', () => {
        testTrack = new Track({
          title: "little idea",
          genre: "Pop",
          city: "Belfast",
          trackURL: "testurl",
          dateUploaded: moment().add(30, 'minute'),
          uploaderId: testUser._id,
          description: "testDesc",
          trackBinaryId: trackGridFSId
        });

        Track(testTrack).save((err, track) => {
          testTrackId = track._id;
          return done();
        });
      });
    });
  });
  
  after(function(done) {
    app.close();
    // remove test user after track service tests finish
    User.findOneAndRemove({
        email: "test@hotmail.com"
      })
      .then(() => {
        // remove test track after track service tests finish
        Track.findOneAndRemove({ _id: testTrackId }, function(err) {
          return done();
        });
      });
  });
  
  describe('Public Track Endpoints', function() {
    describe('GET /tracks/', function() {
      it('returns status code 200 with valid data', function(done) {
        request(app)
          .get('/tracks?q=little+idea&page=0')
          .expect(200, done)
      });
      it('returns status code 404 with non-existent track name', function(done) {
        request(app)
          .get('/tracks?q=nonExistentTrack&page=0')
          .expect(404, done)
      });
      it('returns status code 200 with valid data and no page query string', function(done) {
        request(app)
          .get('/tracks?q=little+idea')
          .expect(200, done)
      });
    });
    
    describe('GET /tracks/:trackURL', function() {
      it('returns status code 200 with valid data', function(done) {
        request(app)
          .get('/tracks/' + testTrack.trackURL)
          .expect(200)
          .end(done)
      });
      it('returns status code 404 with non-existent track name', function(done) {
        request(app)
          .get('/tracks/nonExistentTrack')
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal("No track found with this trackURL");
          })
          .end(done)
      });
    });
    
    describe('GET /tracks/:trackId/stream', function() {
      it('returns status code 200 with valid trackBinaryId', function(done) {
        request(app)
          .get('/tracks/' + trackGridFSId + '/stream')
          .expect(200)
          .expect(function(res) {
            res.header['content-type'].should.equal("audio/mp3");
            res.header['accept-ranges'].should.equal("bytes");
          })
          .end(done)
      });
      it('returns status code 400 with invalid trackBinaryId', function(done) {
        request(app)
          .get('/tracks/123/stream')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid trackID");
          })
          .end(done)
      });
      it('returns status code 404 with non existent trackBinaryId', function(done) {
        request(app)
          .get('/tracks/69f5c1be7483f906c25169ae/stream')
          .expect(404)
          .end(done)
      });
    });
    
    describe('GET /tracks/uploaderId/:uploaderId', function() {
      it('returns status code 200 with valid uploaderId', function(done) {
        request(app)
          .get('/tracks/uploaderId/' + testUser._id)
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body);
            assert.lengthOf(res.body, 1);
          })
          .end(done)
      });
      it('returns status code 400 with invalid uploaderId', function(done) {
        request(app)
          .get('/tracks/uploaderId/123')
          .expect(400)
          .end(done)
      });
      it('returns status code 404 when no user matches uploaderId', function(done) {
        request(app)
          .get('/tracks/uploaderId/5a204aad5219defcba519575')
          .expect(404)
          .end(done)
      });
    });
    
    describe('GET /tracks/:city/chart', function() {
      it('returns status code 200 and a chart with valid city name', function(done) {
        request(app)
          .get('/tracks/Belfast/chart')
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body);
            assert.lengthOf(res.body, 1);
          })
          .end(done)
      });
      it('returns status code 200 and an empty array with city name that has no tracks associated with it', function(done) {
        request(app)
          .get('/tracks/NonExistentCity/chart')
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body);
            assert.lengthOf(res.body, 0);
          })
          .end(done)
      });
    });
  });

  describe('Protected Track Endpoints', function() {
    let uploadedTestTrackId;

    after(function(done) {
      Track.findOneAndRemove({ _id: uploadedTestTrackId }, function() {
        done();
      });
    });
    
    describe('POST /tracks/', function() {
      let validDate =  moment().toISOString();
      let invalidDateFormat = Date.now()
      let dateThirtyOneMinuteBeforeDateNow = moment().subtract(31, 'minute').toISOString();

      it('retuns status code 200 with valid data', function(done) {
        request(app)
          .post('/tracks')
          .set('x-access-token', testUserToken)
          .field('title', 'testTrack')
          .field('genre', 'Pop')
          .field('city', 'Belfast')
          .field('trackURL', 'test1')
          .field('dateUploaded', validDate)
          .field('uploaderId', testUser._id.toString())
          .field('description', 'testDesc')
          .attach('track', 'test/littleidea.mp3')
          .expect(201)
          .expect(function(res) {
            uploadedTestTrackId = res.body.trackBinaryId;
            res.body.message.should.equal("File uploaded successfully")
            assert.equal(ObjectID.isValid(res.body.trackBinaryId), true)
          })
          .end(done)
      });
      
      it('retuns status code 400 and correct message with no track title in body', function(done) {
        request(app)
          .post('/tracks')
          .set('x-access-token', testUserToken)
          .field('genre', 'Pop')
          .field('city', 'Belfast')
          .field('trackURL', 'test1')
          .field('dateUploaded', validDate)
          .field('uploaderId', '59c1764e79ec4c846007735f')
          .field('description', 'testDesc')
          .attach('track', 'test/littleidea.mp3')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No track title in request body.");
          })
          .end(done)
      });
      
      it('retuns status code 400 and correct message with no genre in body', function(done) {
        request(app)
          .post('/tracks')
          .set('x-access-token', testUserToken)
          .field('title', 'testTrack')
          .field('city', 'Belfast')
          .field('trackURL', 'test1')
          .field('dateUploaded', validDate)
          .field('uploaderId', testUser._id.toString())
          .field('description', 'testDesc')
          .attach('track', 'test/littleidea.mp3')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No genre in request body.");
          })
          .end(done)
      });
      
      it('retuns status code 400 and correct message with no city in body', function(done) {
        request(app)
          .post('/tracks')
          .set('x-access-token', testUserToken)
          .field('title', 'testTrack')
          .field('genre', 'Pop')
          .field('trackURL', 'test1')
          .field('dateUploaded', validDate)
          .field('uploaderId', testUser._id.toString())
          .field('description', 'testDesc')
          .attach('track', 'test/littleidea.mp3')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No city in request body.")
          })
          .end(done)
      });
      
      it('retuns status code 400 and correct message with no trackURL in body', function(done) {
        request(app)
          .post('/tracks')
          .set('x-access-token', testUserToken)
          .field('title', 'testTrack')
          .field('genre', 'Pop')
          .field('city', 'Belfast')
          .field('dateUploaded', validDate)
          .field('uploaderId', testUser._id.toString())
          .field('description', 'testDesc')
          .attach('track', 'test/littleidea.mp3')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No trackURL in request body.")
          })
          .end(done)
      });
      
      it('retuns status code 400 and correct message with no date uploaded in body', function(done) {
        request(app)
          .post('/tracks')
          .set('x-access-token', testUserToken)
          .field('title', 'testTrack')
          .field('genre', 'Pop')
          .field('city', 'Belfast')
          .field('trackURL', 'test1')
          .field('uploaderId', testUser._id.toString())
          .field('description', 'testDesc')
          .attach('track', 'test/littleidea.mp3')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No dateUploaded in request body.")
          })
          .end(done)
      });
      
      it('retuns status code 400 and correct message with invalid date format', function(done) {
        request(app)
          .post('/tracks')
          .set('x-access-token', testUserToken)
          .field('title', 'testTrack')
          .field('genre', 'Pop')
          .field('city', 'Belfast')
          .field('dateUploaded', invalidDateFormat)
          .field('trackURL', 'test1')
          .field('uploaderId', testUser._id.toString())
          .field('description', 'testDesc')
          .attach('track', 'test/littleidea.mp3')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid dateUploaded in request body.")
          })
          .end(done)
      });
      
      it('retuns status code 400 and correct message with date more then thirty mins before date now', function(done) {
        request(app)
          .post('/tracks')
          .set('x-access-token', testUserToken)
          .field('title', 'testTrack')
          .field('genre', 'Pop')
          .field('city', 'Belfast')
          .field('dateUploaded', dateThirtyOneMinuteBeforeDateNow)
          .field('trackURL', 'test1')
          .field('uploaderId', testUser._id.toString())
          .field('description', 'testDesc')
          .attach('track', 'test/littleidea.mp3')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Date invalid, it is more then thirty minutes before upload date.")
          })
          .end(done)
      });
      
      it('retuns status code 400 and correct message with no uploaderId in body', function(done) {
        request(app)
          .post('/tracks')
          .set('x-access-token', testUserToken)
          .field('title', 'testTrack')
          .field('genre', 'Pop')
          .field('city', 'Belfast')
          .field('trackURL', 'test1')
          .field('dateUploaded', validDate)
          .field('description', 'testDesc')
          .attach('track', 'test/littleidea.mp3')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No uploaderId in request body.")
          })
          .end(done)
      });
      
      it('retuns status code 400 and correct message with no description in body', function(done) {
        request(app)
          .post('/tracks')
          .set('x-access-token', testUserToken)
          .field('title', 'testTrack')
          .field('genre', 'Pop')
          .field('city', 'Belfast')
          .field('trackURL', 'test1')
          .field('dateUploaded', validDate)
          .field('uploaderId', testUser._id.toString())
          .attach('track', 'test/littleidea.mp3')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No description in request body.")
          })
          .end(done)
      });
      
      it('retuns status code 400 and correct message with no track in body', function(done) {
        request(app)
          .post('/tracks')
          .set('x-access-token', testUserToken)
          .field('title', 'testTrack')
          .field('genre', 'Pop')
          .field('city', 'Belfast')
          .field('trackURL', 'test1')
          .field('dateUploaded', validDate)
          .field('uploaderId', testUser._id.toString())
          .field('description', 'testDesc')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No track in request body.")
          })
          .end(done)
      });
      
      it('retuns status code 400 and correct message with track key set to string value', function(done) {
        request(app)
          .post('/tracks')
          .set('x-access-token', testUserToken)
          .field('title', 'testTrack')
          .field('genre', 'Pop')
          .field('city', 'Belfast')
          .field('trackURL', 'test1')
          .field('dateUploaded', validDate)
          .field('uploaderId', testUser._id.toString())
          .field('description', 'testDesc')
          .field('track', 'test/littleidea.mp3')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Error uploading your track")
          })
          .end(done)
      });
      
      it('returns status code 400 and correct message with uploaderId set to userId that is not associated with any user account', function(done) {
        request(app)
          .post('/tracks')
          .set('x-access-token', testUserToken)
          .field('title', 'testTrack')
          .field('genre', 'Pop')
          .field('city', 'Belfast')
          .field('trackURL', 'test1')
          .field('dateUploaded', validDate)
          .field('uploaderId', '5a22de9e05781964731340cc')
          .field('description', 'testDesc')
          .attach('track', 'test/littleidea.mp3')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No User account associated with uploaderID")
          })
          .end(done)
      });
    });
    
    describe('POST /tracks/:trackURL/comments', function() {
      it('returns status code 200 with valid data', function(done) {
        request(app)
          .post('/tracks/test1/comments')
          .set('x-access-token', testUserToken)
          .send('user=' + testUser._id)
          .send('date=' + Date.now())
          .send('body=testComment')
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal("Comment successfully added")
          })
          .end(done)
      });
      it('returns status code 400 with invalid userId format', function(done) {
        request(app)
          .post('/tracks/test1/comments')
          .set('x-access-token', testUserToken)
          .send('user=invalid')
          .send('date=' + Date.now())
          .send('body=testComment')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid userID format")
          })
          .end(done)
      });
      it('returns status code 400 with userId that is not associated with a user in database', function(done) {
        request(app)
          .post('/tracks/test1/comments')
          .set('x-access-token', testUserToken)
          .send('user=5a29a767dbfefada3041b944')
          .send('date=' + Date.now())
          .send('body=testComment')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No user associated with the commenter")
          })
          .end(done)
      });
      it('returns status code 400 with trackURL that is not associated with a track in database', function(done) {
        request(app)
          .post('/tracks/nonExistentTrackURL/comments')
          .set('x-access-token', testUserToken)
          .send('user=' + testUser._id)
          .send('date=' + Date.now())
          .send('body=testComment')
          .expect(400, done)
      });
    });
    
    describe.skip('PATCH /tracks/:trackURL/addDescription', function() {
      it('does something', function(done) {
        done();
      });
    });
    
    describe('PATCH /tracks/:trackURL/title', function() {
      it('returns status code 200 with valid data', function(done) {
        let newTrackTitle = "even littler idea";
        request(app)
          .patch(`/tracks/${testTrack.trackURL}/title`)
          .set('x-access-token', testUserToken)
          .send('newTitle=' + newTrackTitle)
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal(`Old track title (${testTrack.title}) updated. New title is (${newTrackTitle})`)
          })
          .end(done)
      });
      it('returns status code 400 with trackURL that is not associated with a track in database', function(done) {
        request(app)
          .patch('/tracks/nonExistentTrackURL/title')
          .set('x-access-token', testUserToken)
          .send('newTitle=' + 'even littler idea')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No track associated with that trackURL")
          })
          .end(done)
        });
    });
    
    describe.skip('DELETE /tracks/:trackURL', function() {
      it('does something', function(done) {
        done();
      });
    });
  });
});