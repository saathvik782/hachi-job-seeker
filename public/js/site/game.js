//This will be the utimate ai that calibrates and tinkers everything
$(document).on('ready',function(){
    var socket=io();
    
    var wordSoFar=[];
    var idSoFar=[];
    var movementInfo={};
    var turn=false;
    movementInfo.firstGrid={};
    movementInfo.firstGrid.i=0,movementInfo.firstGrid.j=0;
    movementInfo.allowable={};
    movementInfo.allowable.i=0,movementInfo.allowable.j=0;
    movementInfo.prevGrid={};
    movementInfo.prevGrid.i=0,movementInfo.prevGrid.j=0;

    var choosenPath=0;//0-for horizontal,1-for vertical,2-for diagonal
    var choosenDirection=1; 

    
    var token,user,colour,gridSize;
    token=$('#mainScreen').attr('data-token'); 
    user=$('#mainScreen').attr('data-user'); 
    
    //First event that is emitted once a game screen loads 
    socket.emit('join',{
        //Sending user name and token as data
        'token':token,
        'name':user
    });

    socket.on('wait',function(data){
        displayOnMainScreen(data);
    });
    
    socket.on('missed',function(data){
        displayOnMainScreen(data);
    });
    
    socket.on('waiting-for-more-players',function(data){
        displayOnMainScreen(data);
        if(data.root == user){
            data.time_remaining--;
            window.setTimeout(socket.emit('time-remaining',data), 1000);
        }
    });

    socket.on('start',function(data){
        displayOnSideScreenL(data);
        colour=data.player_info[user].colour;
        $('#colouredUserName').css('background-color', colour);
        $('#mainScreen').html('');
        gridSize=data.puzzle.length;
        $('#mainScreen').append('<table class="table table-bordered"><tbody></tbody></table>');
        for(var i=0;i<data.puzzle.length;i++){
            $('#mainScreen > table > tbody').append('<tr id="'+i+'-tr"><tr/>')
            for(var j=0;j<data.puzzle[i].length;j++){
                //$('#mainScreen').append('<button class="btn success disabled letter" data-i="'+i+'" data-j="'+j+'" data-letter="'+data.puzzle[i][j] +'" id="'+i+'-'+j+'">'+data.puzzle[i][j]+'</button> ');
                $('#mainScreen > table > tbody > #'+i+'-tr').append('<td class="success letter" data-i="'+i+'" data-j="'+j+'" data-letter="'+data.puzzle[i][j] +'" id="'+i+'-'+j+'">'+data.puzzle[i][j]+'</td>');
            }
        }
        
        $('.letter').on('click',function(e){
            if(!turn) return false;
            //If he clicks on a element that is already selected everything after the element will be remove
            var index=idSoFar.indexOf(e.target.id);
            if(index > -1){
                var unmark_list=idSoFar.splice(index,idSoFar.length-index);
                //console.log(unmark_list);
                wordSoFar.splice(index,wordSoFar.length-index);
                socket.emit('new-click',{
                    'token':token,
                    'name':user,
                    'colour':colour,
                    'id_list':unmark_list,
                    'action': 'unmark',
                });
                if(wordSoFar.length == 0){
                    releaseTheLettersAndPass();
                }
                return false;
            }
            
            //Code for restricting clicking of elements
            var i=parseInt($(this).attr("data-i")),j=parseInt($(this).attr("data-j"));
            //Need to record first click to restrict movement only column,row and diagnal wise
            if(wordSoFar.length == 0){
                movementInfo.firstGrid.i=i;
                movementInfo.firstGrid.j=j;
                movementInfo.prevGrid.i=i;
                movementInfo.prevGrid.j=j;

                clearAllLetters(); 
            }
            else if(wordSoFar.length == 1){
                movementInfo.allowable.i=i-movementInfo.prevGrid.i;
                movementInfo.allowable.j=j-movementInfo.prevGrid.j;
                
                //case when 2nd is a click in a new place
                if(Math.abs(movementInfo.allowable.i)>1 || Math.abs(movementInfo.allowable.j)>1){
                    //case when something is clicked in a new place
                    movementInfo.firstGrid.i=i;
                    movementInfo.firstGrid.j=j;
                    var unmark_list=idSoFar.splice(0,idSoFar.length);
                    socket.emit('new-click',{
                        'token':token,
                        'name':user,
                        'colour':colour,
                        'id_list':unmark_list,
                        'action': 'unmark',
                    });
                    wordSoFar=[];
                    idSoFar=[];
                }
                
                movementInfo.prevGrid.i=i;
                movementInfo.prevGrid.j=j;
            }else{
                if((movementInfo.prevGrid.i+movementInfo.allowable.i != i) || (movementInfo.prevGrid.j+movementInfo.allowable.j != j)){
                    //case when something is clicked in a new place
                    movementInfo.firstGrid.i=i;
                    movementInfo.firstGrid.j=j;
                    var unmark_list=idSoFar.splice(0,idSoFar.length);
                    socket.emit('new-click',{
                        'token':token,
                        'name':user,
                        'colour':colour,
                        'id_list':unmark_list,
                        'action': 'unmark',
                    });
                    wordSoFar=[];
                    idSoFar=[];
                }
                movementInfo.prevGrid.i=i;
                movementInfo.prevGrid.j=j;
            }
            //console.log(movementInfo);
            wordSoFar.push($(this).attr('data-letter'));
            idSoFar.push(e.target.id);
            
            socket.emit('new-click',{
                'token':token,
                'name':user,
                'colour':colour,
                'id_list':[e.target.id],
                'action': 'mark',
                'display_data':getWord()
            });
        });
    });
    
    $(document).bind('keypress',function(e){
        var code = e.keyCode || e.which;
        if(code == 13) { //Enter keycode
            e.preventDefault();
            var word = getWord();
            if(word == "")
                return;
            socket.emit('new-enter',{
                'token':token,
                'name':user,
                'colour':colour,
                'word':word
            });
        }
    });

    $('#gamePassButton').on('click',function(){
        socket.emit('pass',{
            'token':token,
            'name':user,
            'colour':colour
        });
    });

    socket.on('new-click',function(data){
        displayOnSideScreenL(data);
        displayOnSideScreenR(data);
        //highlight the correct element
        for(var each in data.id_list){
            if(data.action == 'mark'){
                $('#'+data.id_list[each]).removeClass("success");
                $('#'+data.id_list[each]).addClass("warning");
            }
            else if(data.action == 'unmark'){
                $('#'+data.id_list[each]).removeClass("warning");
                $('#'+data.id_list[each]).addClass("success");
            }
        }
    });
    
    socket.on('new-turn',function(data){
        displayOnSideScreenL(data);
        clearAllLetters();
        wordSoFar=[];
        idSoFar=[];
        //if not your turn make all words unclickable
        if(data.name == user){
            releaseTheLettersAndPass();
            displayOnSideScreenR(data);
            turn=true;
        }
        else{
            cageTheLettersAndPass();
            turn=false;
        }
    });
     
    socket.on('new-enter',function(data){
        displayOnSideScreenR(data);
    });   
    socket.on('player-passed',function(data){
        displayOnSideScreenR(data);
    });
    
    socket.on('player-joined',function(data){
        displayOnSideScreenR(data);
    });

    
    socket.on('player-disconnected',function(data){
        displayOnSideScreenR(data);
    });
    
    socket.on('abort',function(data){
        displayOnMainScreen(data);
    });
    
    function displayOnMainScreen(data){
        //console.log(data);
        if('display_data' in data)
            $('#mainScreen').html(data.display_data);
    };

    function displayOnSideScreenR(data){
        //console.log(data);
        if('display_data' in data)
            $('#sideScreenR').append('<font color="'+(("colour"in data)? data.colour : colour)+'">'+data.display_data+'</font><br/>');
    };
    
    function displayOnSideScreenL(data){
        //console.log(data);
        var html_text="";
        if('player_info' in data)
            for (var each in data.player_info)
                html_text+="<font color="+data.player_info[each].colour+">"+each+" : "+data.player_info[each].score+"</font><br/>";
                
        $('#sideScreenL').html(html_text);
    };
    
    function clearAllLetters(){
        $('.letter').removeClass('warning');
        $('.letter').addClass('success');
    };

    function releaseTheLettersAndPass(){
        $('.letter').removeClass('disabled');
        $('.letter').addClass('enabled');
        $('#gamePassButton').removeClass('disabled');
        $('#gamePassButton').addClass('enabled');
    };
    
    function cageTheLettersAndPass(){
        $('.letter').removeClass('enabled');
        $('.letter').addClass('disabled');
        $('#gamePassButton').removeClass('enabled');
        $('#gamePassButton').addClass('disabled');
    };

    function disableAllRowsExcept(x,y){
        for(var i=0;i<gridSize;i++){
            for(var j=0;j<gridSize;j++){
                if(( choosenDirection > 0 && i==x && j>=firstGrid.j) || ( choosenDirection < 0 && i==x && j<=firstGrid.j))
                    continue;
                $("#"+i+'-'+j).removeClass('enabled');
                $("#"+i+'-'+j).addClass('disabled');
                //console.log("disable"+i+' '+j);
            }
        }
    };
    
    function disableAllColsExcept(x,y){
        for(var i=0;i<gridSize;i++){
            for(var j=0;j<gridSize;j++){
                if(( choosenDirection > 0 && i==y && j>=firstGrid.j) || ( choosenDirection < 0 && i==y && j<=firstGrid.j))
                    continue;                
                $("#"+j+'-'+i).removeClass('enabled');
                $("#"+j+'-'+i).addClass('disabled');
                //console.log("disable"+j+' '+j);
            }
        }
    };

    function getWord(){
        var word="";
        for(var i=0;i<wordSoFar.length;i++)
            word+=wordSoFar[i];
        return word;
    }

});
