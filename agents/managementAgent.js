module.exports = ManagementAgent;

var log = require('npmlog');

// TODO: find out the best place for all stuff in the new scheme of things (eg serviceFunctions may go down to Eve)

function ManagementAgent(agents, services) = {

	// Lets first define the serviceFunctions object
	// Its a layer between the agents and the services, which should allow us to swap services in and out on the fly,
	// as well as preventing the agents from messing with the services
	var serviceFunctions = {owner:"management"};
	// this ^ is the prototype, all agents will receive their own descendant, with the owner field set to their name
	// TODO: perhaps add an indirection to make sure agents dont crash on calling non-existing service functions.. 
	var addServiceFunction = function(name, callback, origin) {

		// TODO: freeze the serviceFunctions object to make sure agents dont mess with it
		//       then to change the serviceFunctions object, just make a copy, make changes, freeze it
		//       and then update the prototype of all descendants (using a function on the prototype :-)
		// Actually, this ^ is said to be slow; maybe just swap out all serviceFunctions objects in the agents

		if (typeof serviceFunctions[name] !== 'undefined') {
			log.warn('Management', 'Tried to add a service function but name ' + name + ' is already in use; function not added.')
			return;
		}
		serviceFunctions[name] = {fn:callback, origin:origin};
	}

	//give a reference to this function (including a way to identify caller) to agents, so that services are decoupled
		// in fact, then we can also get rid of the whole servicefunctions object; just organize it in the same way as with the agents!!!
	var invokeServiceFunction = function(name, params) { //TODO handle params
		if (typeof serviceFunctions[name] == 'function') {
			serviceFunctions[name](params); // TODO fix this properly..
		} else {
			//TODO return some warning..
		}

	}

	//remove all service functions that originate from a specific service
	var removeServiceFunction = function(origin) {
		for (var i in serviceFunctions) {
			if (serviceFunctions[i].origin === origin) {
				delete serviceFunctions[i];
				log.info('Management', 'Removed service function ' + i);
			}
		}
	}

	var addService = function(Service, options, name) {
		if (typeof services[name] !== 'undefined') {
			log.warn('Management', 'Tried to add service but name ' + name + ' is already in use; service not added.')
			return;
		}

		services[name] = new Service(this, options, function(fnname, callback) {
			addServiceFunction(fnname, callback, name);
		});
		log.info("Management","Service added: " + name);
	}

	var removeService = function(name) {
		if (typeof services[name] === 'undefined') {
			log.warn('Management', 'Tried to remove non-existent service ' + name);
			return;
		}
		// remove any service functions it added
		removeServiceFunction(name);
		// remove the service itself
		delete services[name];
		log.info('Management', 'Removed service ' + name);
	}


	this.RPCfunctions = {};




	this.RPCfunctions.addAgent = function() {


	}





}


	// functions for loading agents, transports and other services

	/*
	 *	Service management functions
	 */

	//Starting services. This should be done synchronously I guess...
	this.loadServices = function(servicesObject) {
		for (var service in servicesObject) {
			var filename = "./services/" + service + ".js";  //NOTE: this is case-sensitive! 
			//TODO: maybe make it responsibility of user to give path and so on; unless we want to automatize service management...
			var Service = require(filename);
			this.addService(Service, servicesObject[service], service);	
		}	
	}	

	this.addService = function(Service, options, name) {
		//TODO check if we dont have a service with the same name already		
		services[name] = new Service(this, options, addServiceFunction);
		evedebug("Eve Core","Service loaded: " + name);
	}


	this.removeServices = function() {}; //TODO: make this possible on the fly without agents crashing and so on
	this.listServices  = function() {};




	/*
     *	Agent management functions
	 */

	// Starting agents
	// TODO complete proper checks and warnings.
	// TODO users themselves should determine where the agents are, instead of looking in a standard folder..
	this.loadAgents = function(agentsObject) { 
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

			if (typeof agentsObject[agent].number === "undefined") agentsObject[agent].number = 1;
			for (var instanceNumber = 0; instanceNumber < agentsObject[agent].number; instanceNumber++) { 

				if (agentsObject[agent].number == 1) { //TODO: see whether we actually want to keep this distinction
					var agentName = agent;
				} else {
					var agentName = agent + "/" + instanceNumber;
				}

				if (typeof agents[agentName] != "undefined") {
					evedebug("Eve Core","Error, agent name " + agentName + " is already in use; please choose another name.");
				}

				this.addAgent(AgentConstructor, agentName, filename, agentsObject[agent].options);
			}
			
		}
		
	};

	this.addAgent = function(Agent, name, filename, options) {
		var ownServiceFunctions = Object.create(serviceFunctions);
		ownServiceFunctions.owner = name; // to be able to identify originator of service function calls
		Object.freeze(ownServiceFunctions);
		
		agents[name] = new Agent(name, filename, options, ownServiceFunctions);				
		evedebug("Eve Core","Agent loaded: " + name);
	};

	this.removeAgents = function() {}; // TODO: implement this.. will be painful (due to scheduled events), consider switching to the webworker approach
	this.listAgents = function() {
		var agentNames = [];
		for (var key in agents) {
			agentNames.push(key);
		}
		return agentNames;
	};



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

