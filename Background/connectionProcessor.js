var kue = require('kue')
  , queue = kue.createQueue();

//var elasticsearch = require('elasticsearch');
//var elasticClient = new elasticsearch.Client({ host:});

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

var occupationDetails = [];

queue.on('job enqueue', function(id, type){
  console.log( 'Job %s got queued of type %s', id, type );

}).on('job complete', function(id, result){
    console.log( 'Job '+id+' got completed result is '+result);
    kue.Job.get(id, function(err, job){
        if (err) return;
        job.remove(function(err){
            if (err) throw err;
            console.log('removed completed job #%d', job.id);
        });
    });
}).on('job progress',function(id,progress){
    console.log('Job '+id+' is at '+progress);
});

queue.process('connection process', 20, function(job, done){
    var tokens = job.data.token;
    oauth2Client.setCredentials(tokens);

    var plus = google.plus({ version: 'v1', auth:oauth2Client});
    plus.people.list({ userId: 'me', collection:'visible'},function(err,connections){
        if ( err )
            return done(err);
        
        // Here you go! Got your connections!
        connections.items.map(function(obj){            
            var job = queue.create('connection individual process',{
                token : tokens,
                obj : obj 
            }).attempts(3).backoff(true).removeOnComplete(true).save();
        });
        done(null,"all individuals are queued");
    });
});

queue.process('connection individual process',20,function(job,done){
    var tokens = job.data.token;
    var obj = job.data.obj;
    oauth2Client.setCredentials(tokens);

    var plus = google.plus({ version: 'v1', auth:oauth2Client});
    var fieldsWeAreLookingFor = ['aboutMe','currentLocation','occupations','organizations','skills'];
    if(obj.objectType === 'person'){
        plus.people.get({ userId: obj.id, field: fieldsWeAreLookingFor},function(err,resp){
            if(err)
                return done(err);
            
            occupationDetails.push(resp);
            done(null,JSON.stringify(resp));
        });
    }else{
        done(null,"not a person");
    }
});

kue.app.listen(4000);
