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

var insertUtilities = require('./utilityFunctions.js');
module.exports = AgentBase;

function AgentBase(myAgent) {

	// return value is an agent factory that creates the agent

	return function(agentName, filename, options, serviceFunctions) {

		// create a new object with as prototype the user defined object
		// alternatives are constructor functions that provide a deep copy, returns the object itself, 
		// or perhaps even sets an arbitrary prototype. Also its possible to write a constructor functions yourself
		var newAgent = Object.create(myAgent);

		// TODO set the constructor?

		// this mixes in utility functions for eg scheduling
		insertUtilities(newAgent, agentName, filename, options, serviceFunctions);

		//let the user defined stuff happen! TODO: check if it exists
		newAgent.init();


		return newAgent;
	}



}

