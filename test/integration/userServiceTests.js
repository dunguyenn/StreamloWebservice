const request = require("supertest");
const chai = require("chai");
const assert = chai.assert;

const User = require("../../models/userModel.js");
const utilsJWT = require("../../utils/jwt");

describe("User Service Integration Tests", function() {
  let app;
  let testUser;
  let testUser2;
  let testUserToken;
  let testUser2Token;

  const userMongoID = "5a2d83d81b815cd544df5468";
  const userMongoID2 = "5a2d83d81b815cd644df5469";

  before(function(done) {
    app = require("../../app");
    // create test user for use with user service tests
    const testUserData = new User({
      _id: userMongoID,
      email: "test1@hotmail.com",
      password: "password",
      userURL: "testurl1",
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
          testUser2Token = utilsJWT.generateToken(user);
          done();
        });
      });
  });

  after(function(done) {
    var removeUserPromise = User.findOneAndRemove({ _id: userMongoID }).exec();
    removeUserPromise.then(() => {
      User.findOneAndRemove({ _id: userMongoID2 }, () => {
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

    describe("GET users/:userURL/liked", function() {
      it.skip("returns status code 200 with valid data", function(done) {});
    });
  });

  describe("Protected User Endpoints", function() {
    describe("PATCH users/:userId", function() {
      let validNewEmail = "updatedemail@hotmail.com";
      let validNewPassword = "updatedpassword";
      let validNewUserURL = "updateduserurl";
      let validNewDisplayName = "updatedDisplayName";
      let validNewCity = "Derry";

      it("returns status code 200 when updating with valid email, password, userURL, displayName and city", function(done) {
        request(app)
          .patch("/users/" + testUser._id)
          .set("x-access-token", testUserToken)
          .send("email=" + validNewEmail)
          .send("password=" + validNewPassword)
          .send("userURL=" + validNewUserURL)
          .send("displayName=" + validNewDisplayName)
          .send("city=" + validNewCity)
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal("User information updated successfully");
          })
          .end(done);
      });

      it("returns status code 401 when no jwt access token header present", function(done) {
        request(app)
          .patch("/users/" + testUser._id)
          .expect(401)
          .expect(function(res) {
            res.body.success.should.equal(false);
            res.body.message.should.equal("No token provided.");
          })
          .end(done);
      });

      it("returns status code 403 with jwt token that does not have permission to change information (different user)", function(done) {
        request(app)
          .patch("/users/" + testUser._id)
          .set("x-access-token", testUser2Token)
          .expect(403)
          .expect(function(res) {
            res.body.message.should.equal("Unauthorized to update this users information");
          })
          .end(done);
      });

      describe("PATCH users/:userId BODY=email", function() {
        it("returns status code 400 with invalid email", function(done) {
          let invalidEmail = "invalidEmail";
          request(app)
            .patch("/users/" + testUser._id)
            .set("x-access-token", testUserToken)
            .send("email=" + invalidEmail)
            .send("password=" + validNewPassword)
            .send("userURL=" + validNewUserURL)
            .send("displayName=" + validNewDisplayName)
            .send("city=" + validNewCity)
            .expect(400)
            .expect(function(res) {
              res.body.message.should.equal("Error updating user information");
              res.body.errors.email.should.equal("Invalid email address");
            })
            .end(done);
        });

        it("returns status code 400 with duplicate email", function(done) {
          let duplicateEmail = testUser.email;
          request(app)
            .patch("/users/" + testUser2._id)
            .set("x-access-token", testUserToken)
            .send("email=" + duplicateEmail)
            .send("password=" + validNewPassword)
            .send("userURL=" + validNewUserURL)
            .send("displayName=" + validNewDisplayName)
            .send("city=" + validNewCity)
            .expect(403)
            .expect(function(res) {
              res.body.message.should.equal("Unauthorized to update this users information");
            })
            .end(done);
        });
      });

      describe("PATCH users/:userId BODY=password", function() {
        it("returns status code 400 with password under 8 characters", function(done) {
          let passwordUnder8Char = "123";
          request(app)
            .patch("/users/" + testUser._id)
            .set("x-access-token", testUserToken)
            .send("email=" + validNewEmail)
            .send("password=" + passwordUnder8Char)
            .send("userURL=" + validNewUserURL)
            .send("displayName=" + validNewDisplayName)
            .send("city=" + validNewCity)
            .expect(400)
            .expect(function(res) {
              res.body.message.should.equal("Error updating user information");
              res.body.errors.password.should.equal("Password is under the minimum length of 8 characters");
            })
            .end(done);
        });

        it("returns status code 400 with password over 50 characters", function(done) {
          let passwordOver50Char = "111111111111111111111111111111111111111111111111111";
          request(app)
            .patch("/users/" + testUser._id)
            .set("x-access-token", testUserToken)
            .send("email=" + validNewEmail)
            .send("password=" + passwordOver50Char)
            .send("userURL=" + validNewUserURL)
            .send("displayName=" + validNewDisplayName)
            .send("city=" + validNewCity)
            .expect(400)
            .expect(function(res) {
              res.body.message.should.equal("Error updating user information");
              res.body.errors.password.should.equal("Password is over the maximum length of 50 characters");
            })
            .end(done);
        });
      });

      describe("PATCH users/:userId BODY=userURL", function() {
        it("returns status code 400 when attempting to update userURL to a userURL that another user has", function(done) {
          let duplicateUserURL = testUser2.userURL;
          request(app)
            .patch("/users/" + testUser._id)
            .set("x-access-token", testUserToken)
            .send("email=" + validNewEmail)
            .send("password=" + validNewPassword)
            .send("userURL=" + duplicateUserURL)
            .send("displayName=" + validNewDisplayName)
            .send("city=" + validNewCity)
            .expect(400)
            .expect(function(res) {
              res.body.message.should.equal("Error updating user information");
              res.body.errors.userURL.should.equal("An account with this userURL already exists");
            })
            .end(done);
        });
      });

      describe("PATCH users/:userId BODY=displayName", function() {
        it("returns status code 400 with display name over 20 characters", function(done) {
          let displayNameExceeding20Char = "stringPaddedTo21Chars";
          request(app)
            .patch("/users/" + testUser._id)
            .set("x-access-token", testUserToken)
            .send("email=" + validNewEmail)
            .send("password=" + validNewPassword)
            .send("userURL=" + validNewUserURL)
            .send("displayName=" + displayNameExceeding20Char)
            .send("city=" + validNewCity)
            .expect(400)
            .expect(function(res) {
              res.body.message.should.equal("Error updating user information");
              res.body.errors.displayName.should.equal("Display name exceeds maximum length of 20 characters");
            })
            .end(done);
        });
      });

      describe("PATCH users/:userId BODY=city", function() {
        it("returns status code 400 with invalid city name", function(done) {
          let invalidCity = "geneva";
          request(app)
            .patch("/users/" + testUser._id)
            .set("x-access-token", testUserToken)
            .send("email=" + validNewEmail)
            .send("password=" + validNewPassword)
            .send("userURL=" + validNewUserURL)
            .send("displayName=" + validNewDisplayName)
            .send("city=" + invalidCity)
            .expect(400)
            .expect(function(res) {
              res.body.message.should.equal("Error updating user information");
              res.body.errors.city.should.equal("Invalid city. Valid cities include Belfast or Derry");
            })
            .end(done);
        });
      });
    });

    describe("DELETE users/:userId", function() {
      let deleteTestUser;
      let deleteTestUserToken;

      before(function(done) {
        // create test user for use with "DELETE users/:userId" tests
        const testUserData = new User({
          email: "deleteTestUser@hotmail.com",
          password: "password",
          userURL: "deleteTestUser1",
          displayName: "testDisplayName",
          city: "Belfast",
          uploadedTracks: undefined
        });

        User(testUserData).save((err, user) => {
          deleteTestUser = user;
          deleteTestUserToken = utilsJWT.generateToken(user);
          return done();
        });
      });

      // Delete "deleteTestUser" even if test fails
      after(function(done) {
        User.findOneAndRemove({ _id: deleteTestUser._id }, err => {
          return done();
        });
      });

      it("returns status code 403 when user does not have permission to delete this user", function(done) {
        request(app)
          .delete("/users/" + deleteTestUser._id)
          .set("x-access-token", testUserToken)
          .expect(403)
          .expect(function(res) {
            res.body.message.should.equal("Unauthorized to delete this user");
          })
          .end(done);
      });

      it("returns status code 200 with userId that is valid and maps to an existing user", function(done) {
        request(app)
          .delete("/users/" + deleteTestUser._id)
          .set("x-access-token", deleteTestUserToken)
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal("User deleted successfully");
          })
          .end(done);
      });

      it("returns status code 401 when no JWT token present in header", function(done) {
        request(app)
          .delete("/users/" + deleteTestUser._id)
          .expect(401)
          .expect(function(res) {
            res.body.message.should.equal("No token provided.");
          })
          .end(done);
      });

      it("returns status code 404 with valid userId that does not map to an existing user", function(done) {
        let validUserIdForNonExistentUser = "6a2d83d81b815cd544df5468";
        request(app)
          .delete("/users/" + validUserIdForNonExistentUser)
          .set("x-access-token", deleteTestUserToken)
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal("No user associated with this Id");
          })
          .end(done);
      });

      it("returns status code 400 with invalid userId", function(done) {
        let invalidUserId = "123";
        request(app)
          .delete("/users/" + invalidUserId)
          .set("x-access-token", deleteTestUserToken)
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid userId in request");
          })
          .end(done);
      });
    });

    describe("POST users/:userURL/addProfilePicture", function() {
      it.skip("returns status code 200 with valid data", function(done) {});

      it.skip("returns status code 401 and correct message when no jwt access token header present", function(done) {});
    });

    describe("POST users/:userId/followees", function() {
      it.skip("returns status code 200 with valid data", function(done) {});

      it.skip("returns status code 401 and correct message when no jwt access token header present", function(done) {});
    });

    describe("DELETE users/:userId/followees/:userIdOfFollowee", function() {
      it.skip("returns status code 200 with valid data", function(done) {});

      it.skip("returns status code 401 and correct message when no jwt access token header present", function(done) {});
    });

    describe("PUT users/:userId/liked/:trackId", function() {
      it.skip("returns status code 200 with valid data", function(done) {});

      it.skip("returns status code 401 and correct message when no jwt access token header present", function(done) {});
    });

    describe("DELETE users/:userId/liked/:trackId", function() {
      it.skip("returns status code 200 with valid data", function(done) {});

      it.skip("returns status code 401 and correct message when no jwt access token header present", function(done) {});
    });
  });
});
