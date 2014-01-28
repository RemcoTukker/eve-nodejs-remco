/*
TODO:

stuff to think about:
when agent is removed, what happens with already scheduled callbacks?
Is knowledge about using JSON RPC going to reside only with the agent or only with the server? Discuss with Ludo
Should it be possible for an agent to behave differently depending on the transport layer used?

functionality: 
Add a store capability to prevent unused agents from taking up resources with a db

Stability: 
introduce an onerror for uncaught exceptions (for integrity of files, etc), add typechecking everywhere it could go wrong

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
protect server from agents (taking processor power, changing settings, doing all kind of stuff @ require(agent), ... ) (requires special agent implementation; see my threaded agent code)
see if we want to add some sort of authentication model (PGP?)

optimization:
move stuff down to c++ ? (Peet?)

*/


/**
 *
 * Initialization
 *
 */

// the event emitter that provides communication within this Eve environment
var EventEmitter2 = require('eventemitter2').EventEmitter2;

module.exports = Eve; //do we actually want to export all of Eve or just some interface?


// TODO: push topics into optional service and find some way to make agents use it
var topics = new EventEmitter2({
	//delimiter: '::',  		// the delimiter used to segment namespaces, defaults to `.`.
	newListener: true, 			// if you want to emit the newListener event set to true.
	maxListeners: 10000,		// max listeners that can be assigned to an event, default 10.
	wildcard: true 				// use+ wildcards.
});

// the default settings
var defaultOptions = {
	//services : { localTransport: {}, httpTransport: {port:1337, etc:0} }
	services : { localTransport: {} }
};

// My opinion on differences between services and agents:
// Services should be able to touch the Eve internals, agents shouldnt. 
// Also, services are intended for use by agents within this server, while agents are intended to be contacted by anyone


// the object that will contain all the services
var services = {};

// the array that will hold all the agents
// note that the entries in this array are only used for server business (listing agents, removing them, etc)
var agentArray = [];

var addresses = {};		// agent addresses are registered in here
var transports = {}; 	// transport services are registered in here

// TODO: a way to associate the agent in the agentarray with its registered addresses

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
	
		if (typeof addresses[address] == "undefined") {
			addresses[address] = callback;
		} else {
			// return error or something
		}
	};

	this.registerTransport = function(name, callback) {
		if (typeof transports[name] == "undefined") {
			transports[name] = callback;
		} else {
			//give warning or soemthing
		}
	};

	this.incomingMessage = function(to, message, callback) {
		var destination = addresses[to];
		if (typeof destination == "function") { //TODO make this check optional
			// TODO: possibly include a try and insert a tracking message between the actual callback and the forwarded callback
			//        also, keep track of callbacks to prevent memory leaks in case an agent holds on to callbacks (including their closure, the originating agent) forever
			destination(message, callback);
		} else {
			// TODO possibly give a warning
		}

	}

	this.outgoingMessage = function(to, message, callback) {
		var type = to.substr(0,to.indexOf(':'));
		var transport = transports[type];
		if (typeof transport == "function") {
			// TODO: possibly insert a try here and a tracking message, possibly keep track of callbacks (although we may count on transports not hogging callbacks)
			transport(to, message, callback);		
		} else {
			// TODO possibly give a warning
		}

	}


	// subscribe to a topic	
	this.subscribe = function(topic, callback) {
		topics.on(topic, callback);
	}

	//publish on a topic
	this.publish = function(topic, message) {
		if (typeof message != "object") {
			console.log("Publishing failed: tried to publish a non-object");
			return;
		}
		Object.freeze(message); //make sure the subscribers dont change the message, would turn out very messy
		topics.emit(topic, message);
	}


	// for integration with external server, eg express
	this.inbound = function(req, res, callback) {
		var params = {'json': req.body, 'uri':req.url};
		this.incomingMessage(params.uri, params.json, callback);
	};

	this.inboundFromExpress = function(req, res) {
		this.inbound(req, res, function(reply) {
			res.writeHead(200, {'Content-Type': 'application/json'});
        	res.end(value);  
		})
	}


	/*
	 *	Service management functions
	 */

	//Starting services. This should be done synchronously I guess...
	//TODO: add proper checks and warnings
	this.addServices = function(services) {
		for (var service in services) {
			var filename = "./services/" + service + ".js";  //NOTE: this is case-sensitive!
			var Service = require(filename);
			services[service] = new Service(this, options.services[service]);

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

	
	//TODO complete proper checks and warnings.
	//TODO actually use the name of the agent that the user specifies? Either that, or use an array of objects instead of a superobject
		// probably best to use name of agent; easier debugging (by giving an agent a specific name)
	this.addAgents = function(agents) { 
		// in case the user specifies only one agent, embed it in a superobject
		if ((typeof agents.filename != "undefined") && (typeof agents.filename.filename === "undefined")) {
			var tmpAgents = agents;
			agents = {};
			agents[tmpAgents.filename] = tmpAgents;
		}

		// loop over an object that has an agent for each entry		
		for (var agent in agents) {
			var filename = './agents/' + agents[agent].filename; // load code, NB case sensitive
			var AgentConstructor = require(filename); 
			// check if the user wants many instances of agents from one prototype
			if (typeof agents[agent].number != "undefined") {
				for (var instanceNumber = 0; instanceNumber < agents[agent].number; instanceNumber++) { // make this 0-based or 1-based?
					if (typeof agents[agent].options === "undefined") agents[agent].options = {};
					//agents[agent].options.instanceNumber = agents[agent].options.instanceNumber || instanceNumber;
					agents[agent].options.instanceNumber = instanceNumber; //NB instanceNumber is a special option!
					agentArray.push(new AgentConstructor(this.on, this.outgoingMessage, this.subscribe, this.publish, filename, agents[agent].options));
				}
			} else {
				agentArray.push(new AgentConstructor(this.on, this.outgoingMessage, this.subscribe, this.publish, filename, agents[agent].options));
			}
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

}




