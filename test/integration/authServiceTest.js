const request = require('supertest');
const chai = require('chai');

const should = chai.should();
const assert = chai.assert;

const User = require('../../models/userModel.js');

describe('Authentication Service Integration Tests', function() {
  describe('Public Authentication Endpoints', function() {
    var app;
    before(() => {
      app = require('../../app');
    });
    after(() => {
      app.close();
    });
    
    describe('POST /auth/login', function() {    
      before(function(done) {
        const testUser = new User({
          email: "test@hotmail.com",
          password: "password",
          userURL: "testurl",
          displayName: "testDisplayName",
          city: "Belfast"
        });
        
        User(testUser).save((err) => {
          return done();
        });
      });

      after(function(done) {
        User.find({
          email: "test@hotmail.com"
        }).remove((err) => {
          done();
        });
      });
      
      it('returns status code 200 with valid data', function(done) {
        request(app)
          .post('/auth/login')
          .send('email=test@hotmail.com')
          .send('password=password')
          .expect(200)
          .expect(function(res) {
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
            res.body.message.should.equal("Please provide a valid email address.");
          })
          .end(done)
      });
      
      it('returns status code 400 with no email sent', function(done) {
        request(app)
          .post('/auth/login')
          .send('password=password')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a valid email address.");
          })
          .end(done)
      });
      
      it('returns status code 400 with non-existent email', function(done) {
        request(app)
          .post('/auth/login')
          .send('email=idontexist@gmail.com')
          .send('password=password')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No account associated with that email or invalid password");
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
            res.body.message.should.equal("No account associated with that email or invalid password");
          })
          .end(done)
      });
      
      it('returns status code 400 with no password sent', function(done) {
        request(app)
          .post('/auth/login')
          .send('email=test@hotmail.com')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a valid password.");
          })
          .end(done)
      });
      
      it('returns status code 400 with password under 8 characters', function(done) {
        request(app)
          .post('/auth/login')
          .send('email=test@hotmail.com')
          .send('password=1234567')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Password must have at least 8 characters.");
          })
          .end(done)
      });
      
      it('returns status code 400 with password over 50characters', function(done) {
        request(app)
          .post('/auth/login')
          .send('email=test@hotmail.com')
          .send('password=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Password can have a maximum of 50 characters.");
          })
          .end(done)
      });
    });

    describe('POST /auth/signup', function() {
      after(function(done) {
        let query = User.findOneAndRemove({
          email: "test123@hotmail.com"
        }).exec(); // findOneAndRemove returns a query. query.exec() executes query and returns a promise
        
        query.then(() => {
          return User.findOneAndRemove({
            email: "test1234@hotmail.com"
          }).exec(); // returns another promise
        })
        .then(() => {
          return done();
        });
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
            res.body.message.should.equal("You have successfully signed up! Now you should be able to log in.");
          })
          .end(done)
      });
      
      it('returns status code 409 with confilicting email', function(done) {
        request(app)
          .post('/auth/signup')
          .send('email=test123@hotmail.com')
          .send('password=password')
          .send('userURL=userURL1234')
          .send('displayName=testname')
          .send('city=Belfast')
          .expect(409)
          .expect(function(res) {
            res.body.message.should.equal("This email is already taken.");
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
            res.body.message.should.equal("Please provide a valid email address.");
          })
          .end(done)
      });
      
      it('returns status code 400 with no email sent', function(done) {
        request(app)
          .post('/auth/signup')
          .send('password=password')
          .send('userURL=userURL123')
          .send('displayName=testname')
          .send('city=Belfast')
          .send('password=password')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a valid email address.");
          })
          .end(done)
      });
      
      it('returns status code 400 with no password sent', function(done) {
        request(app)
          .post('/auth/signup')
          .send('email=test123@hotmail.com')
          .send('userURL=userURL123')
          .send('displayName=testname')
          .send('city=Belfast')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a valid password.");
          })
          .end(done)
      });
      
      it('returns status code 400 with password under 8 characters', function(done) {
        request(app)
          .post('/auth/signup')
          .send('email=nonConflictingEmail@hotmail.com')
          .send('password=passwor')
          .send('userURL=userURL123')
          .send('displayName=testname')
          .send('city=Belfast')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Password must have at least 8 characters.");
          })
          .end(done)
      });
      
      it('returns status code 400 with password over 50 characters', function(done) {
        request(app)
          .post('/auth/signup')
          .send('email=nonConflictingEmail@hotmail.com')
          .send('password=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
          .send('userURL=userURL123')
          .send('displayName=testname')
          .send('city=Belfast')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Password can have a maximum of 50 characters.");
          })
          .end(done)
      });
      
      it('returns status code 400 with no userURL sent', function(done) {
        request(app)
          .post('/auth/signup')
          .send('email=test123@hotmail.com')
          .send('password=password')
          .send('displayName=testname')
          .send('city=Belfast')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a userURL.");
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
            res.body.message.should.equal("This userURL is already taken.");
          })
          .end(done)
      });
      
      it('returns status code 400 with userURL over 20 characters', function(done) {
        request(app)
          .post('/auth/signup')
          .send('email=nonConflictingEmail@hotmail.com')
          .send('password=password')
          .send('userURL=userURLThatIs21Charrr')
          .send('displayName=testname')
          .send('city=Belfast')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("UserURL can have a maximum of 20 characters");
          })
          .end(done)
      });
      
      it('returns status code 400 with no city name sent', function(done) {
        request(app)
          .post('/auth/signup')
          .send('email=nonConflictingEmail@hotmail.com')
          .send('password=password')
          .send('userURL=userURL123')
          .send('displayName=testname')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a city name.");
          })
          .end(done)
      });
    
      it('returns status code 400 with invalid city name', function(done) {
        request(app)
          .post('/auth/signup')
          .send('email=nonConflictingEmail@hotmail.com')
          .send('password=password')
          .send('userURL=userURL123')
          .send('displayName=testname')
          .send('city=invalidCity')
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid City");
          })
          .end(done)
      });
    });
  });
});