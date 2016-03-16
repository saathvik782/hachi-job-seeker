var kue = require('kue')
  , queue = kue.createQueue();

var numberOfAttempts = 3;

//ElasticSearch stuff
var elasticsearch = require('elasticsearch');
var elasticClient = new elasticsearch.Client({ host: process.env.ELASTIC_HOST});
elasticClient.ping({
  // ping usually has a 3000ms timeout 
  requestTimeout: Infinity,
  
  // undocumented params are appended to the query string 
  hello: "elasticsearch!"
}, function (error) {
    if (error) {
        console.trace('elasticsearch cluster is down!');
    } else {
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
        var job = queue.create('discover tokens',{
        }).attempts(1).backoff({ type: 'exponential'}).removeOnComplete(true).save();

        
        queue.on('job enqueue', function(id, type){
          console.log( 'Job %s got queued of type %s', id, type );
        }).on('job complete', function(id, result){
            //console.log( 'Job '+id+' got completed result is '+result);
            console.log( 'Job '+id+' got completed ');
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

        //Main process that dicovers tokens
        queue.process('discover tokens',1,function(job,done){
            //Discover if any tokens are yet to be processed
            elasticClient.search({
                index: 'authtokens',
                type: 'googlePlus',
                body: {
                    query: { match: { state: "queued"}},
                    sort: [{ _timestamp: { order: "desc"}}]
                }
            },function(error,response){
                if(error)
                    return done({err: error,isId:false });
                if( response.hits.total > 0){
                    var tokenReponse  = response.hits.hits[0];
                    elasticClient.update({
                        index: 'authtokens',
                        type: 'googlePlus',
                        id: tokenReponse._id,
                        body: {
                            doc: {
                                'state': 'processing'
                            }
                        }
                    },function(error,response){
                        if(error)
                            return done({err: error,isId:true, id: tokenReponse._id});
                        var job = queue.create('connection process',{
                            token: tokenReponse._source.token,
                            id: tokenReponse._id
                        }).attempts(numberOfAttempts).backoff(true).removeOnComplete(true).save();
                        //done(null,{isId:true,id:tokenReponse._id});
                        done(null,"Done perfectly");
                    });
                }
                var job = queue.create('discover tokens',{
                })
                .on('complete',function(result){
                    if(result.isId){
                        elasticClient.update({
                            index: 'authtokens',
                            type: 'googlePlus',
                            id: result.id,
                            body: {
                                doc: {
                                    'state': 'processing'
                                }
                            }
                        });
                    }
                }).on('failed',function(error){
                    if(error.isId){
                        elasticClient.update({
                            index: 'authtokens',
                            type: 'googlePlus',
                            id: error.id,
                            body: {
                                doc: {
                                    'state': 'processing'
                                }
                            }
                        });
                    }
                }).attempts(1).delay(10 * 1000).backoff({ type: 'exponential'}).removeOnComplete(true).save();
                done({isId:false});
            });
        });
    
        //Process connections for this user
        queue.process('connection process', 20, function(job, done){
            var tokens = job.data.token;
            oauth2Client.setCredentials(tokens);
        
            var plus = google.plus({ version: 'v1', auth:oauth2Client});
            plus.people.list({ userId: 'me', collection:'visible'},function(err,connections){
                if ( err ){
                    var error = {};
                    error['id'] = job.id;
                    return done(error);
                }
                
                // Here you go! Got your connections!
                connections.items.map(function(obj){            
                    var job = queue.create('connection individual process',{
                        token : tokens,
                        obj : obj 
                    }).attempts(numberOfAttempts).backoff(true).removeOnComplete(true).save();
                });
                done(null,{ id: job.id });
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

                    //Storing processed data into elasticSearch
                    elasticClient.index({
                        index: 'processed_data',
                        type: 'googlePlus',
                        body: resp 
                    },function(error,response){
                        if(error){
                            done(error);
                        }
                        done(null,JSON.stringify(resp));
                    });
                });
            }else{
                done(null,"not a person");
            }
        });
    }
});
kue.app.listen(4000);
