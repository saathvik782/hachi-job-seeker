var express = require('express');
var app = express();
var port = 3000;

var env = process.env.NODE_ENV || 'default';

var path = require('path');
// configure express app
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.render('partials/index',{
        js: 'index.js'
    });
});

// configure routes
var oauthRoutes = require('./Routes/oauthRoutes');
app.use('/oauth',oauthRoutes);

var requestRoutes = require('./Requests/requestRoutes')
app.use('/requests',requestRoutes);

console.log('Server runnning on port '+port+' ....')

app.listen(port);

module.exports = app;
