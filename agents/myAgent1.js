var AgentBase = require("./agentBase.js");  //relaying the constructor to the agentBase
module.exports = AgentBase;
var myAgent = AgentBase.prototype;

//we're extending the prototype for the "agentbase" in agentBase.js with our own functionality
//this allows us to abstract away nasty bookkeeping tasks and allowing the programmer to focus on the agent functionality
//this version of the agent uses closure to minimize typing and bookkeeping effort 
// (at the cost of having everything in one huge init function)

myAgent.init = function() {
	//by the way, you can even supply all required functions as parameters to the init functions, to almost completely get rid of "this"

	// initialization stuff
	var timestep = 0;
	var n = this.options.instanceNumber;
	var living = (Math.random() < .5);
	var neighbours = [];
	var notifications = [];
	var result = [];
	var maxtimesteps = this.options.maxtimesteps;

	var gr = this.options.grid;

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
	
	var send = this.send;
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
	this.subscribe('service/eveserver', function(message) {
		if (message.content == "start")	broadcast(timestep, living);
	});

	// Add a function that can be called by RPCs from other cells, collecting neighbouring states
	
	this.RPCfunctions.collect = function(params, callback) {
	
		//console.log("got data " + params.timeStep + " " + n);
		notifications[params.timeStep]++;
		result[params.timeStep] += params.living;
		callback({ok:"thanks"}); //TODO: make sure we can send proper replies (with IDs for example)

		//NB: we need schedule here (translates to setImmediate when no time is given), 
		// because otherwise we may do timestep++ before sending out broadcast of current timestep
		if (notifications[params.timeStep] == neighbours.length) this.schedule(function() {

			//console.log("hi! ");
			if (result[timestep] == 3) living = true;
			if (result[timestep] < 2 || result[timestep] > 3) living = false;
			timestep++;
			if (timestep == maxtimesteps) {
				if (n == 0) { 
					console.log("reached " + maxtimesteps + " timesteps");
					console.timeEnd('run');
				}
				return;
			}
			//console.log("broadcasting again: " + n + " "  + timestep + "  " + living);
			broadcast(timestep, living);
		});
	}

}

