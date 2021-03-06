var kue = require('kue')
  , queue = kue.createQueue();

var Utils = require('../Utils/Utils');
var numberOfAttempts = 3;
var delayBetweenApiCalls_s = 5;

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
        
        startADiscoveryProcess(queue)

        queue.on('job enqueue', function(id, type){
          console.log( 'Job %s got queued of type %s', id, type );
        }).on('job complete', function(id, result){
            console.log( 'Job '+id+' got completed ');
            //Comment below out if you want to log
            //kue.Job.get(id, function(err, job){
            //    if (err) return;
            //    job.remove(function(err){
            //        if (err) throw err;
            //        console.log('removed completed job #%d', job.id);
            //    });
            //});
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
                    return done(JSON.stringify({err: error,isId:false }));
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
                        startADiscoveryProcess(queue);
                        if(error)
                            return done(JSON.stringify({err: error,isId:true, id: tokenReponse._id}));
                        startAConnectionProcess(queue,tokenReponse._source.token);
                        done(null,JSON.stringify({isId:true,id:tokenReponse._id}));
                    });
                }else{
                    startADiscoveryProcess(queue);
                    done(JSON.stringify({isId:false}));
                }
            });
        });
    
        //Process connections for this user
        queue.process('connection process', 20, function(job, done){
            var tokens = job.data.token;
            oauth2Client.setCredentials(tokens);
        
            var plus = google.plus({ version: 'v1', auth:oauth2Client});
            var query = { userId: 'me', collection:'visible'};
            if(job.data.nextPageToken !== undefined){
                query['pageToken'] = job.data.nextPageToken;
            }

            plus.people.list(query,function(err,connections){
                if ( err ){
                    return done(err);
                }
                
                if(connections['nextPageToken'] !== undefined){
                    console.log('next page token found',connections['nextPageToken']);
                    //XXX: make way for new process
                    startAConnectionProcess(queue,job.data.token,connections['nextPageToken']);
                }

                // Here you go! Got your connections!
                connections.items.map(function(obj){            
                    if(obj.objectType === 'person'){
                        var job = queue.create('connection individual process',{
                            token : tokens,
                            obj : obj 
                        }).attempts(numberOfAttempts).delay(delayBetweenApiCalls_s * 1000).backoff({delay: delayBetweenApiCalls_s*1000,type: 'exponential'}).save();
                    }
                });
                done();
            });
        });
       
        queue.process('connection individual process',5,function(job,done){
            var tokens = job.data.token;
            var obj = job.data.obj;
            oauth2Client.setCredentials(tokens);
        
            var plus = google.plus({ version: 'v1', auth:oauth2Client});
            var fieldsWeAreLookingFor = ['aboutMe','currentLocation','occupations','organizations','skills'];
            plus.people.get({ userId: obj.id, field: fieldsWeAreLookingFor},function(err,resp){
                if(err)
                    return done(err);

                //Storing processed data into elasticSearch
                //XXX: The create method restricts duplicates, should find a better method to do so
                elasticClient.create({
                    index: 'processed_data',
                    type: 'googlePlus',
                    id : resp.id,
                    body: Utils.convertGooglePlusResponseToDesiredFormat(resp)
                },function(error,response){
                    if(error){
                        done(error);
                    }
                    done(null,JSON.stringify(resp));
                });
            });
        });

    }
});

function startADiscoveryProcess(queue){
        var job = queue.create('discover tokens',{
        })
        .on('complete',function(result){
            var res = JSON.parse(result);
            if(res.isId){
                elasticClient.update({
                    index: 'authtokens',
                    type: 'googlePlus',
                    id: res.id,
                    body: {
                        doc: {
                            'state': 'done'
                        }
                    }
                });
            }
        }).on('failed',function(error){
            var err = JSON.parse(error);
            if(err.isId){
                elasticClient.update({
                    index: 'authtokens',
                    type: 'googlePlus',
                    id: err.id,
                    body: {
                        doc: {
                            'state': 'queued'
                        }
                    }
                });
            }
        }).attempts(1).delay(2 * delayBetweenApiCalls_s * 1000).save();
}

function startAConnectionProcess(queue,token,nextPageToken){
    var data = {
        token : token
    };
    if(nextPageToken != null)
        data['nextPageToken'] = nextPageToken;

    var job = queue.create('connection process',data).attempts(numberOfAttempts).save();
}
                    
kue.app.listen(4000);
