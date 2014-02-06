var url = require('url'),
	request = require('request');

module.exports = HttpRequest;

	/**
	 * Start a server handling the HTTP JSON RPC requests
	 * @param {Number} port
	 * @param {String} host
	 */


function HttpRequest(incoming, options, addToEve) {
	
	options = options || {}; //TODO: add default config

	this.name = "http";

	// add a function to let an external server 
	addToEve("incomingFromExpress", function(req, res) {
		incoming("http:/" + req.url, req.body, function(reply) {
			res.writeHead(200, {'Content-Type': 'application/json'});
        	res.end(JSON.stringify(reply) );  
		});
	});


	// for outbound requests, the request module
	this.outgoing = function(destination, message, callback) {
		request({uri: destination, method: 'POST', json: message}, function(error, response, body) {
			//TODO: do we want to reply something when an error happened? Or just fail silently?
			callback(body); 
		});
	}

	// for inbound requests, count on some external server (eg express)
	
	//TODO: maybe add some notification that this service is up and running

}


