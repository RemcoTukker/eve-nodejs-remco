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

topic agent as preparation for ARUM gateway agent
merge http stuff together
add a management agent as entry point to all service/management functions
start describing the API and think about clear names for everything
authentication!

introduce an onerror for uncaught exceptions (for integrity of files, etc), add typechecking everywhere it could go wrong
Add proper checks and warning everywhere, as well as try statements in appropriate places
prettier comments and function descriptions
use ecmascript 6 proxies to clean up some parts of the code 


Related work:
eve frontend to use eve in an express server and couple UIs to agents

Stuff for version x:
Use webworkers to protect server from agents and properly deal with setTimeout, pending callbacks, etc 
   (use browserify to deal with requires) also add agent factory types to give people a choice
Add a store capability to prevent unused agents from taking up resources with a db
In the same way, allow agent migration and build browser-side agent environment
See if we want to add some sort of authentication model (PGP?)

*/

'use strict';

module.exports = Eve; 

// global debug output function to be used by all eve components
global.evedebug = function(topic, message) {
	console.log(topic + ": " + JSON.stringify(message)); 
	// TODO make it possible to listen only to particular event types / levels to prevent flooding
}


// the default settings
var defaultOptions = {
	services : { topics: {}, p2p: {transports: {localTransport: {} } } }
};


/* // ZMQ test code.. is this actually working with the zmq 4.x series? (i mean the whole "resources" business)
   // try with something else than push pull and see how that is working...

var zmq = require('zmq'), sock1 = zmq.socket('push'), sock2 = zmq.socket('push');

sock1.bind('tcp://127.0.0.1:8090/sock1');
sock2.bind('tcp://127.0.0.1:8090/sock2');

setInterval(function(){
  sock1.send('some work');
}, 1500);
setInterval(function(){
  sock2.send('also some work');
}, 500);

var sock3 = zmq.socket('pull'), sock4 = zmq.socket('pull');
sock3.connect('tcp://127.0.0.1:8090/sock1');
sock4.connect('tcp://127.0.0.1:8090/sock2');

sock3.on('message', function(msg) {
  console.log('3: ' + msg.toString());
});
sock4.on('message', function(msg) {
  console.log('4: ' + msg.toString());
});
*/


	
function Eve(options) {
	
	// to make sure that code doesnt fail if new is omitted
	if ( !(this instanceof Eve) ) return new Eve(options); 

	// define some state variables for Eve: 
	
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
		ownServiceFunctions.owner = {name: name};
		Object.freeze(ownServiceFunctions);
		Object.freeze(ownServiceFunctions.owner); // to be able to identify originator of service function calls

		agents[name] = new Agent(name, filename, options, ownServiceFunctions);				
		evedebug("Eve Core","Agent loaded: " + name);
	};

	this.removeAgents = function() {}; // TODO: implement this.. will be painful, consider switching to the webworker approach
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


	
	/*
	 * 	Constructor / Init work
	 */

	// deal with parameters
	options = options || {};
	for (var option in defaultOptions) { if ( !(option in options) ) options[option] = defaultOptions[option]; }

	// start optional services (Note: do this synchronously, in case order matters)	
	this.loadServices(options.services);
	
	// start optional agents
	this.loadAgents(options.agents);

}




