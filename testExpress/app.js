
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
//var user = require('./routes/user');
var http = require('http');
var path = require('path');

var Eve = require('../eve.js');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
// app.use(express.bodyParser()); //dont really seem to need this?
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// 
var eveOptions = {
	services: { topics: {}, p2p: {transports: {localTransport: {}, httpRequest: {} } } }, // httpRequest 
	agents: {filename: "mathAgent.js" }
} 
var eve = new Eve(eveOptions);



// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/management', routes.management);
//app.get('/users', user.list);
app.post('/agents/*', eve.incomingFromExpress);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
