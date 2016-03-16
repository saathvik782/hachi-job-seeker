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

kue.app.listen(4000);
