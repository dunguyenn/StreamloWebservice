var passport = require('passport');

module.exports = function (app) {
    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser(function(user, done){
        //push entire object to session
        done(null, user); // replace with user.id
    });

    passport.deserializeUser(function (user, done) { // Replace user with userId
        //mongo.findbyId
        done(null, user);
    });

    require('./strategies/local.strategy')();
};
