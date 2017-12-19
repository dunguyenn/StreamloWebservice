describe('User Service Integration Tests', function() {
  describe('Public User Endpoints', function() {
    describe('GET users/', function() {
      it.skip('retuns status code 200 with valid data', function(done) {
        
      });
    });
    
    describe('GET users/:userURL', function() {
      it.skip('retuns status code 200 with valid data', function(done) {
        
      });
    });
    
    describe('GET users/id/:userId', function() {
      it.skip('retuns status code 200 with valid data', function(done) {
        
      });
    });
    
    describe('GET users/count/byDisplayname', function() {
      it.skip('retuns status code 200 with valid data', function(done) {
        
      });
    });
  });
  
  describe('Protected User Endpoints', function() {
    describe('POST users/:userURL/addProfilePicture', function() {
      it.skip('retuns status code 200 with valid data', function(done) {
        
      });
      
      it.skip('returns status code 401 and correct message when no jwt access token header present', function(done) {
        
      });
    });
  });
});