//var AgentBase = require("./agentBase.js");  //relaying the constructor to the agentBase
//module.exports = AgentBase;
//var myAgent = AgentBase.prototype;  //is this allright; do we need to invalidate cache or not?

//we're extending the prototype for the "agentbase" in agentBase.js with our own functionality
//this allows us to abstract away nasty bookkeeping tasks and allowing the programmer to focus on the agent functionality
//this version of the agent uses closure to minimize typing and bookkeeping effort 
// (at the cost of having everything in one huge init function)

var myAgent = {};
myAgent.init = function() {
	//by the way, you can even supply all required functions as parameters to the init functions, to almost completely get rid of "this"

	// initialization stuff
	var timestep = 0;
	var n = parseInt(this.agentName.substring(this.agentName.lastIndexOf("_") + 1));
	var namePrefix = "/Agent_";  // this.agentName.substring(0, this.agentName.lastIndexOf("/"));
	if (this.options.startvalue == undefined)	{
		var living = (Math.random() < .5);
	} else {
		console.log(n + " " + this.options.startvalue);
		var living = this.options.startvalue;
	}	
	var neighbours = [];
	var notifications = [];
	var result = [];
	var history = [];
	var maxtimesteps = this.options.maxtimesteps;

	var gr = this.options.grid;

/*  this is for a simple field with borders
	if (n >= gr) neighbours.push(n-gr); //upper neighbour
	if (n < (gr*gr - gr)) neighbours.push(n+gr); //lower neighbour
	if (n % gr != 0) neighbours.push(n-1); //left neighbour
	if (n % gr != (gr - 1)) neighbours.push(n+1); //right neighbour
	if ((n >= gr) && (n % gr != 0)) neighbours.push(n-gr-1); //upper left
	if ((n >= gr) && (n % gr != (gr-1))) neighbours.push(n-gr+1); //upper right
	if ((n < (gr*gr - gr)) && (n % gr != 0)) neighbours.push(n+gr-1); //lower left
	if ((n < (gr*gr - gr)) && (n % gr != (gr-1))) neighbours.push(n+gr+1); //lower right
*/
	
	// this is for a torus
	var prop = n - gr; // upper
	if (n < gr) prop = prop + gr*gr;
	neighbours.push(prop);

	prop = n + gr; //lower
	if (n >= (gr*gr-gr)) prop = prop - gr*gr;
	neighbours.push(prop);

	prop = n - 1; //left
	if (n % gr == 0) prop = prop + gr;
	neighbours.push(prop);
	
	prop = n + 1; // right
	if (n % gr == (gr - 1)) prop = prop - gr;
	neighbours.push(prop);

	var prop = n-gr-1; //upper left
	if (n < gr) prop = prop + gr*gr;
	if (n % gr == 0) prop = prop + gr;
	neighbours.push(prop);

	var prop = n-gr+1; //upper right
	if (n < gr) prop = prop + gr*gr;
	if (n % gr == (gr - 1)) prop = prop - gr;
	neighbours.push(prop);

	var prop = n+gr-1; //lower left
	if (n >= (gr*gr-gr)) prop = prop - gr*gr;
	if (n % gr == 0) prop = prop + gr;
	neighbours.push(prop);

	prop = n+gr+1; //lower right
	if (n >= (gr*gr-gr)) prop = prop - gr*gr;
	if (n % gr == (gr - 1)) prop = prop - gr;
	neighbours.push(prop);


	for (var i = 0; i < maxtimesteps; i++) {
		notifications[i] = 0;
		result[i] = 0;
	}
	
	var send = this.send;
	var transport = this.options.protocol;	
	var port = this.options.port;
	var otherport = this.options.otherport;

	// this is the function that we will use to send out the RPCs to inform the other cells of our state
	var broadcast = function(curtimestep, curliving) {
		var historyEntry = {cycle: curtimestep, alive: curliving};
		history.push(historyEntry);
		
		for (var i = 0; i < neighbours.length; i++) {
			if (transport == "local") {
				send("local:/" + namePrefix + neighbours[i], 
						{method:"collect", id:0, params: {alive: curliving, cycle:curtimestep, from:n} }, 
						function(answer){ }); //dont have to do anything with the answer... we're just pushing the result

			} else if (transport == "http") {
				var reqport = (otherport != undefined && (neighbours[i] % 2 == 0)) ? otherport : port;
				//console.log(otherport);
				//console.log(reqport);

				send("http://127.0.0.1:" + reqport + "/agents" + namePrefix + neighbours[i], 
						{method:"collect", id:0, params: {alive: curliving, cycle:curtimestep, from:n} }, 
						function(answer){ }); //dont have to do anything with the answer... we're just pushing the result
			}
		}
	} 

	// subscribing to the topic that will publish the start message
	this.subscribe('service/eveserver', function(message) {
		if (message.content == "start")	broadcast(timestep, living);
	});

	// Add a function that can be called by RPCs from other cells, collecting neighbouring states
	
	this.RPCfunctions = {}; //TODO possible to move this to agent factory
	this.RPCfunctions.collect = function(params, callback) {
	
		//console.log("got data " + params.timeStep + " " + n);
		notifications[params.cycle]++;
		result[params.cycle] += params.alive;
		callback({result:"thanks", error:null});

/*
		//NB: we need schedule here (translates to setImmediate when no time is given), 
		// because otherwise we may do timestep++ before sending out broadcast of current timestep
		if (notifications[params.cycle] == neighbours.length) this.schedule(function() {

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
*/	

	if (notifications[params.cycle] == neighbours.length) {
		
		var oldState = history[params.cycle];
		if (oldState.cycle != params.cycle) new Error("cycle numbers dont match");
		var newLiving = oldState.alive;
		if (result[params.cycle] == 3) newLiving = true;
		if (result[params.cycle] < 2 || result[params.cycle] > 3) newLiving = false;

		if (params.cycle + 1 == maxtimesteps) {
			if (n == 1) { 
				this.schedule(function(){
					console.log("reached " + maxtimesteps + " timesteps");
					console.timeEnd('run');

				}, 30); // to make sure its displayed at the end
			}
			return;
		}

		broadcast(params.cycle + 1, newLiving);

	}


	}

	this.RPCfunctions.getAllCycleStates = function(params, callback) {
		
		callback({result: history, error: null});
	}

}


var AgentBase = require("./agentBase2.js");  // requiring the factory that will wrap a constructor function around our code
module.exports = AgentBase(myAgent);

