var express = require('express');
var router = express.Router();
//ElasticSearch stuff
var elasticsearch = require('elasticsearch');
var elasticClient = new elasticsearch.Client({ host: process.env.ELASTIC_HOST});

router.get('/', function(req, res) {
    elasticClient.ping({
      // ping usually has a 3000ms timeout 
      requestTimeout: Infinity,
      
      // undocumented params are appended to the query string 
      hello: "elasticsearch!"
    }, function (error) {
        if(error) return res.status(500).json({ error: 'elasticsearch server is down' });
        
        //req,res
        //analyze requests and search for a queries
        var job = req.query.job;
        if(job === undefined)
            return res.status(401).json({ error: 'parameters are wrong' })

        var query = {
            "from": 0,
            "size": 10,
            "query": {
                "or": [
                {
                    "match": {
                        "skills": {
                            "query": job.skills,
                            "boost": 4
                        }
                    }
                },
                {
                    "match": {
                        "title": {
                            "query": job.title,
                            "boost": 2
                        }
                    }
                },
                {
                    "match": {
                        "description": {
                            "query": job.description,
                            "boost": 0.5
                        }
                    }
                }
                ]
            },
            "sort": [
                "_score"
            ]
        };
    
        elasticClient.search({
            index: 'processed_data',
            type: 'googlePlus',
            body: query
        },function(err,response){
            if(err) 
                return res.status(403).json(error);
    
            return res.status(200).json(response);
        });
    });
});

module.exports = router;
