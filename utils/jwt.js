var jwt = require('jsonwebtoken');

module.exports = {
  //Generate Token using secret from process.env.JWT_SECRET
  generateToken: function(user) {
    var u = {
     userURL: user.userURL,
     city: user.city,
     email: user.email
    };

    return token = jwt.sign(u, process.env.JWT_SECRET, {
      expiresIn: 60 * 60 * 24 // expires in 24 hours
    });
  }
}
