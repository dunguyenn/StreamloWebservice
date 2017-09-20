const request = require('supertest');
const chai = require('chai');

let should = chai.should();
let assert = chai.assert;

describe('Patient Portal Webservice', function() {
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
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
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
                .end(done);
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
                .end(done);
        });
    });
});
