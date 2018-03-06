const request = require("supertest");
const chai = require("chai");
const moment = require("moment");
const { Readable } = require("stream");
const fs = require("fs");

const should = chai.should();
const assert = chai.assert;

const mongodb = require("mongodb");
const ObjectID = require("mongodb").ObjectID;
const mongoose = require("mongoose");

const Track = require("../../models/trackModel.js");
const User = require("../../models/userModel.js");
const utilsJWT = require("../../utils/jwt");

describe("Track Service Integration Tests", function() {
  var app;
  var testUser;
  var testUserToken;
  var testTrack;
  var trackGridFSId;

  var userMongoID = "5a2d83d81b815cd644df5468";
  var trackMongoID = "6a2d83d81b815cd644df5468";

  before(function(done) {
    app = require("../../app");
    // create test user for use with track service tests
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
        // Add test track to database in order to test against.
        const readableTrackStream = new Readable();
        readableTrackStream.push(fs.readFileSync("test/littleidea.mp3"));
        readableTrackStream.push(null);

        let db = mongoose.connection.db;
        let bucket = new mongodb.GridFSBucket(db, {
          bucketName: "trackBinaryFiles"
        });
        let uploadStream = bucket.openUploadStream("little idea", { contentType: "audio/mp3" });
        trackGridFSId = uploadStream.id;
        readableTrackStream.pipe(uploadStream);

        uploadStream.on("finish", () => {
          testTrack = new Track({
            _id: trackMongoID,
            title: "little idea",
            genre: "Pop",
            city: "Belfast",
            trackURL: "testurl",
            dateUploaded: moment().add(30, "minute"),
            uploaderId: userMongoID,
            description: "testDesc",
            trackBinaryId: trackGridFSId,
            comments: [
              {
                user: userMongoID,
                datePosted: moment(),
                body: "testCommentBody"
              },
              {
                user: userMongoID,
                datePosted: moment(),
                body: "testCommentBody"
              }
            ]
          });

          Track(testTrack).save((err, track) => {
            User.findOneAndUpdate(
              { _id: userMongoID },
              {
                $push: {
                  uploadedTracks: {
                    trackID: trackMongoID
                  }
                },
                $inc: {
                  numberOfTracksUploaded: 1
                }
              },
              (err, doc) => {
                return done();
              }
            );
          });
        });
      });
  });

  after(function(done) {
    var removeUserPromise = User.findOneAndRemove({ _id: userMongoID }).exec();
    removeUserPromise.then(() => {
      app.close();
      return done();
    });
  });

  describe("Public Track Endpoints", function() {
    describe("GET /tracks", function() {
      it("returns status code 200 with no additional query strings", function(done) {
        request(app)
          .get("/tracks")
          .expect(200)
          .end(done);
      });

      it("returns status code 200 with valid track title, page number and per_page", function(done) {
        request(app)
          .get("/tracks?title=little+idea&page=1&per_page=5")
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.tracks);
            assert.lengthOf(res.body.tracks, 1);
            res.body.total.should.equal(1);
          })
          .end(done);
      });

      it("returns status code 200 with valid track title, trackURL, page number and per_page", function(done) {
        request(app)
          .get("/tracks?title=little+idea&trackURL=testurl&page=1&per_page=5")
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.tracks);
            assert.lengthOf(res.body.tracks, 1);
            res.body.tracks[0].trackURL.should.equal("testurl");
            res.body.total.should.equal(1);
          })
          .end(done);
      });

      it("returns status code 200 with valid track title, trackURL, uploaderID, page number and per_page", function(done) {
        let testUserId = testUser._id.toString();
        request(app)
          .get("/tracks?title=little+idea&trackURL=testurl&uploaderId=" + testUserId + "&page=1&per_page=5")
          .expect(200)
          .expect(function(res) {
            assert.isArray(res.body.tracks);
            assert.lengthOf(res.body.tracks, 1);
            res.body.tracks[0].uploaderId.should.equal(testUserId);
            res.body.total.should.equal(1);
          })
          .end(done);
      });

      it("returns status code 400 when per_page set to less then 1", function(done) {
        request(app)
          .get("/tracks?title=little+idea&page=1&per_page=0")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid per page number");
          })
          .end(done);
      });

      it("returns status code 400 when page set to 0", function(done) {
        request(app)
          .get("/tracks?title=little+idea&page=0&per_page=5")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid page number. Page numbers start from 1 (one-indexed)");
          })
          .end(done);
      });

      describe("GET /tracks?title=", function() {
        it("returns status code 200 with valid title query string", function(done) {
          request(app)
            .get("/tracks?title=little+idea")
            .expect(200)
            .end(done);
        });

        it("returns status code 404 with non-existent track name", function(done) {
          request(app)
            .get("/tracks?title=nonExistentTrack&page=1&per_page=5")
            .expect(404, done);
        });
      });

      describe("GET /tracks?uploaderId=", function() {
        it("returns status code 200 with valid uploaderId", function(done) {
          request(app)
            .get("/tracks?uploaderId=" + testUser._id)
            .expect(200)
            .expect(function(res) {
              assert.isArray(res.body.tracks);
              assert.lengthOf(res.body.tracks, 1);
            })
            .end(done);
        });

        it("returns status code 400 with invalid uploaderId", function(done) {
          request(app)
            .get("/tracks?uploaderId=" + "123")
            .expect(400)
            .end(done);
        });
        it("returns status code 404 when no user matches uploaderId", function(done) {
          request(app)
            .get("/tracks?uploaderId=" + "5a204aad5219defcba519575")
            .expect(404)
            .end(done);
        });
      });

      describe("GET /tracks?city=", function() {
        it("returns status code 200 and a chart with valid city name", function(done) {
          request(app)
            .get("/tracks?city=Belfast")
            .expect(200)
            .expect(function(res) {
              assert.isArray(res.body.tracks);
              assert.lengthOf(res.body.tracks, 1);
            })
            .end(done);
        });
        it("returns status code 400 with invalid city name ", function(done) {
          request(app)
            .get("/tracks?city=notValidCityName")
            .expect(404)
            .expect(function(res) {
              res.body.message.should.equal("Unable to find track");
            })
            .end(done);
        });
      });
    });

    describe("GET /tracks/:trackId/stream", function() {
      it("returns status code 200 with valid trackId", function(done) {
        request(app)
          .get("/tracks/" + trackMongoID + "/stream")
          .expect(200)
          .expect(function(res) {
            res.header["content-type"].should.equal("audio/mp3");
            res.header["accept-ranges"].should.equal("bytes");
          })
          .end(done);
      });
      it("returns status code 400 with invalid trackId", function(done) {
        request(app)
          .get("/tracks/123/stream")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid trackID");
          })
          .end(done);
      });
      it("returns status code 404 with non existent trackId", function(done) {
        request(app)
          .get("/tracks/69f5c1be7483f906c25169ae/stream")
          .expect(404)
          .end(done);
      });
    });

    describe("GET /tracks/:trackId/comments", function() {
      it("returns status code 200 with valid trackId which maps to a track with comments. No additional query strings", function(done) {
        request(app)
          .get("/tracks/" + testTrack._id + "/comments")
          .expect(200)
          .expect(function(res) {
            let comments = res.body.comments;
            assert.isArray(comments);
          })
          .end(done);
      });

      it("returns status code 200 with valid trackId and valid query strings: per_page, page", function(done) {
        request(app)
          .get("/tracks/" + testTrack._id + "/comments?page=1&per_page=5")
          .expect(200)
          .expect(function(res) {
            let comments = res.body.comments;
            assert.isArray(comments);
          })
          .end(done);
      });

      it("returns status code 200 with correct message when passed valid trackId and query strings: per_page, page. page requested contains no comments", function(done) {
        request(app)
          .get("/tracks/" + testTrack._id + "/comments?page=2&per_page=5")
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal("No comments found on this page");
          })
          .end(done);
      });

      it("returns status code 404 and correct message with valid trackId which doesn't map to a track", function(done) {
        let randomObjectId = "5a5e676f315931677b917a3a";
        request(app)
          .get("/tracks/" + randomObjectId + "/comments")
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal("No track found with this trackId");
          })
          .end(done);
      });

      it("returns status code 404 and correct message with invalid trackId", function(done) {
        let invalidObjectId = "12345";
        request(app)
          .get("/tracks/" + invalidObjectId + "/comments")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid trackId format");
          })
          .end(done);
      });
    });
  });

  describe("Protected Track Endpoints", function() {
    describe("POST /tracks", function() {
      let validDate = moment().toISOString();
      let invalidDateFormat = Date.now();
      let dateThirtyOneMinuteBeforeDateNow = moment()
        .subtract(31, "minute")
        .toISOString();

      it("retuns status code 200 with valid data", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("trackURL", "test1")
          .field("dateUploaded", validDate)
          .field("uploaderId", testUser._id.toString())
          .field("description", "testDesc")
          .attach("track", "test/littleidea.mp3")
          .expect(201)
          .expect(function(res) {
            res.body.message.should.equal("File uploaded successfully");
            assert.equal(ObjectID.isValid(res.body.trackBinaryId), true);
          })
          .end(done);
      });

      it("retuns status code 400 and correct message with no track title in body", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("trackURL", "test1")
          .field("dateUploaded", validDate)
          .field("uploaderId", "59c1764e79ec4c846007735f")
          .field("description", "testDesc")
          .attach("track", "test/littleidea.mp3")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No track title in request body.");
          })
          .end(done);
      });

      it("retuns status code 400 and correct message with no genre in body", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("city", "Belfast")
          .field("trackURL", "test1")
          .field("dateUploaded", validDate)
          .field("uploaderId", testUser._id.toString())
          .field("description", "testDesc")
          .attach("track", "test/littleidea.mp3")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No genre in request body.");
          })
          .end(done);
      });

      it("retuns status code 400 and correct message with no city in body", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("trackURL", "test1")
          .field("dateUploaded", validDate)
          .field("uploaderId", testUser._id.toString())
          .field("description", "testDesc")
          .attach("track", "test/littleidea.mp3")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No city in request body.");
          })
          .end(done);
      });

      it("retuns status code 400 and correct message with no trackURL in body", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("dateUploaded", validDate)
          .field("uploaderId", testUser._id.toString())
          .field("description", "testDesc")
          .attach("track", "test/littleidea.mp3")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No trackURL in request body.");
          })
          .end(done);
      });

      it("retuns status code 400 and correct message with invalid trackURL in body", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("trackURL", "trackurl with a space in it")
          .field("dateUploaded", validDate)
          .field("uploaderId", testUser._id.toString())
          .field("description", "testDesc")
          .attach("track", "test/littleidea.mp3")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid trackURL in request body.");
          })
          .end(done);
      });

      it("retuns status code 400 and correct message with duplicate trackURL in body", function(done) {
        var uploaderIDThatDoesNotMapToAnyTestUser = "5b2d83d81b815cd644df5468";
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("trackURL", "test123")
          .field("dateUploaded", validDate)
          .field("uploaderId", uploaderIDThatDoesNotMapToAnyTestUser)
          .field("description", "testDesc")
          .attach("track", "test/littleidea.mp3")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No User account associated with uploaderID");
          })
          .end(done);
      });

      it("retuns status code 400 and correct message with no date uploaded in body", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("trackURL", "test1")
          .field("uploaderId", testUser._id.toString())
          .field("description", "testDesc")
          .attach("track", "test/littleidea.mp3")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No dateUploaded in request body.");
          })
          .end(done);
      });

      it("retuns status code 400 and correct message with invalid date format", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("dateUploaded", invalidDateFormat)
          .field("trackURL", "test1")
          .field("uploaderId", testUser._id.toString())
          .field("description", "testDesc")
          .attach("track", "test/littleidea.mp3")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid dateUploaded in request body.");
          })
          .end(done);
      });

      it("retuns status code 400 and correct message with date more then thirty mins before date now", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("dateUploaded", dateThirtyOneMinuteBeforeDateNow)
          .field("trackURL", "test1")
          .field("uploaderId", testUser._id.toString())
          .field("description", "testDesc")
          .attach("track", "test/littleidea.mp3")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Date invalid, it is more then thirty minutes before upload date.");
          })
          .end(done);
      });

      it("retuns status code 400 and correct message with no uploaderId in body", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("trackURL", "test1")
          .field("dateUploaded", validDate)
          .field("description", "testDesc")
          .attach("track", "test/littleidea.mp3")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No uploaderId in request body.");
          })
          .end(done);
      });

      it("retuns status code 400 and correct message with no description in body", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("trackURL", "test1")
          .field("dateUploaded", validDate)
          .field("uploaderId", testUser._id.toString())
          .attach("track", "test/littleidea.mp3")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No description in request body.");
          })
          .end(done);
      });

      it("retuns status code 400 and correct message with no track in body", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("trackURL", "test1")
          .field("dateUploaded", validDate)
          .field("uploaderId", testUser._id.toString())
          .field("description", "testDesc")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No track in request body.");
          })
          .end(done);
      });

      it("retuns status code 400 and correct message with track key set to string value", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("trackURL", "test1")
          .field("dateUploaded", validDate)
          .field("uploaderId", testUser._id.toString())
          .field("description", "testDesc")
          .field("track", "test/littleidea.mp3")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Error uploading your track");
          })
          .end(done);
      });

      it("returns status code 400 and correct message with uploaderId set to userId that is not associated with any user account", function(done) {
        request(app)
          .post("/tracks")
          .set("x-access-token", testUserToken)
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("trackURL", "test1")
          .field("dateUploaded", validDate)
          .field("uploaderId", "5a22de9e05781964731340cc")
          .field("description", "testDesc")
          .attach("track", "test/littleidea.mp3")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No User account associated with uploaderID");
          })
          .end(done);
      });

      it("returns status code 401 and correct message when no jwt access token header present", function(done) {
        let validDate = moment().toISOString();
        let invalidDateFormat = Date.now();
        let dateThirtyOneMinuteBeforeDateNow = moment()
          .subtract(31, "minute")
          .toISOString();

        request(app)
          .post("/tracks")
          .field("title", "testTrack")
          .field("genre", "Pop")
          .field("city", "Belfast")
          .field("trackURL", "test1")
          .field("dateUploaded", validDate)
          .field("uploaderId", testUser._id.toString())
          .field("description", "testDesc")
          .attach("track", "test/littleidea.mp3")
          .expect(401)
          .expect(function(res) {
            res.body.success.should.equal(false);
            res.body.message.should.equal("No token provided.");
          })
          .end(done);
      });
    });

    describe("POST /tracks/:trackURL/comments", function() {
      it("returns status code 200 with valid data", function(done) {
        request(app)
          .post("/tracks/test1/comments")
          .set("x-access-token", testUserToken)
          .send("user=" + testUser._id)
          .send("date=" + Date.now())
          .send("body=testComment")
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal("Comment successfully added");
          })
          .end(done);
      });
      it("returns status code 400 with invalid userId format", function(done) {
        request(app)
          .post("/tracks/test1/comments")
          .set("x-access-token", testUserToken)
          .send("user=invalid")
          .send("date=" + Date.now())
          .send("body=testComment")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid userID format");
          })
          .end(done);
      });
      it("returns status code 400 with userId that is not associated with a user in database", function(done) {
        request(app)
          .post("/tracks/test1/comments")
          .set("x-access-token", testUserToken)
          .send("user=5a29a767dbfefada3041b944")
          .send("date=" + Date.now())
          .send("body=testComment")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No user associated with the commenter");
          })
          .end(done);
      });
      it("returns status code 400 with trackURL that is not associated with a track in database", function(done) {
        request(app)
          .post("/tracks/nonExistentTrackURL/comments")
          .set("x-access-token", testUserToken)
          .send("user=" + testUser._id)
          .send("date=" + Date.now())
          .send("body=testComment")
          .expect(400, done);
      });

      it("returns status code 401 and correct message when no jwt access token header present", function(done) {
        request(app)
          .post("/tracks/test1/comments")
          .send("user=" + testUser._id)
          .send("date=" + Date.now())
          .send("body=testComment")
          .expect(401)
          .expect(function(res) {
            res.body.success.should.equal(false);
            res.body.message.should.equal("No token provided.");
          })
          .end(done);
      });
    });

    describe("PATCH /tracks/:trackURL/description", function() {
      it("returns status code 200 with valid data", function(done) {
        let newTrackDescription = "newDescription";

        request(app)
          .patch(`/tracks/${testTrack.trackURL}/description`)
          .set("x-access-token", testUserToken)
          .send("newDescription=" + newTrackDescription)
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal(
              `Old track description (${testTrack.description}) updated. New description is (${newTrackDescription})`
            );
          })
          .end(done);
      });
      it("returns status code 400 and correct message when new description is the same as description currently in the database", function(done) {
        let newTrackDescription = "newDescription";

        request(app)
          .patch(`/tracks/${testTrack.trackURL}/description`)
          .set("x-access-token", testUserToken)
          .send("newDescription=" + newTrackDescription)
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal(
              `Track description not updated. Old track description (${newTrackDescription}) is the same as new requested track description (${newTrackDescription})`
            );
          })
          .end(done);
      });
      it("returns status code 404 and correct message when no track found with this trackurl", function(done) {
        request(app)
          .patch(`/tracks/nonExistentTrackURL/description`)
          .set("x-access-token", testUserToken)
          .send("newDescription=" + "SomeKindOfDescription")
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal(`No track associated with requested trackURL`);
          })
          .end(done);
      });
      it("returns status code 400 and correct message when new description exceeds maximum description length", function(done) {
        request(app)
          .patch(`/tracks/${testTrack.trackURL}/description`)
          .set("x-access-token", testUserToken)
          .send("newDescription=" + "a".repeat(4001))
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal(`New description exceeds maximum length of description (4000 characters)`);
          })
          .end(done);
      });
      it("returns status code 401 and correct message when no jwt access token header present", function(done) {
        let newTrackDescription = "newDescription";

        request(app)
          .patch(`/tracks/${testTrack.trackURL}/description`)
          .send("newDescription=" + newTrackDescription)
          .expect(401)
          .expect(function(res) {
            res.body.message.should.equal(`No token provided.`);
          })
          .end(done);
      });
    });

    describe("PATCH /tracks/:trackURL/title", function() {
      it("returns status code 200 with valid data", function(done) {
        let newTrackTitle = "even littler idea";
        request(app)
          .patch(`/tracks/${testTrack.trackURL}/title`)
          .set("x-access-token", testUserToken)
          .send("newTitle=" + newTrackTitle)
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal(
              `Old track title (${testTrack.title}) updated. New title is (${newTrackTitle})`
            );
          })
          .end(done);
      });
      it("returns status code 400 and correct message with trackURL that is not associated with a track in database", function(done) {
        request(app)
          .patch("/tracks/nonExistentTrackURL/title")
          .set("x-access-token", testUserToken)
          .send("newTitle=" + "even littler idea")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No track associated with that trackURL");
          })
          .end(done);
      });
      it("returns status code 400 and correct message when attempting to update to track title that is longer then 100 characters", function(done) {
        request(app)
          .patch(`/tracks/${testTrack.trackURL}/title`)
          .set("x-access-token", testUserToken)
          .send(
            "newTitle=" +
              "aStringPaddedTo101Characters1111111111111111111111111111111111111111111111111111111111111111111111111"
          )
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("New track title exceeds maximum length of track title (100 characters)");
          })
          .end(done);
      });
      it("returns status code 401 and correct message when no jwt access token header present", function(done) {
        let newTrackTitle = "even littler idea";
        request(app)
          .patch(`/tracks/${testTrack.trackURL}/title`)
          .send("newTitle=" + newTrackTitle)
          .expect(401)
          .expect(function(res) {
            res.body.success.should.equal(false);
            res.body.message.should.equal("No token provided.");
          })
          .end(done);
      });
    });

    describe("DELETE /tracks/comments/:commentId", function() {
      let testUserWithoutPermissionToDeleteTrack;
      let testUserWithoutPermissionToDeleteTrackToken;

      before(function(done) {
        const testUserData = new User({
          email: "deleteTest2@hotmail.com",
          password: "password",
          userURL: "deleteTestURL2",
          displayName: "deleteTestDispName",
          city: "Belfast"
        });

        User(testUserData).save((err, user) => {
          testUserWithoutPermissionToDeleteTrack = user;
          testUserWithoutPermissionToDeleteTrackToken = utilsJWT.generateToken(user);
          done();
        });
      });

      after(function(done) {
        User.findByIdAndRemove(testUserWithoutPermissionToDeleteTrack._id, () => {
          done();
        });
      });

      it("returns status code 200 and correct message with valid commentId", function(done) {
        request(app)
          .delete("/tracks/comments/" + testTrack.comments[0]._id)
          .set("x-access-token", testUserToken)
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal("Comment deleted");
          })
          .end(done);
      });

      it("returns status code 400 and correct message with invalid commentId sent", function(done) {
        request(app)
          .delete("/tracks/comments/" + "12345")
          .set("x-access-token", testUserToken)
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid commentId in request body");
          })
          .end(done);
      });

      it("returns status code 400 and correct message with non existent comment", function(done) {
        let nonExistentCommentId = "6a6606fe26917d767dd4991a";
        request(app)
          .delete("/tracks/comments/" + nonExistentCommentId)
          .set("x-access-token", testUserToken)
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Comment not found");
          })
          .end(done);
      });

      it("returns status code 403 and correct message when user doesnt have permission to delete comment", function(done) {
        request(app)
          .delete("/tracks/comments/" + testTrack.comments[1]._id)
          .set("x-access-token", testUserWithoutPermissionToDeleteTrackToken)
          .expect(403)
          .expect(function(res) {
            res.body.message.should.equal("Unauthorized to delete this comment");
          })
          .end(done);
      });
    });

    describe("DELETE /tracks/trackurl/:trackURL", function() {
      let deleteTestTrackURL;

      let testUserWithNoUploadedTracks;
      let testUserWithNoUploadedTracksToken;

      before(function(done) {
        deleteTestTrackURL = `/tracks/trackurl/${testTrack.trackURL}`;
        const testUserData = new User({
          email: "deleteTest@hotmail.com",
          password: "password",
          userURL: "deleteTestURL",
          displayName: "deleteTestDispName",
          city: "Belfast"
        });

        User(testUserData).save((err, user) => {
          testUserWithNoUploadedTracks = user;
          testUserWithNoUploadedTracksToken = utilsJWT.generateToken(user);
          done();
        });
      });

      after(function(done) {
        User.findByIdAndRemove(testUserWithNoUploadedTracks._id, () => {
          return done();
        });
      });
      it("returns status code 403 and correct message when logged in user did not upload the track and therfore does not have permission to delete it", function(done) {
        request(app)
          .delete(deleteTestTrackURL)
          .set("x-access-token", testUserWithNoUploadedTracksToken)
          .expect(403)
          .expect(function(res) {
            res.body.message.should.equal("Unauthorized to delete this track");
          })
          .end(done);
      });
      it("returns status code 200 with valid data", function(done) {
        request(app)
          .delete(deleteTestTrackURL)
          .set("x-access-token", testUserToken)
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal(`Track with trackURL '${testTrack.trackURL}' deleted successfully`);
          })
          .end(done);
      });
      it("returns status code 404 with valid data when trackURL supplied does not map to a track on the system", function(done) {
        request(app)
          .delete(`/tracks/trackurl/nonExistentTrackURL`)
          .set("x-access-token", testUserToken)
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal("No track with this trackURL found on the system");
          })
          .end(done);
      });
      it("returns status code 401 and correct message when no jwt access token header present", function(done) {
        request(app)
          .delete(deleteTestTrackURL)
          .expect(401)
          .expect(function(res) {
            res.body.success.should.equal(false);
            res.body.message.should.equal("No token provided.");
          })
          .end(done);
      });
    });

    describe("DELETE /tracks/:trackId", function() {
      let deleteTestTrackByIdURL;

      let testUserWithNoUploadedTracks;
      let testUserWithNoUploadedTracksToken;

      let testUserWithSingleUploadedTrack;
      let testUserWithSingleUploadedTrackJWTToken;

      before(function(done) {
        const testUserData = new User({
          email: "deleteTest@hotmail.com",
          password: "password",
          userURL: "deleteTestURL",
          displayName: "deleteTestDispName",
          city: "Belfast"
        });

        User(testUserData).save((err, user) => {
          testUserWithNoUploadedTracks = user;
          testUserWithNoUploadedTracksToken = utilsJWT.generateToken(user);

          const testUserData2 = new User({
            email: "deleteTest2@hotmail.com",
            password: "password",
            userURL: "deleteTestURL2",
            displayName: "deleteTestDispName",
            city: "Belfast"
          });

          User(testUserData2)
            .save((err, user2) => {
              testUserWithSingleUploadedTrack = user2;
              testUserWithSingleUploadedTrackJWTToken = utilsJWT.generateToken(user2);
            })
            .then(() => {
              // Add test track to database in order to test against.
              const readableTrackStream = new Readable();
              readableTrackStream.push(fs.readFileSync("test/littleidea.mp3"));
              readableTrackStream.push(null);

              let db = mongoose.connection.db;
              let bucket = new mongodb.GridFSBucket(db, {
                bucketName: "trackBinaryFiles"
              });
              let uploadStream = bucket.openUploadStream("little idea", { contentType: "audio/mp3" });
              trackGridFSId = uploadStream.id;
              readableTrackStream.pipe(uploadStream);

              uploadStream.on("finish", () => {
                testTrack = new Track({
                  title: "testDeleteTrack",
                  genre: "Pop",
                  city: "Belfast",
                  trackURL: "testDeleteTrack",
                  dateUploaded: moment().add(30, "minute"),
                  uploaderId: testUserWithSingleUploadedTrack._id,
                  description: "testDesc",
                  trackBinaryId: trackGridFSId
                });

                Track(testTrack).save((err, track) => {
                  deleteTestTrackByIdURL = `/tracks/${track._id}`;
                  User.findOneAndUpdate(
                    { _id: userMongoID },
                    {
                      $push: {
                        uploadedTracks: {
                          trackID: trackMongoID
                        }
                      },
                      $inc: {
                        numberOfTracksUploaded: 1
                      }
                    },
                    (err, doc) => {
                      return done();
                    }
                  );
                });
              });
            });
        });
      });

      after(function(done) {
        User.findByIdAndRemove(testUserWithNoUploadedTracks._id, () => {
          User.findByIdAndRemove(testUserWithSingleUploadedTrack._id, () => {
            return done();
          });
        });
      });

      it("returns status code 403 and correct message when logged in user did not upload the track and therefore does not have permission to delete it", function(done) {
        request(app)
          .delete(deleteTestTrackByIdURL)
          .set("x-access-token", testUserWithNoUploadedTracksToken)
          .expect(403)
          .expect(function(res) {
            res.body.message.should.equal("Unauthorized to delete this track");
          })
          .end(done);
      });

      it("returns status code 200 with valid data", function(done) {
        request(app)
          .delete(deleteTestTrackByIdURL)
          .set("x-access-token", testUserWithSingleUploadedTrackJWTToken)
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal(`Track with trackId '${testTrack._id}' deleted successfully`);
          })
          .end(done);
      });

      it("returns status code 404 with valid data when trackId supplied does not map to a track on the system", function(done) {
        let validTrackIdForNonExistentTrack = "5a6753deb1a7364cb6e629bb";
        request(app)
          .delete("/tracks/" + validTrackIdForNonExistentTrack)
          .set("x-access-token", testUserToken)
          .expect(404)
          .expect(function(res) {
            res.body.message.should.equal("No track with this trackId found on the system");
          })
          .end(done);
      });

      it("returns status code 401 and correct message when no jwt access token header present", function(done) {
        request(app)
          .delete(deleteTestTrackByIdURL)
          .expect(401)
          .expect(function(res) {
            res.body.success.should.equal(false);
            res.body.message.should.equal("No token provided.");
          })
          .end(done);
      });
    });
  });
});
