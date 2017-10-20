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
  });
});