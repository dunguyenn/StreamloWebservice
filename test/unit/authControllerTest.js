let chai = require('chai');
var assert = chai.assert;

const rewire = require('rewire');

describe('authController.js Unit Tests', function() {
  describe('validateSignupForm Function', function() {
      let app = rewire('../../controllers/authController');
      let validateSignupForm = app.__get__('validateSignupForm');

      it('should return true if valid req body passed', function(done) {
          let reqBody = {
              email: "test@hotmail.co.uk",
              password: "password",
              userURL: "test1",
              displayName: "testname",
              city: "Belfast"
          };

          let isFormValid = validateSignupForm(reqBody).success;
          assert.isTrue(isFormValid, done());
      });
      it('should return false if invalid email passed', function(done) {
          let reqBody = {
              email: 123,
              password: "password",
              userURL: "test1",
              displayName: "testname",
              city: "Belfast"
          };

          let isFormValid = validateSignupForm(reqBody).success;
          assert.isFalse(isFormValid, done());
      });
      it('should return false if invalid password passed', function(done) {
          let reqBody = {
              email: "test@hotmail.co.uk",
              password: 123,
              userURL: "test1",
              displayName: "testname",
              city: "Belfast"
          };

          let isFormValid = validateSignupForm(reqBody).success;
          assert.isFalse(isFormValid, done());
      });
      it('should return false if invalid email and password passed', function(done) {
          let reqBody = {
              email: 123,
              password: 123,
              userURL: "test1",
              displayName: "testname",
              city: "Belfast"
          };

          let isFormValid = validateSignupForm(reqBody).success;
          assert.isFalse(isFormValid, done());
      });
  });
});