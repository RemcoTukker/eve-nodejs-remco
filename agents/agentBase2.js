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

