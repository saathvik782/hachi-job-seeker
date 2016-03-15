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
       
        //Step 1
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
    }
});
