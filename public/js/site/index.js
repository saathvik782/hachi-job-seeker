$(document).on('ready',function(){
    $('#submit-button').on('click',function(e){
        e.preventDefault();
        var job = {};
        job['title'] = $('#title').val();
        job['skills'] = $('#skills').val();
        job['description'] = $('#description').val();
        
        console.log('doing ajax now');
        $.ajax({
            url: 'http://localhost:3000/requests/jobRequest',
            data: {
                job: job
            },
            dataType:'json',
            type: 'GET'
        }).success(function(data){
            console.log(data);
            $('#messages').html('');
            for(var each in data.hits.hits){
                var obj = data.hits.hits[each];
                $('#messages').append(
                    '<div class="alert alert-success"><strong>Success!</strong>'+JSON.stringify(obj)+'</div>'
                );
            }
        }).error(function(err){
            $('#messages').html(
                '<div class="alert alert-danger"><strong>Error!</strong>'+err+'</div>'
            );
        });
    });
});
