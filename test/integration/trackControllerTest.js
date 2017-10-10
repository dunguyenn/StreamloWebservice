const request = require('supertest');
const chai = require('chai');

let should = chai.should();
let assert = chai.assert;

describe('Track Service', function() {
  describe('GET /tracks', function() {
    var app;
    var token;
    // Before all tests run the application, login, then store the token
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
    it('returns status code 200 with valid data', function(done) {
      request(app)
        .get('/tracks?q=november&page=0')
        .set('x-access-token', token)
        .expect(200, done)
    });
  });
});