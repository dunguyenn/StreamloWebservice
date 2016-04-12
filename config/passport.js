var passport = require('passport');

module.exports = function (app) {
    console.log("thiswascalled");
    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser(function(user, done){
        console.log('seralize');
        console.log('user:' + user);
        //push entire object to session
        done(null, user); // replace with user.id
    });

    passport.deserializeUser(function (user, done) { // Replace user with userId
        console.log('de seralize');
        console.log(user);
        //mongo.findbyId
        done(null, user);
    });

    require('./strategies/local.strategy')();
};
