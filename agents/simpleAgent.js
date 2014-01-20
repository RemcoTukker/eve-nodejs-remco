MyAgent = require("./simpleAgentBase.js");
module.exports = MyAgent;

// defining our own stuff on top of the AgentBase

//TODO
//this prototype here is ugly.. see if / how we can make it prettier; also, its not nice everything should happen in this function..
// (on the other hand, declaring the variables to be used by my own code is really convenient now.. PITA to all the time go through 'this')

//probably we should work it out using an agent factory
//or maybe just define the constructor in this file and just import some utility functions form the agentbase

//what i want is just one object that is the prototype for potentially many agents, 
// with all the RPC functions in the agent.RPCfunctions object


MyAgent.prototype.init = function(options, send, registerToTopic, setRPCfunction, schedule) {

	var timestep = 0;
	var n = options.instanceNumber;
	var living = (Math.random() < .5);
	var neighbours = [];
	var notifications = [];
	var result = [];
	var maxtimesteps = options.maxtimesteps;

	var gr = options.grid;

	if (n >= gr) neighbours.push(n-gr); //upper neighbour
	if (n < (gr*gr - gr)) neighbours.push(n+gr); //lower neighbour
	if (n % gr != 0) neighbours.push(n-1); //left neighbour
	if (n % gr != (gr - 1)) neighbours.push(n+1); //right neighbour
	if ((n >= gr) && (n % gr != 0)) neighbours.push(n-gr-1); //upper left
	if ((n >= gr) && (n % gr != (gr-1))) neighbours.push(n-gr+1); //upper right
	if ((n < (gr*gr - gr)) && (n % gr != 0)) neighbours.push(n+gr-1); //lower left
	if ((n < (gr*gr - gr)) && (n % gr != (gr-1))) neighbours.push(n+gr+1); //lower right

	for (var i = 0; i < maxtimesteps; i++) {
		notifications[i] = 0;
		result[i] = 0;
	}
	
	var broadcast = function(curtimestep, curliving) {
		for (var i = 0; i < neighbours.length; i++) {
			send("local://tests/myAgent/" + neighbours[i], 
					{method:"collect", id:0, params: {living: curliving, timeStep:curtimestep, from:n} }, 
					function(answer){ }); //dont have to do anything... just pushing the result
		}
	} 

	this.RPCfunctions.collect = function(params, callback) {
		notifications[params.timeStep]++;
		result[params.timeStep] += params.living;
		callback({ok:"thanks"});
		
		//NB: we _need_ setImmediate here, because other we may do timestep++ before sending out broadcast of current timestep
		if (notifications[params.timeStep] == neighbours.length) setImmediate(function() {

			if (result[timestep] == 3) living = true;
			if (result[timestep] < 2 || result[timestep] > 3) living = false;
			timestep++;
			if (timestep == maxtimesteps) {
				if (n == 0) { 
					console.log("reached " + options.maxtimesteps + " timesteps");
					console.timeEnd('run');
				}
				return;
			}
			broadcast(timestep, living);
		});
	}

	registerToTopic('start', function(parsedRPC, callback) {
		broadcast(timestep, living);
	});

}



