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
TODO:

topic agent instead of in-server transport
start describing the API and think about clear names for everything
authentication!

introduce an onerror for uncaught exceptions (for integrity of files, etc), add typechecking everywhere it could go wrong
Add proper checks and warning everywhere, as well as try statements in appropriate places
prettier comments and function descriptions


Add ZeroMQ transport (as soon as their "resources" concept is introduced, allowing multiple connections per address)
Add WebRTC transport (as soon as there is a WebRTC client for Nodejs)

As soon as ecmascript 6 is supported:
 use proxies to clean up some parts of the code 
 maybe use arrow functions to make some stuff cleaner


Related work:
eve frontend to use eve in an express server and couple UIs to agents

Stuff for version x:
Add a store capability to prevent unused agents from taking up resources with a db
In the same way, allow agent migration and build browser-side agent environment
Maybe Use webworkers to protect server from agents and properly deal with setTimeout, pending callbacks, etc 
   (use browserify to deal with requires) also add agent factory types to give people a choice (?)
See if we want to add some sort of authentication model (PGP?)

*/

	// [move to documentation] My opinion on differences between services and agents: 
	//  - Services should be able to touch the Eve internals, agents shouldnt. 
	//  - Services are intended for use by agents within this server, while agents are intended to be contacted by anyone


'use strict';

module.exports = Eve; 

// for backing up agents and that sort of things
//var fs = require('fs');

// logging that is used throughout eve; has levels (silly,) verbose, info, http, warn, err (, silent)
var log = require('npmlog');  
log.level = 'info';

// the default settings
var defaultOptions = {
	services : {transports: {localTransport: {} } }
};

	
function Eve(opts) {
	
	// to make sure that code doesnt fail if new is omitted
	if ( !(this instanceof Eve) ) return new Eve(opts); 

	// the objects that are managed by Eve
	var services = {}; 					// will contain all the service
	var agents = {}; 					// will contain all the agents


	///////////////////////////////////////
	//  Two functions to give the agents access to the services
	//

	// function that creates the object with servicefunctions that is mixed in with the agents
	var ServiceFunctions = function(name) {
		var serviceFunctions = {};

		for (service in services) {
			for (func in services[service].functions) {
				serviceFunctions[func] = services[service].functions[func]; 
			}
		}
		
		// add an owner to let the services find out who called. Agent can change it, pretending to be somebody else,
		//   but its not necessary that this is really safe (?)
		serviceFunctions.owner = name;

		return serviceFunctions;
	}

	// function to give all the agents a new servicefunctions object (stored in myAgent.eve)
	var updateServiceFunctions() {
		for (agent in agents) {
			agents[agent].eve = ServiceFunctions(agent);
		}
	}


	////////////////////////////////////////////////////////////////////////////////////////
	// the function for delivering a message to an agent / doing the RPC
	//

	var deliver = function(destination, origin, msg, callback) {
		if (typeof agents[destination] === 'undefined') {
			log.info("Eve Delivery","Incoming message for non-existent agent " + destination + "; will send error reply");
			log.verbose("Eve Delivery","from: " + origin + " to: " + destination + " " + msg);
			callback(error:{code:-32010, message:"agent " + destination + " not found"} });
			return;
		}	
/*
		if (agents[destination] === null) {
			unfreezeAgent(destination);
			log.info("Eve Delivery","Unfrozen agent " + destination + " for message delivery");
		}
*/
		var func = agents[destination][msg.method];
		if (typeof func !== 'function') {
			log.info("Eve Delivery","Incoming message for non-existent method " + msg.method + "; will send error reply");
			log.verbose("Eve Delivery","from: " + origin + " to: " + destination + " " + msg);
			callback(error:{code:-32601, message:"agent " + destination + " doesnt have method " + msg.method + " available for you"} });
			return;
		}

		var access = func.access;
		if (typeof access === 'undefined') {
			log.info("Eve Delivery","Incoming message for non-accessible method " + msg.method + "; will send error reply");
			log.verbose("Eve Delivery","from: " + origin + " to: " + destination + " " + msg);
			callback(error:{code:-32601, message:"agent " + destination + " doesnt have method " + msg.method + " available for you"} });
			return;
		}

		if (access !== 'all' && ! origin in access) {
			log.info("Eve Delivery","Incoming message for method " + msg.method + " but no access for originator; will send error reply");
			log.verbose("Eve Delivery","from: " + origin + " to: " + destination + " " + msg);
			callback(error:{code:-32601, message:"agent " + destination + " doesnt have method " + msg.method + " available for you"} });
			return;
		}		

		// everything should be in order now; call the function
		try {
			func(msg.params, callback, origin); // hand over the callback to the function
		} catch (e) {
			log.info("Eve Delivery","RPC failed: method " + msg.method + " of " + destination + " crashed; will try to send error reply");
			log.verbose("Eve Delivery", e);
			// maybe the func managed to do the callback before the error; so try to send the error data carefully			
			try { 
				callback(error:{code:-32020, message:"method didnt execute properly", data:e} });
			} catch (e2) {
				log.info("Eve Delivery","Failed to send error reply; function probably sent a reply already");
				log.verbose("Eve Delivery",e2);
			}
		}
	}

	// TODO to be mixed in by transport in callback: {id:(typeof msg.id === 'undefined') ? null : msg.id, jsonrpc:'2.0'}


	/////////////////////////////////////////////////////////////////////////////////////////////////
	// some management functions, creating and destroying agents
	//	
