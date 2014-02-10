
module.exports = P2P;



var addresses = {};		// agent addresses are registered in here
var transports = {}; 	// transport services are registered in here



function P2P(eve, options, addServiceFunction) {

	options = options || {}; //TODO: add some default config with local transport
	
	// interface to transports
	this.incomingMessage = function(destination, message, callback, origin) {

		var to = addresses[destination];

		if (typeof to != "undefined") { 
			// TODO: possibly include a try and insert a tracking message between the actual callback and the forwarded callback
			//        also, keep track of callbacks to prevent memory leaks in case an agent holds on to callbacks (including their closure, the originating agent) forever
			to.pointer(message, function(reply) {
				eve.sendDebugData({type:'reply', from:destination, to:origin}); // reversed as this is the reply
				callback(reply);
			}); 
			eve.sendDebugData({type:'request', from:origin, to:destination}); 
			//TODO: make sure that we dont get debug info double, by checking somewhere whether a message is local or not

	// we assume that the object at addresses[destination] has a pointer field of type function; TODO ensure at registering callback
		} else {
			console.log("drain " + destination); 
			// TODO possibly give a warning

			//TODO: make sure that the transport can actually send something back (now http server just keeps hanging on, only times out after 2 minutes)
			// 				probably easiest to give a return value, true or false or something, and use that to do the right thing
		}

	}

	// interface to agents

	addServiceFunction('send', function(destination, message, callback) {
		var type = destination.substr(0, destination.indexOf(':'));
		//console.log(type);		
		var transport = transports[type];
		var sender = this.owner.name;
		if (typeof transport != "undefined") {
			// TODO: possibly insert a try here and a tracking message, possibly keep track of callbacks (although we may count on transports not hogging callbacks)
			transport.outgoing(destination, message, function(reply) {
				eve.sendDebugData({type:'reply', from:destination, to:sender}); // reversed as this is the reply
				callback(reply);
			});	
			// we assume that the transport has a function "outgoing"; TODO ensure at loading
			eve.sendDebugData({type:'request', from:sender, to:destination}); 

		} else {
			// TODO possibly give a warning
		}

	});

	addServiceFunction('on', function(type, name, callback) {
		var address = type + "://" + name;                     //TODO perhaps insert the external url here in case of http (and zeromq?)
		if (typeof addresses[address] == "undefined") {
			addresses[address] = {pointer: callback, owner: this.owner.name};
			console.log("registered " + address + " for " + this.owner.name);
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
	}

	
}
