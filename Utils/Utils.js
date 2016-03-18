var extractor = require('unfluff');

function convertGooglePlusResponseToDesiredFormat(obj){
    var convertedData = {};
    convertedData['title'] = '';
    convertedData['skills'] = '';
    convertedData['displayName'] = '';
    convertedData['description'] = '';
    convertedData['organizations'] = '';

    //Here we convert google+ plus data into a central format
    if(obj['occupation'] !== undefined){
        convertedData['title'] = addwithIndentation(convertedData['title'],obj['occupation']);
        convertedData['skills'] = addwithIndentation(convertedData['skills'],obj['occupation']);
    }
    
    if(obj['skills'] !== undefined){
        convertedData['skills'] = addwithIndentation(convertedData['skills'],obj['skills']);
    }

    if(obj['displayName'] !== undefined){
        convertedData['displayName'] = obj['displayName'];
    }

    if(obj['aboutMe'] !== undefined){
        //obj['aboutMe'] = extractor(obj['aboutMe']).text;

        convertedData['description'] = obj['aboutMe'];
    }
    
    if(obj['organizations'] !== undefined){
        var organizations = obj['organizations'];
        for(var i in organizations){
            var title = (organizations[i]['title'] !== undefined) ? organizations[i]['title']:'';
            var name = (organizations[i]['name'] !== undefined) ? organizations[i]['name']:''
            var type = (organizations[i]['type'] !== undefined) ? organizations[i]['type']:'';
            if(type === "work"){
                convertedData['title'] = addwithIndentation(convertedData['title'],title);
                convertedData['skills'] = addwithIndentation(convertedData['skills'],title);
            }

            if(type === "school"){
                convertedData['skills'] = addwithIndentation(convertedData['skills'],title);
            }

            convertedData['organizations'] = addwithIndentation(convertedData['organizations'],name);
        }
    }

    return convertedData;
}

function addwithIndentation(obj,addition){
    return obj+' '+addition;
}

var obj = {};
obj['convertGooglePlusResponseToDesiredFormat'] = convertGooglePlusResponseToDesiredFormat;

module.exports = obj;
