var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../../models/userModel.js');
var mongoose = require('mongoose');
var conn = mongoose.connection;

module.exports = function() {
    passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    },
    function(email, password, done){

        var query = User.findOne({email: email});

        query.exec(function(err, user){
            if(err) {
                return done(err);
            }
            if(!user) {
                console.log("incorrect email");
                return done(null, false, { message: 'Incorrect email.' });
            }
            user.validPassword(password, function(valid){
                if(!valid){
                    console.log("incorrect password");
                    return done(null, false, { message: 'Incorrect password.' });
                } else {
                    var userInfo = {
                        _id: user._id,
                        displayName: user.displayName,
                        userURL: user.userURL
                    };
                    return done(null, userInfo);
                }
            });
        });
    }));
};
