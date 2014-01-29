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

	// Starting agents
	// TODO complete proper checks and warnings.
	// TODO get rid of instanceNumber!!
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
			// check if the user wants many instances of agents from one prototype
			if (typeof agentsObject[agent].number != "undefined") {
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
			} else { 

				if (typeof agents[agent] != "undefined") {
					console.log("Error, agent name " + agent + " is already in use; please choose another name.");
				}

				var ownServiceFunctions = Object.create(serviceFunctions);
				ownServiceFunctions.owner = {name: agent}; //TODO: freeze this
				Object.freeze(ownServiceFunctions);
				Object.freeze(ownServiceFunctions.owner);

				agents[agent] = new AgentConstructor(agent, filename, agentsObject[agent].options, ownServiceFunctions);				
			}
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



//TODO: make this work again in some way
/*
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

}




