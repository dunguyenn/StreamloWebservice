const request = require('supertest');
const chai = require('chai');

let should = chai.should();
let assert = chai.assert;

describe('Public User Service', function() {
  var app;

  beforeEach(function() {
    app = require('../../app');
  });
  afterEach(function() {
    app.close();
  });
  
  describe('GET /users/count/byDisplayname ', function() {
    it('returns status code 200 with valid data', function(done) {
      request(app)
        .get('/users/count/byDisplayname?q=test1')
        .expect(200, done)
    });
    it('returns status code 204 with non-existent track name', function(done) {
      request(app)
        .get('/tracks?q=nonExistentTrack&page=0')
        .expect(204, done)
    });
    it('returns status code 200 with valid data and no page query string', function(done) {
      request(app)
        .get('/tracks?q=november')
        .expect(200, done)
    });
  });
});