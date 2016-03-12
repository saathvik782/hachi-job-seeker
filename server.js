var express = require('express');
var app = express();

//Linked in stuff
var callbackUrl = 'http://49.204.3.137:3000/oauth/linkedin/callback';
var Linkedin = require('node-linkedin')(process.env.LINKEDIN_CLIENT_ID,process.env.LINKEDIN_CLIENT_SECRET, callbackUrl);
//var scope = ['r_basicprofile', 'r_fullprofile', 'r_emailaddress', 'r_network', 'r_contactinfo', 'rw_nus', 'rw_groups', 'w_messages'];
var scope = ['r_basicprofile'];

app.get('/', function (req, res) {
  res.send('Hello World!');
});

// Using a library like `expressjs` the module will
// redirect for you simply by passing `res`.
app.get('/oauth/linkedin', function(req, res) {
    // This will ask for permisssions etc and redirect to callback url.
    Linkedin.auth.authorize(res, scope);
});

// Again, `res` is optional, you could pass `code` as the first parameter
app.get('/oauth/linkedin/callback', function(req, res) {
    console.log("works");
    Linkedin.auth.getAccessToken(res, req.query.code, req.query.state, function(err, results) {
        if ( err )
            return console.error(err);

        /**
         * Results have something like:
         * {"expires_in":5184000,"access_token":". . . ."}
         */

        console.log(results);
        return res.redirect('/');
    });
});

app.listen(3000);
