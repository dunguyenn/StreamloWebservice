const request = require("supertest");
const chai = require("chai");
const assert = chai.assert;

const User = require("../../models/userModel.js");
const utilsJWT = require("../../utils/jwt");

describe("User Service Integration Tests", function() {
  let app;
  let testUser;
  let testUser2;
  var testUserToken;

  const userMongoID = "5a2d83d81b815cd644df5468";
  const userMongoID2 = "5a2d83d81b815cd644df5469";

  before(function(done) {
    app = require("../../app");
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

    User(testUserData)
      .save((err, user) => {
        testUser = user;
        testUserToken = utilsJWT.generateToken(user);
      })
      .then(() => {
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
          testUser2 = user;
          done();
        });
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

  describe("Public User Endpoints", function() {
    describe("GET /users", function() {
      it("returns status code 200 and all users on system when no additional query strings provided", function(done) {
        request(app)
          .get("/users")
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.users);
            assert.lengthOf(res.body.users, 2);
            res.body.total.should.equal(2);
            res.body.page.should.equal(1);
            res.body.pageCount.should.equal(1);
          })
          .end(done);
      });

      it("returns status code 200 and page of 5 users with query strings page = 1 and per_page = 5", function(done) {
        request(app)
          .get("/users?page=1&per_page=5")
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.users);
            assert.lengthOf(res.body.users, 2);
            res.body.total.should.equal(2);
            res.body.page.should.equal(1);
            res.body.pageCount.should.equal(1);
          })
          .end(done);
      });

      it("returns status code 400 with per_page query string set to number over 10", function(done) {
        request(app)
          .get("/users?page=1&per_page=11")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid per page number. Maximum number of tracks per page is 10");
          })
          .end(done);
      });

      it("returns status code 400 with per_page query string set to 0", function(done) {
        request(app)
          .get("/users?page=1&per_page=0")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid per page number");
          })
          .end(done);
      });

      it("returns status code 400 with page query string set to 0", function(done) {
        request(app)
          .get("/users?page=0&per_page=5")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid page number. Page numbers start from 1 (one-indexed)");
          })
          .end(done);
      });

      it('returns status code 200 with query string "display_name" set to valid test user displayName. Response should contain array containing each matched user', function(done) {
        request(app)
          .get("/users?display_name=" + testUser.displayName + "&page=1")
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.users);
            assert.lengthOf(res.body.users, 2);
            res.body.total.should.equal(2);
          })
          .end(done);
      });

      it('returns status code 404 with query string "display_name" set to displayName that does not map to a test users displayName.', function(done) {
        request(app)
          .get("/users?display_name=nonExistentDisplayName&page=1")
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal("No user associated with requested information");
          })
          .end(done);
      });

      it('returns status code 200 with query string "userURL" set to valid test user userURL. Response contain array containing single matched user', function(done) {
        request(app)
          .get("/users?userURL=" + testUser.userURL + "&page=1")
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.users);
            assert.lengthOf(res.body.users, 1);
            res.body.total.should.equal(1);
          })
          .end(done);
      });

      it('returns status code 404 with query string "userURL" that does not map to a test users userURL', function(done) {
        request(app)
          .get("/users?userURL=nonExistentUserURL&page=1")
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal("No user associated with requested information");
          })
          .end(done);
      });

      it('returns status code 200 with query string "userURL" and "display_name" valid and exist on db. Response contain array containing single matched user', function(done) {
        request(app)
          .get("/users?userURL=" + testUser.userURL + "&display_name=" + testUser.displayName + "&page=1")
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.users);
            assert.lengthOf(res.body.users, 1);
            res.body.total.should.equal(1);
          })
          .end(done);
      });

      it('returns status code 404 with query string "userURL" and "display_name". Neither of which map to a test user', function(done) {
        request(app)
          .get("/users?userURL=nonExistentUserURL" + "&display_name=nonExistentDisplayName" + "&page=1")
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal("No user associated with requested information");
          })
          .end(done);
      });
    });

    describe("GET /users/:id", function() {
      it("returns status code 200 when userID requested maps to user on database. Response should contain array containing single matched user", function(done) {
        request(app)
          .get("/users/" + testUser._id)
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.users);
            assert.lengthOf(res.body.users, 1);
          })
          .end(done);
      });

      it("returns status code 400 with correct message when invalid mongo objectID requested", function(done) {
        const invalidMongoID = "123";
        request(app)
          .get("/users/" + invalidMongoID)
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid userID");
          })
          .end(done);
      });

      it("returns status code 404 with correct message when requested userID does not map to a user on the system", function(done) {
        const mongoIDThatDoesNotMapToATestUser = "5a2d83d81b815cd644df5568";
        request(app)
          .get("/users/" + mongoIDThatDoesNotMapToATestUser)
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal("No user associated with requested userID");
          })
          .end(done);
      });
    });
  });

  describe("Protected User Endpoints", function() {
    describe("PATCH users/:userId/displayname/:displayname", function() {
      it("returns status code 200 with valid data", function(done) {
        let newDisplayName = "newdisplayname";
        request(app)
          .patch("/users/" + testUser._id + "/displayname/" + newDisplayName)
          .set("x-access-token", testUserToken)
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal(`Display name successfully changed to '${newDisplayName}'`);
          })
          .end(done);
      });

      it("returns status code 401 and correct message when no jwt access token header present", function(done) {
        request(app)
          .patch("/users/" + testUser._id + "/displayname/" + "randomDisplayname")
          .expect(401)
          .expect(function(res) {
            res.body.success.should.equal(false);
            res.body.message.should.equal("No token provided.");
          })
          .end(done);
      });

      it("returns status code 400 with invalid userId", function(done) {
        let newDisplayName = "newdisplayname";
        let invalidUserId = "abc";
        request(app)
          .patch("/users/" + invalidUserId + "/displayname/" + newDisplayName)
          .set("x-access-token", testUserToken)
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid userId in request");
          })
          .end(done);
      });

      it("returns status code 404 with non-existent userId", function(done) {
        let newDisplayName = "newdisplayname";
        let validButRandomUserId = "5a47f85d6a166cccb6729d5b";
        request(app)
          .patch("/users/" + validButRandomUserId + "/displayname/" + newDisplayName)
          .set("x-access-token", testUserToken)
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal("No user found with requested Id");
          })
          .end(done);
      });

      it("returns status code 403 with userId that does not have permission to change name (different user)", function(done) {
        let newDisplayName = "newdisplayname";

        request(app)
          .patch("/users/" + testUser2._id + "/displayname/" + newDisplayName)
          .set("x-access-token", testUserToken)
          .expect(403)
          .expect(function(res) {
            res.body.message.should.equal("Unauthorized to update this users display name");
          })
          .end(done);
      });
    });

    describe("POST users/:userURL/addProfilePicture", function() {
      it.skip("returns status code 200 with valid data", function(done) {});

      it.skip("returns status code 401 and correct message when no jwt access token header present", function(done) {});
    });
  });
});
