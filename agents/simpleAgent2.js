// the simple agent inheriting its utility functions from the agentBase

// no layer between eve and this agents constructor
// all method and properties of the agent have to be defined within the constructor
// 

// see simpleAgent1 for different implementation


var agentBase2 = require("./simpleAgentBase2.js");
module.exports = MyAgent2;
MyAgent2.prototype = agentBase2;

function MyAgent2(on, send, sub, pub, filename, options) {

	// initialization stuff

	this.registerAddresses(on, options, this.RPCfunctions);
		
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
	
	// this is the function that we will use to send out the RPCs to inform the other cells of our state
	var broadcast = function(curtimestep, curliving) {
		for (var i = 0; i < neighbours.length; i++) {
			//send("http://127.0.0.1:1337/tests/myAgent/" + neighbours[i], 
			send("local://tests/myAgent/" + neighbours[i], 
					{method:"collect", id:0, params: {living: curliving, timeStep:curtimestep, from:n} }, 
					function(answer){ }); //dont have to do anything with the answer... we're just pushing the result
		}
	} 

	// subscribing to the topic that will publish the start message
	sub('service/eveserver', function(message) {
		if (message.content == "start")	broadcast(timestep, living);
	});

	var schedule = this.schedule;
	//alt: var schedule = agentBase2.schedule;
	//alt2: supply schedule to the constructor

	// Add a function that can be called by RPCs from other cells, collecting neighbouring states
	this.RPCfunctions.collect = function(params, callback) {
		notifications[params.timeStep]++;
		result[params.timeStep] += params.living;
		callback({ok:"thanks"});

		//NB: we need schedule here (translates to setImmediate when no time is given), 
		// because otherwise we may do timestep++ before sending out broadcast of current timestep
		if (notifications[params.timeStep] == neighbours.length) schedule(function() {

			//console.log("hi! ");
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
			//console.log("broadcasting again: " + n + " "  + timestep + "  " + living);
			broadcast(timestep, living);
		});
	}
}



