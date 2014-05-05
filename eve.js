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
Add ZeroMQ transport (as soon as their "resources" concept is introduced, allowing multiple connections per address)
Add WebRTC transport (as soon as there is a WebRTC client for Nodejs)

introduce an onerror for uncaught exceptions (for integrity of files, etc), add typechecking everywhere it could go wrong
Add proper checks and warning everywhere, as well as try statements in appropriate places
prettier comments and function descriptions
use ecmascript 6 proxies to clean up some parts of the code 


Related work:
eve frontend to use eve in an express server and couple UIs to agents

Stuff for version x:
Add a store capability to prevent unused agents from taking up resources with a db
In the same way, allow agent migration and build browser-side agent environment
Use webworkers to protect server from agents and properly deal with setTimeout, pending callbacks, etc 
   (use browserify to deal with requires) also add agent factory types to give people a choice (?)
See if we want to add some sort of authentication model (PGP?)

*/

'use strict';

module.exports = Eve; 

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

	// the objects that will contain all the services and agents
	// My opinion on differences between services and agents: 
	//  - Services should be able to touch the Eve internals, agents shouldnt. 
	//  - Services are intended for use by agents within this server, while agents are intended to be contacted by anyone
	var services = {};
	var agents = {};

	// instantiate the management agent that will do all the work, using the services and agents object
	var manager = require('./agents/managementAgent.js');
	agent.management = new manager(agents, services);

	// a simple RPC creator for the owner of the Eve object (and us) to send messages when no transports are loaded yet
	this.localRPC = function(agent, method, params) {
		if (typeof agents[agent] === 'undefined') {
			return {id:null, err:"agent " + agent + " not found"};   
			//TODO make sure the localRPC function is always async to prevent weird problems
		}
		
		try {
			var answer = agents[agent].RPCfunctions[method]({}, function() {
				log.info("RPC successfull"); //TODO add some more results
			});
		} catch(err) {
			return {id:null, err:"Something wrong: " + err}
			//TODO make sure the localRPC function is always async to prevent weird problems
		}
	};

	/*
	 * 	Constructor / Init work
	 */

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




