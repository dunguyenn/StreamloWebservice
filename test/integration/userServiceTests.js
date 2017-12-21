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

  describe('Public User Endpoints', function() {
    describe('GET users/:id', function() {
      describe('GET users/:id', function() {
        it('retuns status code 200 with valid request. Response should contain array containing single matched user', function(done) {
          request(app)
            .get('/users/' + testUser._id)
            .expect(200)
            .expect(function(res) {
              assert.isArray(res.body.users);
              assert.lengthOf(res.body.users, 1);
            })
            .end(done)
        });
      });
      
      describe('GET users/:id?display_name=', function() {
        it('retuns status code 200 with valid request. Response should contain array containing each matched user', function(done) {
          request(app)
            .get('/users/' + testUser._id + "?display_name=" + testUser.displayName)
            .expect(200)
            .expect(function(res) {
              assert.isArray(res.body.users);
              assert.lengthOf(res.body.users, 2);
            })
            .end(done)
        });
      });
      
      describe('GET users/:id?userURL=', function() {
        it('retuns status code 200 with valid request. Response should contain array containing single matched user', function(done) {
          request(app)
            .get('/users/' + testUser._id + "?userURL=" + testUser.userURL)
            .expect(200)
            .expect(function(res) {
              assert.isArray(res.body.users);
              assert.lengthOf(res.body.users, 1);
            })
            .end(done)
        });
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