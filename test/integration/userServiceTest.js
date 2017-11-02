const request = require('supertest');
const chai = require('chai');

let should = chai.should();
let assert = chai.assert;

describe('Public User Service Integration Tests', function() {
  var app;

  beforeEach(function() {
    app = require('../../app');
  });
  afterEach(function() {
    app.close();
  });
  
  describe.skip('GET /users/', function() {
    it('does something', function(done) {
      done();
    });
  });
  
  describe.skip('GET /users/:userURL', function() {
    it('does something', function(done) {
      done();
    });
  });
  
  describe.skip('GET /users/id/:userId', function() {
    it('does something', function(done) {
      done();
    });
  });
  
  describe('GET /users/count/byDisplayname ', function() {
    it('returns status code 200 with valid data', function(done) {
      request(app)
        .get('/users/count/byDisplayname?q=test1')
        .expect(200, done)
    });
  });
});

describe('Protected User Service Integration Tests', function() {
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

  describe.skip('POST /:userURL/addProfilePicture', function() {
    it('does something', function(done) {
      done();
    });
  });
});