const request = require('supertest');
const chai = require('chai');

let should = chai.should();
let assert = chai.assert;

var User = require('../../models/userModel.js');

describe('Public Authentication Service', function() {
  describe('POST /auth/login', function() {
    var app;
    beforeEach(function() {
      app = require('../../app');
    });
    afterEach(function() {
      app.close();
    });
    it('returns status code 200 with valid data', function(done) {
      request(app)
        .post('/auth/login')
        .send('email=test@hotmail.com')
        .send('password=password')
        .expect(200)
        .expect(function(res) {
          res.body.success.should.equal(true);
          res.body.message.should.equal("You have successfully logged in!");
          assert.isString(res.body.token);
          assert.isObject(res.body.profile);
        })
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('returns status code 400 with invalid email', function(done) {
      request(app)
        .post('/auth/login')
        .send('email=test')
        .send('password=password')
        .expect(400)
        .expect(function(res) {
          res.body.success.should.equal(false);
          res.body.message.should.equal("Check the form for errors.");
          res.body.errors.email.should.equal("Please provide a valid email address.");
        })
        .end(done);
    });

    it('returns status code 400 with invalid password', function(done) {
      request(app)
        .post('/auth/login')
        .send('email=test@hotmail.com')
        .send('password=incorrectPassword')
        .expect(400)
        .expect(function(res) {
          res.body.success.should.equal(false);
          res.body.message.should.equal("IncorrectCredentialsError");
        })
        .end(done);
    });
  });

  describe('POST /auth/signup', function() {
    var app;
    beforeEach(function() {
      app = require('../../app');
    });
    after(function() {
      User.remove({ email: 'test123@hotmail.com' }, function(err) {});
    });
    afterEach(function() {
      app.close();
    });
    it('returns status code 200 with valid data', function(done) {
      request(app)
        .post('/auth/signup')
        .send('email=test123@hotmail.com')
        .send('password=password')
        .send('userURL=userURL123')
        .send('displayName=testname')
        .send('city=Belfast')
        .expect(200)
        .expect(function(res) {
          res.body.success.should.equal(true);
          res.body.message.should.equal("You have successfully signed up! Now you should be able to log in.");
        })
        // If you are using the .end() method .expect() assertions that fail will not throw - they will return the 
        // assertion as an error to the .end() callback. Hence why function that checks for error is required as end parameter
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('returns status code 400 with invalid email', function(done) {
      request(app)
        .post('/auth/signup')
        .send('email=invalidEmail')
        .send('password=password')
        .send('userURL=userURL123')
        .send('displayName=testname')
        .send('city=Belfast')
        .send('password=password')
        .expect(400)
        .expect(function(res) {
          res.body.success.should.equal(false);
          res.body.message.should.equal("Check the form for errors.");
          res.body.errors.email.should.equal("Please provide a valid email address.");
        })
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });
  });
});