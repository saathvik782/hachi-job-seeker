var express = require('express');
var router = express.Router();

//Linkedin stuff
var callbackUrl = 'http://49.204.3.137:3000/oauth/linkedin/callback';
var Linkedin = require('node-linkedin')(process.env.LINKEDIN_CLIENT_ID,process.env.LINKEDIN_CLIENT_SECRET, callbackUrl);
//var scope = ['r_basicprofile', 'r_fullprofile', 'r_emailaddress', 'r_network', 'r_contactinfo', 'rw_nus', 'rw_groups', 'w_messages'];
var scope = ['r_basicprofile'];

//Let's simulate a database for now
var accessTokens = [];

// Using a library like `expressjs` the module will
// redirect for you simply by passing `res`.
router.get('/', function(req, res) {
    // This will ask for permisssions etc and redirect to callback url.
    Linkedin.auth.authorize(res, scope, 'state');
});

// Again, `res` is optional, you could pass `code` as the first parameter
router.get('/callback', function(req, res) {
    Linkedin.auth.getAccessToken(res, req.query.code, req.query.state, function(err, results) {
        if ( err )
            return console.error(err);

        /**
         * Results have something like:
         * {"expires_in":5184000,"access_token":". . . ."}
         */
        accessTokens.push(results);
    
        return res.redirect('/oauth/linkedin/connections');
    });
});

router.get('/connections',function(req,res){
    console.log(accessTokens[0].access_token);
    var linkedin = Linkedin.init(accessTokens[0].access_token);
    linkedin.connections.retrieve(function(err, connections) {
        if ( err )
            return console.error(err);
        // Here you go! Got your connections!
        console.log(connections);

        return res.redirect('/');
    });
});

module.exports = router;
