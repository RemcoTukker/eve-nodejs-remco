/*
TODO:

stuff to think about:
when agent is removed, what happens with already scheduled callbacks?
Is knowledge about using JSON RPC going to reside only with the agent or only with the server? Discuss with Ludo

functionality: 
Add a store capability to prevent unused agents from taking up resources with a db

Stability: 
introduce an onerror for uncaught exceptions (for integrity of files, etc), add typechecking everywhere it could go wrong
Add proper checks and warning everywhere, as well as try statements in appropriate places

style and maintainability:
prettier comments and function descriptions

related work:
eve frontend to use eve in an express server and couple UIs to agents
build browser-side agent environment

security (all optional):
protect server from agents (taking processor power, changing settings, doing all kind of stuff @ require(agent), ... ) (requires special agent implementation; see my threaded agent code)
see if we want to add some sort of authentication model (PGP?)

optimization:
move stuff down to c++ ? (Peet?)

*/



module.exports = Eve; 

// the default settings
var defaultOptions = {
	services : { topics: {}, p2p: {transports: {localTransport: {} } } }
};

// the object that will contain all the services cq agents
var services = {};
var agents = {};
// My opinion on differences between services and agents:
// Services should be able to touch the Eve internals, agents shouldnt. 
// Also, services are intended for use by agents within this server, while agents are intended to be contacted by anyone

// object to hold references to service functions that agents can use
var serviceFunctions = {owner: {name:"Eve Owner"}}; 
// this is the prototype, all agents will receive their own descendant, with the owner field set to their name
// only the holder of the eve object can access these functions on the prototype itself, hence "Eve Owner"
// TODO: perhaps add an indirection to make sure agents dont crash on calling non-existing service functions.. 
var addServiceFunction = function(name, callback) {

	// TODO: freeze the serviceFunctions object to make sure agents dont mess with it
	//       then to change the serviceFunctions object, just make a copy, make changes, freeze it
	//       and then update the prototype of all descendants (using a function on the prototype :-)

	// TODO: check if we dont overwrite anything
	serviceFunctions[name] = callback;
}


function Eve(options) {
	
	// to make sure that code doesnt fail if new is omitted
	if ( !(this instanceof Eve) ) return new Eve(options); 

	/*
	 *	Service management functions
	 */

	//Starting services. This should be done synchronously I guess...
	//TODO: add proper checks and warnings
	this.addServices = function(services) {
		for (var service in services) {
			var filename = "./services/" + service + ".js";  //NOTE: this is case-sensitive!
			var Service = require(filename);
			services[service] = new Service(this, options.services[service], addServiceFunction);
		}
	};

	this.removeServices = function() {};
	this.listServices  = function() {};

	/*
     *	Agent management functions
	 */

	// TODO: ok, do I _really_ want this? A constructor is nice and explicit, nothing will go wrong.. Maybe constructor at the core, then some extensions to tie in objects?
	//
	// agents can be described with a constructor and with an object
	// constructor: function(options, utilityFunctions); with an object you have the choice of object.create (default), deep copy, or using the object  
    // 
	// agents will have utility functions mixed in after construction: this.send, this.on, this.sub, this.pub, ...
    // then, the agent's init function will be called if it exists, with the options parameter


	// Starting agents
	// TODO complete proper checks and warnings.
	this.addAgents = function(agentsObject) { 
		// in case the user specifies only one agent, embed it in a superobject
		if ((typeof agentsObject.filename != "undefined") && (typeof agentsObject.filename.filename === "undefined")) {

			var name = agentsObject.filename;
			name = name.replace(/.js$/, ""); // remove .js at the end if its there
			var tmpAgents = agentsObject;
			
			agentsObject = {};
			agentsObject[name] = tmpAgents;
		}

		// loop over an object that has an agent for each entry		
		for (var agent in agentsObject) {
			var filename = './agents/' + agentsObject[agent].filename; // load code, NB case sensitive
			var AgentConstructor = require(filename); 

			if (typeof agentsObject[agent].number === "undefined") agentsObject[agent].number = 0;
			
			//check if we have a constructor or an object
			//if (agentCode instanceof Function) { // instantiate agent from constructor
			//} else {  //instantiate agent from object
			//}
			// ok, added the objects; now its time to mix in the utility functions


			// check if the user wants many instances of agents from one prototype
			//if (typeof agentsObject[agent].number != "undefined") {
				for (var instanceNumber = 0; instanceNumber < agentsObject[agent].number; instanceNumber++) { // make this 0-based or 1-based?

					var agentName = agent + "/" + instanceNumber;

					if (typeof agents[agentName] != "undefined") {
						console.log("Error, agent name " + agentName + " is already in use; please choose another name.");
					}

					var ownServiceFunctions = Object.create(serviceFunctions);
					ownServiceFunctions.owner = {name: agentName}; //TODO: freeze this 
					Object.freeze(ownServiceFunctions);
					Object.freeze(ownServiceFunctions.owner);

					agents[agentName] = new AgentConstructor(agentName, filename, agentsObject[agent].options, ownServiceFunctions);				
				}
			/*} else {  //TODO: do we really not want this and put a number after each agent? predictable, maybe, but on the other hand, crufty

				if (typeof agents[agent] != "undefined") {
					console.log("Error, agent name " + agent + " is already in use; please choose another name.");
				}

				var ownServiceFunctions = Object.create(serviceFunctions);
				ownServiceFunctions.owner = {name: agent}; //TODO: freeze this
				Object.freeze(ownServiceFunctions);
				Object.freeze(ownServiceFunctions.owner);

				agents[agent] = new AgentConstructor(agent, filename, agentsObject[agent].options, ownServiceFunctions);				
			}*/
		}
		
	};

	this.removeAgents = function() {}; 
	this.listAgents = function() {};

	/*
	 *	Other management functions 
	*/

	// to let the owner of the Eve object see how Eve is doing
	this.serverStatus = function() {};
	
	// to let the owner of the Eve object interfere with internal business
	this.useServiceFunction = function() { 	// 1st: name of function to call, rest: parameters for function to call
		var shift = [].shift;   			// borrowing shift from array object
		var name = shift.apply(arguments); 	// this removes the first element from the arguments
		serviceFunctions[name].apply(serviceFunctions, arguments); // call the function
	};
	
	/*
	 * 	Constructor / Init work
	 */

	// deal with parameters
	options = options || {};
	for (var option in defaultOptions) { if ( !(option in options) ) options[option] = defaultOptions[option]; }


	//TODO: ok, probably I'll do something like this to prevent people from using setTimeout
	//realSetTimeout = setTimeout;
	//setTimeout = function(f,t) {console.log(t)};
	//realSetTimeout(function() {console.log("ha")}, 1000);


	//creating a separate http server for the debug info
	var io = require('socket.io').listen(8090);
	
	var debugsockets = io.of('/debug').on('connection', function(socket) {

		var agentNames = [];
		for (var key in agents) {
			agentNames.push(key);
		}

		socket.emit('news', { agentNames: agentNames }); // emit list of agents names

//		socket.on('my other event', function (data) {
//			console.log(data);
//		});

	})

	this.sendDebugData = function(data) {
		debugsockets.emit('newData', {data: data});
	};


	// start optional services (Note: do this synchronously, in case order matters)	
	this.addServices(options.services);
	
	// start optional agents
	this.addAgents(options.agents);

}




