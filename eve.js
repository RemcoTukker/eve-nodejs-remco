/*
TODO:

stuff to think about:
when agent is removed, what happens with already scheduled callbacks?
Is knowledge about using JSON RPC going to reside only with the agent or only with the server? Discuss with Ludo
Should it be possible for an agent to behave differently depending on the transport layer used?

functionality: make everything work again

Stability: introduce an onerror for uncaught exceptions (for integrity of files, etc), add typechecking everywhere it could go wrong

style and maintainability:
prettier comments and function descriptions
let somebody look at this code that knows JS better...
add a layer of abstraction to the services to make it easier to write a service (just like agents)

related work:
eve frontend to use eve in an express server and couple UIs to agents (think about security here at some point)
 (server frontend should be a service I guess, agent UIs should be external to Eve)
build browser-side agent environment

security (all optional):
protect agents from each other (eavesdropping) (quite easy, as we have events for each new listener)
protect agents from server (man in the middle) (requires encryption I guess; PGP?)
protect server from agents (taking processor power, changing settings, doing all kind of stuff @ require(agent), ... ) (requires special agent implementation; see my threaded agent code)
see if we want to add some sort of authentication model (PGP?)

optimization:
move stuff down to c++ ? (Peet?)
improve data store, perhaps a db?

*/



/**
 *
 * Initialization
 *
 */

// the event emitter that provides communication within this Eve environment
var EventEmitter2 = require('eventemitter2').EventEmitter2;

module.exports = Eve;


var messages = new EventEmitter2({
	//delimiter: '::',  		// the delimiter used to segment namespaces, defaults to `.`.
	newListener: true, 			// if you want to emit the newListener event set to true.
	maxListeners: 1, 			//max listeners that can be assigned to an event, default 10.
	wildcard: false 			// use+ wildcards.
});

var topics = new EventEmitter2({
	//delimiter: '::',  		// the delimiter used to segment namespaces, defaults to `.`.
	newListener: true, 			// if you want to emit the newListener event set to true.
	maxListeners: 100, 			//max listeners that can be assigned to an event, default 10.
	wildcard: true 				// use+ wildcards.
});
//hrm, actually, these 'topics' may be a bit dangerous as the event may be changed by one of the listeners? (or not?) 
//Do we even want to include them or just build them on top of the normal messages and take the performance hit (should be relatively small)?

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
// note that the entries in this array are not used for communication, only for server business (listing agents, removing them, etc)
var agentArray = [];

function Eve(options) {
	
	// to make sure that code doesnt fail if new is omitted
	if ( !(this instanceof Eve) ) return new Eve(options); 

	// deal with parameters
	options = options || {};
	for (var option in defaultOptions) { if ( !(option in options) ) options[option] = defaultOptions[option]; }

	// start optional services	TODO: add proper checks and warnings
	this.services = {};
	for (var service in options.services) {
		var filename = "./services/" + service + ".js";  //NOTE: this is case-sensitive!
		var Service = require(filename);
		services[service] = new Service(messages, topics, options.services[service]);

		//alternative without constructors:
		//this.services[service] = require(filename);
		//this.services[service].start(options.services[service]);  
		
	}	

	//services that we should have available: undeliveredwarnings, httpserver, addressbook?
		//remotemanagementagent (hrm this is not a service actually), webgui / express server (instead of http server?)

	/*
	 *	Local management functions 
	*/

	this.addServices = function() {};
	this.removeServices = function() {};
	this.listServices  = function() {};
	
	this.addAgents = function(agents) { //TODO add proper checks and warnings. Maybe make it possible to add 1 agent without embedding it in a superobject
		for (var agent in agents) {
			
			// in case addresses were supplied in the options by the user, try to claim these. If successfull, pass them to new agent in agent.options, if unsuccessful, give error.
			// Dont let the server try to supply addresses to the agent, its none of the servers business		
			// what we should let the agent know however, is how the eventemitter works exactly, and what prefixes should be used and so on, as that is none of the agents business..
			// maybe add a special function to the event emitter to make that easy

			// load code
			var filename = './agents/' + agents[agent].filename + '.js';
			var AgentConstructor = require(filename); 
						
			agentArray.push(new AgentConstructor(messages, topics, agents[agent].options));

		}
	};

	this.removeAgents = function() {

	};

	this.listAgents = function() {

	};

	this.serverStatus = function() {

	};

	// this may be implemented as a topic
	this.notifyAll = function() {

	};
	
	/* Do we want to supply a centralized function for this to claim addresses over mutliple services or leave it up to the agents themselves? (eg http and zeromq)
				(for security, use setMaxListeners = 1 (?))
	this.claimAddresses {

	}

	*/

	/* should the following actually be implemented? perhaps as an extra service in combination with storing the agent in a db?

	this.pause = function() {

	};

	this.resume = function() {

	};

	*/

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

	//convenience function for sending a message
	this.sendMessage = function() {

	};

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

/**
 * old nodejs exports
 
exports.listen = eve.listen;
exports.management = eve.agentList["/agents/management"];
exports.handleRequest = eve.incomingRequest;
*/


