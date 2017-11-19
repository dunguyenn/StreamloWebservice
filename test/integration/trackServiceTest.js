const request = require('supertest');
const chai = require('chai');

let should = chai.should();
let assert = chai.assert;

const mongodb = require('mongodb');
const mongoose = require('mongoose');
const Track = require('../../models/trackModel.js');

describe('Public Track Service Integration Tests', function() {
  var app;

  beforeEach(function() {
    app = require('../../app');
  });
  afterEach(function() {
    app.close();
  });
  
  describe('GET /tracks/', function() {
    it('returns status code 200 with valid data', function(done) {
      request(app)
        .get('/tracks?q=november&page=0')
        .expect(200, done)
    });
    it('returns status code 404 with non-existent track name', function(done) {
      request(app)
        .get('/tracks?q=nonExistentTrack&page=0')
        .expect(404, done)
    });
    it('returns status code 200 with valid data and no page query string', function(done) {
      request(app)
        .get('/tracks?q=november')
        .expect(200, done)
    });
  });
  
  describe('GET /tracks/:trackURL', function() {
    it('returns status code 200 with valid data', function(done) {
      request(app)
        .get('/tracks/november1')
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
        .get('/tracks/59c1793d823ebd9964b3188b/stream')
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
  
  describe.skip('GET /tracks/uploaderId/:uploaderId', function() {
    it('does something', function(done) {
      done();
    });
  });
  
  describe.skip('GET /tracks/:city/chart', function() {
    it('does something', function(done) {
      done();
    });
  });
});

describe('Protected Track Service', function() {
  var app;
  var token;
  var userId;

  before(function(done) {
    app = require('../../app');

    request(app)
      .post('/auth/login')
      .send('email=test@hotmail.com')
      .send('password=password')
      .expect(200)
      .end(function(err, res) {
        token = res.body.token;
        userId = res.body.profile.id;
        app.close();
        done();
      });
  });
  beforeEach(function() {
    app = require('../../app');
  });
  afterEach(function() {
    app.close();
  });

  describe('POST /tracks/', function() {
    let testTrackId;
    after(function(done) {
      Track.findOne({ _id: testTrackId }, function(err, track){
        track.remove(function(err){
           done();
        });
      });
    });
    it('retuns status code 200 with valid data', function(done) {
      request(app)
        .post('/tracks')
        .set('x-access-token', token)
        .field('title', 'testTrack')
        .field('genre', 'Pop')
        .field('city', 'Belfast')
        .field('trackURL', 'test1')
        .field('dateUploaded', Date.now())
        .field('uploaderId', userId)
        .field('description', 'testDesc')
        .attach('track', 'test/littleidea.mp3')
        .expect(201)
        .expect(function(res) {
          testTrackId = res.body.trackId;
        })
        .end(done)
    });
    
    it('retuns status code 400 and correct message with missing track title', function(done) {
      request(app)
        .post('/tracks')
        .set('x-access-token', token)
        .field('genre', 'Pop')
        .field('city', 'Belfast')
        .field('trackURL', 'test1')
        .field('dateUploaded', Date.now())
        .field('uploaderId', '59c1764e79ec4c846007735f')
        .field('description', 'testDesc')
        .attach('track', 'test/littleidea.mp3')
        .expect(400)
        .expect(function(res) {
          res.body.message.should.equal("No track title in request body.");
        })
        .end(done)
    });
  });
  
  describe('POST /tracks/:trackURL/addComment', function() {
    after(function(done) {
      // TODO add removing test comment after this test suite has finished
      done()
    });
    it('returns status code 200 with valid data', function(done) {
      request(app)
        .post('/tracks/november/addComment')
        .set('x-access-token', token)
        .send('user=59c1764e79ec4c846007735f')
        .send('date=' + Date.now())
        .send('body=testComment')
        .expect(200, done)
    });
    it('returns status code 400 with invalid userId', function(done) {
      request(app)
        .post('/tracks/november/addComment')
        .set('x-access-token', token)
        .send('user=invalid')
        .send('date=' + Date.now())
        .send('body=testComment')
        .expect(400, done)
    });
  });
  
  describe.skip('POST /tracks/:trackURL/addDescription', function() {
    it('does something', function(done) {
      done();
    });
  });
  
  describe.skip('PATCH /tracks/:trackURL', function() {
    it('does something', function(done) {
      done();
    });
  });
  
  describe.skip('DELETE /tracks/:trackURL', function() {
    it('does something', function(done) {
      done();
    });
  });
});