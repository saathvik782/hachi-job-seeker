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

        //Step 0
        elasticClient.indices.delete({
            index: '_all'
        },function(err,resp){
            if(err){
                return console.log('removing indices failed')
            }
            //Step 2
            var indexName = 'authtokens';
            elasticClient.indices.create({
                index: indexName,
                body: {
                    "mappings": {
                        "googlePlus": {
                            "_timestamp": { 
                                "enabled": true
                            }
                        }
                    }
                }
            },function(err,resp){
                if(err)
                    console.log('Creating index '+indexName+' failed --'+err);
            });
        });


        //Step 3
        var kue = require('kue')
          , queue = kue.createQueue();
        
        queue.active( function( err, ids ) {
            ids.forEach( function( id ) {
                kue.Job.get( id, function( err, job ) {
                    // Your application should check if job is a stuck one
                    job.remove();
                });
            });
        });
        
        queue.inactive( function( err, ids ) {
            ids.forEach( function( id ) {
                kue.Job.get( id, function( err, job ) {
                    // Your application should check if job is a stuck one
                    job.remove();
                });
            });
        });
        
        queue.failed( function( err, ids ) {
            ids.forEach( function( id ) {
                kue.Job.get( id, function( err, job ) {
                    // Your application should check if job is a stuck one
                    job.remove();
                });
            });
        });

        queue.complete( function( err, ids ) {
            ids.forEach( function( id ) {
                kue.Job.get( id, function( err, job ) {
                    // Your application should check if job is a stuck one
                    job.remove();
                });
            });
        });

        kue.app.listen(4000);
    }
});
