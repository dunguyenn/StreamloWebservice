let chai = require('chai');
var assert = chai.assert;

const rewire = require('rewire');

describe('validateSignupForm Function', function() {
    let app = rewire('../../controllers/authController');
    let validateSignupForm = app.__get__('validateSignupForm');

    it('should return true if valid email and password passed', function(done) {
        let reqBody = {
            email: "test@hotmail.co.uk",
            password: "password",
            userURL: "test1"
        };

        let isFormValid = validateSignupForm(reqBody).success;
        assert.isTrue(isFormValid, done());
    });
    it('should return false if invalid email passed', function(done) {
        let reqBody = {
            email: 123,
            password: "password",
            userURL: "test1"
        };

        let isFormValid = validateSignupForm(reqBody).success;
        assert.isFalse(isFormValid, done());
    });
    it('should return false if invalid password passed', function(done) {
        let reqBody = {
            email: "jsmith",
            password: 123,
            userURL: "test1"
        };

        let isFormValid = validateSignupForm(reqBody).success;
        assert.isFalse(isFormValid, done());
    });
    it('should return false if invalid email and password passed', function(done) {
        let reqBody = {
            email: 123,
            password: 123,
            userURL: "test1"
        };

        let isFormValid = validateSignupForm(reqBody).success;
        assert.isFalse(isFormValid, done());
    });
});