/*
	// backing up: we have an agent in memory and we store it in a file. Later it can be restored from this file
	var backupAgent = function(name) {
		if (typeof agents[name] === 'undefined') {
			log.info("Eve Agents", "Tried to backup agent " + name + ", but it doesnt exist");
			return;
		}
		if (agents[name] === null) {
			log.info("Eve Agents", "Tried to backup agent " + name + ", but it is already frozen");
			return;
		}

		// if a backup exists already, rename it
		if (fs.existsSync('./agents/' + name)) {
			var nr = 0;
			while (fs.existsSync('./agents/' + name + '.old.' + nr) {
				nr++;
			}
			fs.renameSync('./agents/' + name, './agents/' + name + '.old.' + nr);
			log.verbose("Eve Agents", "Renamed old backup for agent " + name + " to " + name + ".old." + nr);
		}
				
		fs.writeFileSync('./agents/' + name, agents[name].serialize() );
		// TODO: make it easy to write serialization function in the agent; npm packages toSrc and tosource may help with that
		// or maybe make it a service
		log.info("Eve Agents", "Stored agent " + name + " to file");
	}

	var restoreBackup = function(name) {
		if (!fs.existsSync('./agents/' + name)) {
			log.info("Eve Agents", "Tried to restore agent " + name + " from file, but file doesnt exist");
			return;
		}
		agents[name] = require('./agents/' + name);
		//TODO dont forget to add in new service functions object; see addAgent
		if (typeof agents[name].init === 'function') agents[name].init();   
		log.info("Eve Agents", "Restored agent " + name + " from backup");
	}
*/
	// adding a new agent to Eve 
	var addAgent = function(agent, name, options, initialbackup) {
		if (typeof agents[name] !== 'undefined') {
			log.info("Eve Agents", "Tried to add agent " + name + ", but the name is already in use");
			return 1;
		}

		agent.options = options; 		// mix in the options
		agent.name = name; 				// mix in the name
		agent.eve = ServiceFunctions(name);	 // mix in the service functions

		agents[name] = agent;
		agents[name].init();			//

		//if (initialbackup) backupAgent(name);  // make initial backup, if desired
		
	}

	var removeAgent = function(name) {
		if (typeof agents[name] === 'undefined') {
			log.info("Eve Agents", "Tried to remove agent " + name + ", but it doesnt exist");
			return;
		}
		delete agents[name];
		log.info("Eve Agents", "Removed agent " + name);
		// TODO: remove file from agents folder
	}


/*
	// freezing: agent stays listed for incoming messages, but doesnt keep agent in memory
	var freezeAgent = function(name) {
		if (typeof agents[name] === 'undefined') {
			log.info("Eve Agents", "Tried to freeze agent " + name + ", but it doesnt exist");
			return;
		}
		if (agents[name] === null) {
			log.info("Eve Agents", "Tried to freeze agent " + name + ", but it is already frozen");
			return;
		}
		backupAgent(name);
		agents[name] = null;
	}

	var unfreezeAgent = function(name) {
		if (agents[name] !== null) {
			log.info("Eve Agents", "Tried to unfreeze agent " + name + ", but it is not frozen currently");
			return;
		}
		restoreBackup(name);
	}
*/

	///////////////////////////////////////////////////////////////////////////////////////
	// some functions for managing the services
	//

	var addService = function(Service, options, name) {
		if (typeof services[name] !== 'undefined') {
			log.info("Eve Services", "Tried to add service " + name + ", but it already exists");
			return;
		} 
		try {
			services[name] = new Service(options, deliver); // TODO: see what we have to give to the services.. probably more than just this
			log.info("Eve Services", "Added service " + name);
		} catch (e) {
			log.info("Eve Services", "Tried to add service " + name + ", but constructor contains error");
			log.verbose("Eve Services", "Error message " + e);
		}

		updateServiceFunctions();
	}

	var removeService = function(name) {
		if (typeof services[name] === 'undefined') {
			log.info("Eve Services", "Tried to remove service " + name + ", but it doesnt exist");
			return;
		} 

		delete services[name];
		updateServiceFunctions();
		log.info("Eve Services", "Removed service " + name);
	}

	//////////////////////////////////////////////////////////////////////////////////////////////////////
	// 	Constructor / Init work
	//

	// instantiate the management agent that will do all the work, using the services and agents object
	var manager = require('./agents/managementAgent.js');
	agent.management = new manager(agents, services);

	// deal with parameters
	options = options || {};
	for (var option in defaultOptions) { if ( !(option in options) ) options[option] = defaultOptions[option]; }

	// ask the manager to start services and agents
	// Note: the reason we do this through the manager and not directly is to make sure that it always 
	//       happens in the same way (from RPC invocation on); less room for error

	//this.localRPC();
	//this.localRPC();
	//this.localRPC();

/*
	// start optional services (Note: do this synchronously, in case order matters)	
	this.loadServices(options.services);
	
	// start optional agents
	this.loadAgents(options.agents);
*/

}




