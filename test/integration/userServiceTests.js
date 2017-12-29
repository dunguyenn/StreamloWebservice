const request = require('supertest');
const chai = require('chai');

const assert = chai.assert;

const User = require('../../models/userModel.js');

describe('User Service Integration Tests', function() {
  let app;
  let testUser;
  
  const userMongoID = "5a2d83d81b815cd644df5468"
  const userMongoID2= "5a2d83d81b815cd644df5469"

  before(function(done) {
    app = require('../../app');
    // create test user for use with user service tests
    const testUserData = new User({
      _id: userMongoID,
      email: "test@hotmail.com",
      password: "password",
      userURL: "testurl",
      displayName: "testDisplayName",
      city: "Belfast",
      uploadedTracks: undefined
    });
    
    User(testUserData).save((err, user) => {
      testUser = user;
    }).then(() => {
      const testUserData = new User({
        _id: userMongoID2,
        email: "test2@hotmail.com",
        password: "password",
        userURL: "testurl2",
        displayName: "testDisplayName",
        city: "Belfast",
        uploadedTracks: undefined
      });
      
      User(testUserData).save((err, user) => {
        done();
      })
    });
  });
  
  after(function(done) {
    var removeUserPromise = User.findOneAndRemove({ email: "test@hotmail.com" }).exec();
    removeUserPromise.then(() => {
      User.findOneAndRemove({ email: "test2@hotmail.com" }, () => {
        app.close();
        return done();
      });
    });
  });

  describe('Public User Endpoints', function() {
    describe('GET /users', function() {
      it('retuns status code 200 and all users on system when no additional query strings provided', function(done) {
        request(app)
          .get('/users')
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.users);
            assert.lengthOf(res.body.users, 2);
          })
          .end(done)
      });
      
      it('retuns status code 200 with query string "display_name" set to valid test user displayName. Response should contain array containing each matched user', function(done) {
        request(app)
          .get('/users?display_name=' + testUser.displayName)
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.users);
            assert.lengthOf(res.body.users, 2);
          })
          .end(done)
      });
      
      it('retuns status code 404 with query string "display_name" set to displayName that does not map to a test users displayName.', function(done) {
        request(app)
          .get('/users?display_name=nonExistentDisplayName')
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal("No user associated with requested information");
          })
          .end(done)
      });
      
      it('retuns status code 200 with query string "userURL" set to valid test user userURL. Response contain array containing single matched user', function(done) {
        request(app)
          .get('/users?userURL=' + testUser.userURL)
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.users);
            assert.lengthOf(res.body.users, 1);
          })
          .end(done)
      });
      
      it('retuns status code 404 with query string "userURL" that does not map to a test users userURL', function(done) {
        request(app)
          .get('/users?userURL=nonExistentUserURL')
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal("No user associated with requested information");
          })
          .end(done)
      });
      
      it('retuns status code 200 with query string "userURL" and "display_name" valid and exist on db. Response contain array containing single matched user', function(done) {
        request(app)
          .get('/users?userURL=' + testUser.userURL + '&display_name=' + testUser.displayName)
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.users);
            assert.lengthOf(res.body.users, 1);
          })
          .end(done)
      });
      
      it('retuns status code 404 with query string "userURL" and "display_name". Neither of which map to a test user', function(done) {
        request(app)
          .get('/users?userURL=nonExistentUserURL' + '&display_name=nonExistentDisplayName')
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal("No user associated with requested information");
          })
          .end(done)
      });
    });
    
    describe('GET /users/:id', function() {
      it('retuns status code 200 when userID requested maps to user on database. Response should contain array containing single matched user', function(done) {
        request(app)
          .get('/users/' + testUser._id)
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.users);
            assert.lengthOf(res.body.users, 1);
          })
          .end(done)
      });
      
      it('retuns status code 400 with correct message when invalid mongo objectID requested', function(done) {
        const invalidMongoID = "123"
        request(app)
          .get('/users/' + invalidMongoID)
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal('Invalid userID')
          })
          .end(done)
      });
      
      it('retuns status code 404 with correct message when requested userID does not map to a user on the system', function(done) {
        const mongoIDThatDoesNotMapToATestUser = "5a2d83d81b815cd644df5568"
        request(app)
          .get('/users/' + mongoIDThatDoesNotMapToATestUser)
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal('No user associated with requested userID')
          })
          .end(done)
      });
    });
  });
  
  describe('Protected User Endpoints', function() {
    describe('POST users/:userURL/addProfilePicture', function() {
      it.skip('retuns status code 200 with valid data', function(done) {
        
      });
      
      it.skip('returns status code 401 and correct message when no jwt access token header present', function(done) {
        
      });
    });
  });
});