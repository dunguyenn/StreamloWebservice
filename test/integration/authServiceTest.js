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
        .end(done)
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
        .end(done)
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
        .end(done)
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
        .end(done)
    });
    
    it('returns status code 409 with confilicting email', function(done) {
      request(app)
        .post('/auth/signup')
        .send('email=test123@hotmail.com')
        .send('password=password')
        .send('userURL=userURL123')
        .send('displayName=testname')
        .send('city=Belfast')
        .expect(409)
        .expect(function(res) {
          res.body.success.should.equal(false);
          res.body.errors.email.should.equal("This email is already taken.");
        })
        .end(done)
    });
    
    it('returns status code 409 with confilicting userURL', function(done) {
      request(app)
        .post('/auth/signup')
        .send('email=test1234@hotmail.com')
        .send('password=password')
        .send('userURL=userURL123')
        .send('displayName=testname')
        .send('city=Belfast')
        .expect(409)
        .expect(function(res) {
          res.body.success.should.equal(false);
          res.body.errors.userURL.should.equal("This userURL is already taken.");
        })
        .end(done)
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
        .end(done)
    });
    
    it('returns status code 400 with password under 8 characters', function(done) {
      request(app)
        .post('/auth/signup')
        .send('email=test123@hotmail.com')
        .send('password=passwor')
        .send('userURL=userURL123')
        .send('displayName=testname')
        .send('city=Belfast')
        .expect(400)
        .expect(function(res) {
          res.body.success.should.equal(false);
          res.body.message.should.equal("Check the form for errors.");
          res.body.errors.password.should.equal("Password must have at least 8 characters.");
        })
        .end(done)
    });
    
    it('returns status code 400 with password over 50 characters', function(done) {
      request(app)
        .post('/auth/signup')
        .send('email=test123@hotmail.com')
        .send('password=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
        .send('userURL=userURL123')
        .send('displayName=testname')
        .send('city=Belfast')
        .expect(400)
        .expect(function(res) {
          res.body.success.should.equal(false);
          res.body.message.should.equal("Check the form for errors.");
          res.body.errors.password.should.equal("Password can have a maximum of 50 characters.");
        })
        .end(done)
    });
  });
});