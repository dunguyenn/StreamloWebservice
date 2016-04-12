var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongodb = require('mongodb').MongoClient; // TODO remove once mongoose workin also from NPM package

module.exports = function() {
    passport.use(new LocalStrategy({
        usernameField: 'userName',
        passwordField: 'password'
    },
    function(username, password, done){
        console.log("Inlocalstrategy");
        var url = 'mongodb://localhost:27017/test';
        mongodb.connect(url, function(err, db) {
            var collection = db.collection('passportusers');
            collection.findOne({username: username},
                function(err, results) {
                    if(results.password === password) {
                        console.log(results);
                        var user = results;
                        done(null, user);
                    } else {
                        //done('Bad Password', null);
                        done(null, false, {message: 'Bad Password'});
                    }

                }
            );
        });
    }));
};
