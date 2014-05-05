/*
 * Copyright 2014 Remco Tukker
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// HTTP transport for Eve Nodejs
//
// TODO
// use external express server
// check if we should send the whole url to incoming or just the agent name (makes sense, why would incoming need that info?)
// handle a failed http request
// do something with "X-Eve-SenderUrl" ? 
// ...

var http = require('http'),
    url = require('url'),
	request = require('request'),
	log = require('npmlog');

'use strict';

module.exports = HttpTransport;

// options: 
// host: name of the server
// port: port of the server
// prefix: [optional] prefix to use in the url before the actual agent names, eg http://localhost:3000/prefix/agentname
// server: [optional] external (express) http server that will route incoming http requests for us

var defaultOptions = {
	//config.prefix: "agents",
	host: "localhost",
	port: "3000"
};

function HttpTransport(incoming, opts) {

	// handle the services config	
	var options = {};
	for(var i in opts){ options[i] = { value: opts[i], enumerable: true, writeable: true, configurable: true } };
	var config = Object.create(defaultOptions, options); 

	// make this service known to he user of the service
	this.name = "http";

	// see which address we are using
	var baseurl = "http://" + config.host + ":" + config.port + "/";
	if (typeof config.prefix !== 'undefined') baseurl = baseurl + config.prefix + "/";
	log.verbose('Transport', 'HTTP server baseurl: ' + baseurl);

	// first make sure that agents can do http requests:
	this.outgoing = function(destination, message, sender, callback) {
		request.post({uri: destination, headers: {'X-Eve-SenderUrl': baseurl + sender}, json: message},
			function(error, response, body) {
			//TODO: do we want to reply something when an error happened? Or just fail silently? Better to reply
			log.silly('Transport', 'Received HTTP response for ' + sender);
			callback(body); 
		});

		log.silly('Transport', 'Did HTTP request for ' + sender);
	}

	//this seems to help in the case of many simultaneous requests to localhost; dont know why though
	//http.globalAgent.maxSockets = 100;




	// now make sure that agents can receive requests

	// check if we have an external server
	if (typeof config.server === "undefined") {
		// if we dont have one, set up our own
		var serv = http.createServer(function (req, res) {
	        log.silly('Transport', 'Got a HTTP request');

	        var pathname = url.parse(req.url).pathname;
			
	        // if we are using a prefix, check it
	        if (typeof config.prefix !== 'undefined') {
	        	var prefix = pathname.split('/')[1];
	        	// reply with error if prefix is incorrect
	        	if (prefix < config.prefix || prefix > config.prefix) {
	        		res.writeHead(200, {'Content-Type': 'application/json'});
		            res.end(JSON.stringify({id:null, error:"Invalid prefix, to reach agents use " + baseurl + " /agentname"}));
		            log.verbose('Transport', 'Got a HTTP request with a wrong prefix');
	        	}
	        }

			//req.headers.host
			//req.headers['X-Eve-SenderUrl']
			// TODO do something with this info, eg pass on to agents? "X-Eve-SenderUrl"

			var data = "";
		    req.on("data", function(chunk) { data += chunk; });

		    req.on("end", function() {

				try {
					var parsedRPC = JSON.parse(data);
					log.silly('Transport', 'Got a HTTP request with RPC ' + data);

					// TODO see if we want to send the whole req.url including host, port and prefix, and not just the agent name
					incoming("http:/" + req.url, parsedRPC, function(reply) {
						res.writeHead(200, {'Content-Type': 'application/json'});
		            	res.end(JSON.stringify(reply));
						log.silly('Transport', 'Answered a HTTP request with ' + JSON.stringify(reply));
					});
	
				} catch(err) { //probably message couldnt be parsed
					res.writeHead(200, {'Content-Type': 'application/json'});
		            res.end(JSON.stringify({id:null, error:"Unkown error, are you sure you sent a valid JSON RPC? " + err}));
		            log.verbose('Transport', 'Got a HTTP request that couldnt be parsed: ' + JSON.stringify(err));
				}
		    });
    	});

		serv.listen(config.port, config.host);
		log.verbose('Transport', 'HTTP server started');
	} else {
		// if we do have an external server, use it (how exactly; assume that it is express?)

		//TODO use external express server
		log.verbose('Transport', 'External HTTP server used');

	}


	//some notification that this service is up and running
	log.info('Transport', 'HTTP transport is available now');
}


