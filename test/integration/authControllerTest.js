const request = require('supertest');
const chai = require('chai');

let should = chai.should();
let assert = chai.assert;

describe('Patient Portal Webservice', function() {
    describe('POST /auth/login', function() {
        var server;
        beforeEach(function() {
            server = require('../../app');
        });
        afterEach(function() {
            server.close();
        });
        it('returns status code 200 with valid data', function(done) {
            request(server)
                .post('/auth/login')
                .send('email=test@hotmail.co.uk')
                .send('password=password')
                .expect(200)
                .expect(function(res) {
                    res.body.message.should.equal("You have successfully logged in!");
                    res.body.success.should.equal(true);
                    assert.isObject(res.body.profile);
                    assert.isString(res.body.token);
                })
                .end(done);
        });
    });
});