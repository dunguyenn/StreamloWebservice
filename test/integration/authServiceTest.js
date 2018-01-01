const request = require("supertest");
const chai = require("chai");

const should = chai.should();
const assert = chai.assert;

const User = require("../../models/userModel.js");

describe("Authentication Service Integration Tests", function() {
  var app;

  before(done => {
    app = require("../../app");
    // create test user for use with signup endpoint tests
    const testUserData = new User({
      email: "test@hotmail.com",
      password: "password",
      userURL: "testurl",
      displayName: "testDisplayName",
      city: "Belfast"
    });

    User(testUserData).save((err, user) => {
      return done();
    });
  });

  after(done => {
    app.close();
    // remove test user after auth service tests finish
    User.findOneAndRemove(
      {
        email: "test@hotmail.com"
      },
      () => {
        return done();
      }
    );
  });

  describe("Public Authentication Endpoints", function() {
    let validLoginTestData = {
      email: "test@hotmail.com",
      password: "password"
    };
    describe("POST /auth/login", function() {
      it("returns status code 200 with valid data", function(done) {
        request(app)
          .post("/auth/login")
          .send(`email=${validLoginTestData.email}`)
          .send(`password=${validLoginTestData.password}`)
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal("You have successfully logged in!");
            assert.isString(res.body.token);
            assert.isObject(res.body.profile);
          })
          .end(done);
      });

      it("returns status code 400 with invalid email", function(done) {
        request(app)
          .post("/auth/login")
          .send("email=test")
          .send(`password=${validLoginTestData.password}`)
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a valid email address.");
          })
          .end(done);
      });

      it("returns status code 400 with no email sent", function(done) {
        request(app)
          .post("/auth/login")
          .send(`password=${validLoginTestData.password}`)
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a valid email address.");
          })
          .end(done);
      });

      it("returns status code 400 with non-existent email", function(done) {
        request(app)
          .post("/auth/login")
          .send("email=idontexist@gmail.com")
          .send(`password=${validLoginTestData.password}`)
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No account associated with that email or invalid password");
          })
          .end(done);
      });

      it("returns status code 400 with invalid password", function(done) {
        request(app)
          .post("/auth/login")
          .send(`email=${validLoginTestData.email}`)
          .send("password=incorrectPassword")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("No account associated with that email or invalid password");
          })
          .end(done);
      });

      it("returns status code 400 with no password sent", function(done) {
        request(app)
          .post("/auth/login")
          .send(`email=${validLoginTestData.email}`)
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a valid password.");
          })
          .end(done);
      });

      it("returns status code 400 with password under 8 characters", function(done) {
        request(app)
          .post("/auth/login")
          .send(`email=${validLoginTestData.email}`)
          .send("password=1234567")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Password must have at least 8 characters.");
          })
          .end(done);
      });

      it("returns status code 400 with password over 50 characters", function(done) {
        request(app)
          .post("/auth/login")
          .send(`email=${validLoginTestData.email}`)
          .send("password=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Password can have a maximum of 50 characters.");
          })
          .end(done);
      });
    });

    describe("POST /auth/signup", function() {
      after(function(done) {
        User.findOneAndRemove(
          {
            email: "test123@hotmail.com"
          },
          err => {
            return done();
          }
        );
      });

      it("returns status code 200 with valid data", function(done) {
        request(app)
          .post("/auth/signup")
          .send("email=test123@hotmail.com")
          .send("password=password")
          .send("userURL=userURL123")
          .send("displayName=testname")
          .send("city=Belfast")
          .expect(200)
          .expect(function(res) {
            res.body.message.should.equal("You have successfully signed up! Now you should be able to log in.");
          })
          .end(done);
      });

      it("returns status code 409 with conflicting email", function(done) {
        request(app)
          .post("/auth/signup")
          .send("email=test@hotmail.com")
          .send("password=password")
          .send("userURL=userURL1234")
          .send("displayName=testname")
          .send("city=Belfast")
          .expect(409)
          .expect(function(res) {
            res.body.message.should.equal("This email is already taken.");
          })
          .end(done);
      });

      it("returns status code 400 with invalid email", function(done) {
        request(app)
          .post("/auth/signup")
          .send("email=invalidEmail")
          .send("password=password")
          .send("userURL=userURL123")
          .send("displayName=testname")
          .send("city=Belfast")
          .send("password=password")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a valid email address.");
          })
          .end(done);
      });

      it("returns status code 400 with no email sent", function(done) {
        request(app)
          .post("/auth/signup")
          .send("password=password")
          .send("userURL=userURL123")
          .send("displayName=testname")
          .send("city=Belfast")
          .send("password=password")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a valid email address.");
          })
          .end(done);
      });

      it("returns status code 400 with no password sent", function(done) {
        request(app)
          .post("/auth/signup")
          .send("email=test123@hotmail.com")
          .send("userURL=userURL123")
          .send("displayName=testname")
          .send("city=Belfast")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a valid password.");
          })
          .end(done);
      });

      it("returns status code 400 with password under 8 characters", function(done) {
        request(app)
          .post("/auth/signup")
          .send("email=nonConflictingEmail@hotmail.com")
          .send("password=passwor")
          .send("userURL=userURL123")
          .send("displayName=testname")
          .send("city=Belfast")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Password must have at least 8 characters.");
          })
          .end(done);
      });

      it("returns status code 400 with password over 50 characters", function(done) {
        request(app)
          .post("/auth/signup")
          .send("email=nonConflictingEmail@hotmail.com")
          .send("password=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
          .send("userURL=userURL123")
          .send("displayName=testname")
          .send("city=Belfast")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Password can have a maximum of 50 characters.");
          })
          .end(done);
      });

      it("returns status code 400 with no userURL sent", function(done) {
        request(app)
          .post("/auth/signup")
          .send("email=test123@hotmail.com")
          .send("password=password")
          .send("displayName=testname")
          .send("city=Belfast")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a userURL.");
          })
          .end(done);
      });

      it("returns status code 409 with conflicting userURL", function(done) {
        request(app)
          .post("/auth/signup")
          .send("email=test1234@hotmail.com")
          .send("password=password")
          .send("userURL=testurl")
          .send("displayName=testname")
          .send("city=Belfast")
          .expect(409)
          .expect(function(res) {
            res.body.message.should.equal("This userURL is already taken.");
          })
          .end(done);
      });

      it("returns status code 400 with userURL over 20 characters", function(done) {
        request(app)
          .post("/auth/signup")
          .send("email=nonConflictingEmail@hotmail.com")
          .send("password=password")
          .send("userURL=userURLThatIs21Charrr")
          .send("displayName=testname")
          .send("city=Belfast")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("UserURL can have a maximum of 20 characters");
          })
          .end(done);
      });

      it("returns status code 400 with no city name sent", function(done) {
        request(app)
          .post("/auth/signup")
          .send("email=nonConflictingEmail@hotmail.com")
          .send("password=password")
          .send("userURL=userURL123")
          .send("displayName=testname")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Please provide a city name.");
          })
          .end(done);
      });

      it("returns status code 400 with invalid city name", function(done) {
        request(app)
          .post("/auth/signup")
          .send("email=nonConflictingEmail@hotmail.com")
          .send("password=password")
          .send("userURL=userURL123")
          .send("displayName=testname")
          .send("city=invalidCity")
          .expect(400)
          .expect(function(res) {
            res.body.message.should.equal("Invalid City");
          })
          .end(done);
      });
    });
  });
});
