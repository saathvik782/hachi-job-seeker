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

//ElasticSearch stuff
var elasticsearch = require('elasticsearch');
var elasticClient = new elasticsearch.Client({ host: process.env.ELASTIC_HOST});

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

        elasticClient.index({
            index: 'authtokens',
            type: 'googlePlus',
            body: {
                state: 'queued',
                token: tokens 
            }
        },function(error,response){
            if(error){
                console.log(error);
            }
        });
    
        return res.redirect('/');
    });
});

module.exports = router;
