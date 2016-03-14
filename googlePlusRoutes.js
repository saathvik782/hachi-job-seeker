var express = require('express');
var router = express.Router();
var fs = require('fs');

//GooglePlus stuff
var callbackUrl = 'http://localhost:3000/oauth/googlePlus/callback';
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(process.env.GOOGLEPLUS_CLIENT_ID, process.env.GOOGLEPLUS_CLIENT_SECRET, callbackUrl);
// generate a url that asks permissions for Google+ and Google Calendar scopes
var scopes = [
    'https://www.googleapis.com/auth/plus.login',
    'https://www.googleapis.com/auth/calendar'
    ];
//var scopes = 'https://www.googleapis.com/auth/plus.me';

//Let's simulate a database for now
var accessTokens = [];
var occupationDetails= [];

router.get('/',function(req,res){
    console.log('trying to generate g+ oauth');

    var url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
      scope: scopes // If you only need one scope you can pass it as string
    });

    return res.redirect(url);
});

router.get('/callback',function(req,res){
    oauth2Client.getToken(req.query.code, function(err, tokens) {
        if ( err )
            return console.error(err);

        accessTokens.push(tokens);
    
        return res.redirect('/oauth/googlePlus/connections');
    });
});

router.get('/connections',function(req,res){
    var tokens = accessTokens[0];
    oauth2Client.setCredentials(accessTokens[0]);

    var plus = google.plus({ version: 'v1', auth:oauth2Client});
    console.log('moving past the setCredentials');
    plus.people.list({ userId: 'me', collection:'visible'},function(err,connections){
        if ( err )
            return console.error(err);
        
        var fieldsWeAreLookingFor = ['aboutMe','currentLocation','occupations','organizations','skills'];

        // Here you go! Got your connections!
        connections.items.map(function(obj){
            if(obj.objectType === 'person'){
                plus.people.get({ userId: obj.id, field: fieldsWeAreLookingFor},function(err,resp){
                    if(!err){
                        occupationDetails.push(resp);
                    }
                });
            }
        });

        return res.json(connections);
    });
});

router.get('/occupationDetails',function(req,res){
    return res.json(occupationDetails);
});

module.exports = router;
