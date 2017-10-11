const request = require('supertest');
const chai = require('chai');

let should = chai.should();
let assert = chai.assert;

describe('Track Service', function() {
  var app;
  var token;

  before(function(done) {
    app = require('../../app');

    request(app)
      .post('/auth/login')
      .send('email=test@hotmail.com')
      .send('password=password')
      .expect(200)
      .end(function(err, res) {
        token = res.body.token;
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
  
  describe('GET /tracks', function() {
    it('returns status code 200 with valid data', function(done) {
      request(app)
        .get('/tracks?q=november&page=0')
        .set('x-access-token', token)
        .expect(200, done)
    });
    it('returns status code 204 with non-existent track name', function(done) {
      request(app)
        .get('/tracks?q=nonExistentTrack&page=0')
        .set('x-access-token', token)
        .expect(204, done)
    });
    it('returns status code 200 with valid data and no page query string', function(done) {
      request(app)
        .get('/tracks?q=november')
        .set('x-access-token', token)
        .expect(200, done)
    });
  });
  
  describe('GET /tracks/:trackURL', function() {
    it('returns status code 200 with valid data', function(done) {
      request(app)
        .get('/tracks/november')
        .set('x-access-token', token)
        .expect(200, done)
    });
    it('returns status code 204 with non-existent track name', function(done) {
      request(app)
        .get('/tracks/nonExistentTrack')
        .set('x-access-token', token)
        .expect(204, done)
    });
  });
});