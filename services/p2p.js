
module.exports = P2P;

var addresses = {};		// agent addresses are registered in here
var transports = {}; 	// transport services are registered in here

// interface to transports

function incomingMessage(destination, message, callback) {

	var to = addresses[destination];

	if (typeof to != "undefined") { 
		// TODO: possibly include a try and insert a tracking message between the actual callback and the forwarded callback
		//        also, keep track of callbacks to prevent memory leaks in case an agent holds on to callbacks (including their closure, the originating agent) forever
		to.pointer(message, callback); // we assume that the object at addresses[destination] has a pointer field of type function; TODO ensure at registering callback
	} else {
		console.log("drain " + destination); 
		// TODO possibly give a warning

		//TODO: make sure that the transport can actually send something back (now http server just keeps hanging on, only times out after 2 minutes)
		// 				probably easiest to give a return value, true or false or something, and use that to do the right thing
	}

}


function P2P(eve, options, addServiceFunction) {

	options = options || {}; //TODO: add some default config with local transport
	
	// interface to agents

	addServiceFunction('send', function(destination, message, callback) {
		var type = destination.substr(0, destination.indexOf(':'));
		//console.log(type);		
		var transport = transports[type];
		if (typeof transport != "undefined") {
			// TODO: possibly insert a try here and a tracking message, possibly keep track of callbacks (although we may count on transports not hogging callbacks)
			transport.outgoing(destination, message, callback);	// we assume that the transport has a function "outgoing"; TODO ensure at loading
		} else {
			// TODO possibly give a warning
		}

	});

	addServiceFunction('on', function(type, name, callback) {
		var address = type + "://" + name;
		if (typeof addresses[address] == "undefined") {
			addresses[address] = {pointer: callback, owner: this.owner.name};
			console.log("registered " + address + " for " + this.owner.name);
		} else {
			// return error or something
		}
	});

	// management functions for eve users
	// TODO: move this function to http requests where it belongs, and also remove optional prefix from req.url
	eve.incomingFromExpress = function(req, res) {
		incomingMessage("http:/" + req.url, req.body, function(reply) {
			res.writeHead(200, {'Content-Type': 'application/json'});
        	res.end(JSON.stringify(reply) );  
		});
	}

	// TODO: management functions for dynamically adding and removing transports, as well as shutting down this service


	// add the transports from options
	var desiredTransports = options.transports;
	for (var transport in desiredTransports) {
		var filename = "./" + transport + ".js";  //NOTE: this is case-sensitive!
		var Transport = require(filename);
		var transportObject = new Transport(incomingMessage, desiredTransports[transport]);
		transports[transportObject.name] = transportObject;
	}

}
