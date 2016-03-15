var express = require('express');
var app = express();
var port = 3000;

app.get('/', function (req, res) {
  res.send('Hello World!');
});

var oauthRoutes = require('./Routes/oauthRoutes');
app.use('/oauth',oauthRoutes);

console.log('Server runnning on port '+port+' ....')
app.listen(port);
