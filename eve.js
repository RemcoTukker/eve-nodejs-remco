/*
TODO:

stuff to think about:
when agent is removed, what happens with already scheduled callbacks?
Is knowledge about using JSON RPC going to reside only with the agent or only with the server? Discuss with Ludo
Should it be possible for an agent to behave differently depending on the transport layer used?

functionality: 
Add a store capability to prevent unused agents from taking up resources

Stability: 
introduce an onerror for uncaught exceptions (for integrity of files, etc), add typechecking everywhere it could go wrong

style and maintainability:
prettier comments and function descriptions
let somebody look at this code that knows JS better...
add a layer of abstraction to the services to make it easier to write a service (just like agents)
do we actually want the whole eventemitter business now that i dont use the wildcards anymore?

related work:
eve frontend to use eve in an express server and couple UIs to agents (think about security here at some point)
 (server frontend should be a service I guess, agent UIs should be external to Eve)
build browser-side agent environment

security (all optional):
protect agents from each other (eavesdropping) (quite easy, as we have events for each new listener)
protect server from agents (taking processor power, changing settings, doing all kind of stuff @ require(agent), ... ) (requires special agent implementation; see my threaded agent code)
see if we want to add some sort of authentication model (PGP?)

protect agents from server (man in the middle) (requires encryption I guess; PGP?)
  => actually, not necessary, as running the software there opens up everything (software can be changed at will)
     if you dont trust the (or any) server, just run your own server, and no problem.


optimization:
move stuff down to c++ ? (Peet?)
improve data store, perhaps a db?

*/



/*
	TODO: 
		* See if we want to move the callbacks for requests down to the agent implementation or not
		* 

*/

/**
 *
 * Initialization
 *
 */

// the event emitter that provides communication within this Eve environment
var EventEmitter2 = require('eventemitter2').EventEmitter2;

module.exports = Eve; //do we actually want to export all of Eve or just some interface?


var messages = new EventEmitter2({
	//delimiter: '::',  		// the delimiter used to segment namespaces, defaults to `.`.
	newListener: true, 			// if you want to emit the newListener event set to true.
	maxListeners: 1000, 			//max listeners that can be assigned to an event, default 10.
	wildcard: false 			// use+ wildcards.
});

/* do we need topics at all?
var topics = new EventEmitter2({
	//delimiter: '::',  		// the delimiter used to segment namespaces, defaults to `.`.
	newListener: true, 			// if you want to emit the newListener event set to true.
	maxListeners: 100, 			//max listeners that can be assigned to an event, default 10.
	wildcard: true 				// use+ wildcards.
});
//hrm, actually, these 'topics' may be a bit dangerous as the event may be changed by one of the listeners? (or not?) 
//Do we even want to include them or just build them on top of the normal messages and take the performance hit (should be relatively small)?
*/

// the default settings
var defaultOptions = {
	services : { httpServer: {port:1337, etc:0} }
};

// differences between services and agents:
// Services should be able to touch the Eve internals, agents shouldnt. 
// Also, services are intended for use by agents within this server, while agents are intended to be contacted by anyone


// the object that will contain all the services
var services = {};

// the array that will hold all the agents
// note that the entries in this array are only used for server business (listing agents, removing them, etc)
var agentArray = [];

function Eve(options) {
	
	// to make sure that code doesnt fail if new is omitted
	if ( !(this instanceof Eve) ) return new Eve(options); 

	/*
	 *	Communication functions
	 */

	// registering for incoming messages	
	//TODO: allow for multiple types/names to be registered at once
	this.on = function(type, name, callback) {
		var address = type + "://" + name; 
		//if (messages.listeners(address).length > 0) return false; //hrm do this better (?), keep a list of addresses (?)
		messages.on(address, callback);
	};

	//sending a message
	this.sendMessage = function(to, RPC, callback) {
		var type = to.substr(0,to.indexOf(':'));
		messages.emit(type, to, RPC, callback); //callback may be function or address (?)
	};
	
	/*
	 *	Service management functions
	 */

	//Starting services. This should be done synchronously I guess...
	//TODO: add proper checks and warnings
	this.addServices = function(services) {
		for (var service in services) {
			var filename = "./services/" + service + ".js";  //NOTE: this is case-sensitive!
			var Service = require(filename);
			services[service] = new Service(messages, this, options.services[service]);

			//alternative without constructors:
			//this.services[service] = require(filename);
			//this.services[service].start(options.services[service]);  
		}
	};

	this.removeServices = function() {};
	this.listServices  = function() {};

	/*
     *	Agent management functions
	 */

	//TODO add proper checks and warnings. Maybe make it possible to add 1 agent without embedding it in a superobject
	this.addAgents = function(agents) { 
		for (var agent in agents) {
			var filename = './agents/' + agents[agent].filename + '.js'; // load code, case sensitive
			var AgentConstructor = require(filename); 
			agentArray.push(new AgentConstructor(this.on, this.sendMessage, filename, agents[agent].options));
		}
	};

	this.removeAgents = function() {}; 
	this.listAgents = function() {};

	/*
	 *	Other management functions 
	*/

	this.serverStatus = function() {};
	this.notifyAll = function() {}; 	// this may be implemented as a topic.. mwah, perhaps just a specific function in each agent
	
	/* should the following actually be implemented? perhaps as an extra service in combination with storing the agent in a db?
	this.pause = function() {};
	this.resume = function() {};
	*/

	/*
	 * 	Constructor / Init work
	 */

	// deal with parameters
	options = options || {};
	for (var option in defaultOptions) { if ( !(option in options) ) options[option] = defaultOptions[option]; }

	// start optional services (Note: do this synchronously, in case order matters)	
	this.addServices(options.services);
	
	// start optional agents
	this.addAgents(options.agents);


	
	//services that we should have available: undeliveredwarnings, addressbook?
		//remotemanagementagent (hrm this is not a service actually), webgui / express server (instead of http server?)


	/* this is one of the ways we could do express integration (and I think the best way). Export this function (even better would be to export it from a "plugin"!)
	
	this.incomingFromExpress = function(req, res) {
		var params = {'json': req.body, 'uri':req.url};
		
	}

	//old
	//to handle requests that are coming in from outside (this is what you'ld call from express)
	eve.incomingRequest = function(req, res) {  //req.body should contain the parsed JSON RPC message, req.url the uri as used in the agentname, eg, /agents/agenttype/nr

	var params = {'json': JSON.stringify(req.body), 'uri':req.url};
	eve.requestRelayPromise(params)
	.then( function(value) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(value);  
	}, function(err) {  //assemble the error message based on rejected promise and request
		res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({id:req.body.id, result:null, error:err}));
		//TODO perhaps send an additional warning in case 'id' is undefined
	}).done();

	}

	
	*/

	

}




/*
var eve = {};  // initialize namespace 

var http = require('http'),
    url = require('url'),
	request = require('request'),
	Q = require('q'),
	storage = require('node-persist'), 
	Threads = require('webworker-threads'); //webworker threads is better than TAGG ´cause this one lets you do importScripts

var eve = {};  // initialize namespace 
eve.location = {href: undefined, host: undefined, port: undefined} //will contain server location like "http://host:port"
eve.agentList = {}; //this object will hold all agents
*/

/**
 *
 * functions for handling incoming RPC messages 
 *
 */

// route a request to the right location
/*
eve.requestRelayPromise = function (params) { 

	if (params.uri in eve.agentList) {
		return eve.agentList[params.uri].requestDeliveryPromise(params.json);
	} else {
		return Q.reject("Agent " + params.uri + " does not exist here at " + eve.location.href + "!");
	}

}
*/


