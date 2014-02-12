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

var http = require('http'),
    url = require('url'),
	request = require('request');

'use strict';

module.exports = HttpTransport;

	/**
	 * Start a server handling the HTTP JSON RPC requests
	 * @param {Number} port
	 * @param {String} host
	 */


function HttpTransport(incoming, options) {
	
	options = options || {}; //TODO: add default config

	var baseurl = "http://"+ options.host + ":" + options.port + "/agents/";

	this.name = "http";

	// for outbound requests, the request module
	this.outgoing = function(destination, message, sender, callback) {
		request.post({uri: destination, headers: {'X-Eve-SenderUrl': baseurl + sender}, json: message},
			function(error, response, body) {
			//TODO: do we want to reply something when an error happened? Or just fail silently? Better to reply
			callback(body); 
		});

		//request({uri: destination, method: 'POST', json: message}, function(error, response, body) {
		//	//TODO: do we want to reply something when an error happened? Or just fail silently? Better to reply
		//	callback(body); 
		//});
	}

	http.globalAgent.maxSockets = 100; // this is good for doing many requests to localhost..

	// for inbound requests, a http server
    var serv = http.createServer(function (req, res) {
        var pathname = url.parse(req.url).pathname;
		var prefix = pathname.split('/')[1];

		//if (prefix == 'agents') { //agent request, route to agents 

		// TODO see if we want to use such a prefix or not / make it optional

		// TODO read "X-Eve-SenderUrl"

			var data = "";
		    req.on("data", function(chunk) { data += chunk; });

		    req.on("end", function() {

				try {
					var parsedRPC = JSON.parse(data);
					var eventName = "http." + pathname;

					incoming("http:/" + req.url, parsedRPC, function(reply) {
						res.writeHead(200, {'Content-Type': 'application/json'});
		            	res.end(JSON.stringify(reply));
					});
	
				} catch(err) { //probably message couldnt be parsed
					res.writeHead(200, {'Content-Type': 'application/json'});
		            res.end(JSON.stringify({id:null, result:null, error:"Unkown error, are you sure you sent a valid JSON RPC? " + err}));
				}
		    });

		//} else {  //try to route the request to one of our webpages
		//	var now = new Date();
  		//	var html = "<p>Hello World, in case you want more functionality on webpages, simply embed eve in an express server.</p>"; 
 		//	res.end(html);
		//}
    });

	serv.listen(options.port, options.host);



	//TODO: maybe add some notification that this service is up and running

}


