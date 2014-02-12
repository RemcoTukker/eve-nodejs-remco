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


// TODO merge this into httpTransport, using an external server thats given in the options

var url = require('url'),
	request = require('request');

'use strict';

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
	this.outgoing = function(destination, message, sender, callback) {
		request({uri: destination, method: 'POST', json: message}, function(error, response, body) {
			//TODO: do we want to reply something when an error happened? Or just fail silently?
			callback(body); 
		});
	}

	// for inbound requests, count on some external server (eg express)
	
	//TODO: maybe add some notification that this service is up and running

}


