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

/*
TODO
Perhaps tie addresses to agentNames; Eve doesnt really need flexible addresses
Perhaps automatically assign addresses to all existing agents for all existing transports; its the Eve way
Then ideally also make it possible to remove transports on the fly
*/

'use strict';

module.exports = EveP2P;

var addresses = {};		// agent addresses are registered in here
var transports = {}; 	// transport services are registered in here

function EveP2P(eve, options, addServiceFunction) {

	options = options || {}; //TODO: add some default config with local transport
	
	// interface to transports to forward incoming message to right place
	this.incomingMessage = function(destination, message, callback, origin) {

		var to = addresses[destination];

		if (typeof to != "undefined") { 
			// TODO: possibly include a try and insert a tracking message between the actual callback and the forwarded callback
			to.pointer(message, function(reply) {
				evedebug("Eve P2P", {type:'reply', from:destination, to:origin}); // reversed as this is the reply
				callback(reply);
			}); 
			evedebug("Eve P2P", {type:'request', from:origin, to:destination}); 

			//TODO: make sure that we dont get debug info double, by checking somewhere whether a message is local or not
			//TODO ensure at registering callback that object at addresses[destination] has a "pointer" property of type function

		} else {
			evedebug("Eve P2P", "Incoming message to nonexisting address: " + destination + " from: " + origin); 
			// TODO: maybe sent something back / have return value, to prevent http server from hanging on 2 minutes
			//
		}

	}

	// interface to agents for subscribing to an address and sending messages
	addServiceFunction('send', function(destination, message, callback) {
		var type = destination.substr(0, destination.indexOf(':'));
		var transport = transports[type];
		var sender = this.owner.name;
		if (typeof transport != "undefined") {
			transport.outgoing(destination, message, sender, function(reply) {
				evedebug("Eve P2P", {type:'reply', from:destination, to:sender}); // reversed as this is the reply
				callback(reply);
			});	
			evedebug("Eve P2P", {type:'request', from:sender, to:destination}); 

			// TODO ensure at loading that transport provides function "outgoing"
		} else {
			evedebug("Eve P2P", "Agent " + this.owner.name + " tried to use non-existing transport." );
		}

	});

	addServiceFunction('on', function(type, name, callback) {
		var address = type + "://" + name;    //TODO perhaps insert the external url here in case of http (and zeromq?)
		if (typeof addresses[address] == "undefined") {
			addresses[address] = {pointer: callback, owner: this.owner.name};
			evedebug("Eve P2P", "registered " + address + " for " + this.owner.name);
		} else {
			// return error or something
		}
	});

	// management functions for eve users
	
	var addFunctionToEve = function(name, fn) {
		eve[name] = fn; //TODO: add check that we're not overwriting stuff
			//TODO: then move this whole function and the check down to Eve itself, _maybe_ then we dont have to give the whole eve object to the services
	};

	// TODO: management functions for dynamically adding and removing transports, as well as shutting down this service
	

	// add the transports from options
	var desiredTransports = options.transports;
	for (var transport in desiredTransports) {
		var filename = "./" + transport + ".js";  //NOTE: this is case-sensitive!
		var Transport = require(filename);
		var transportObject = new Transport(this.incomingMessage, desiredTransports[transport], addFunctionToEve);
		transports[transportObject.name] = transportObject;
		evedebug("Eve P2P", "New transport loaded: " + transportObject.name);
	}

	
}
