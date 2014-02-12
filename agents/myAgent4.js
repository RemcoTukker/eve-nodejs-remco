
var myAgent = {RPCfunctions: {}};

myAgent.init = function() {

	// initialization stuff
	var timestep = 0;
	var n = parseInt(this.agentName.substring(this.agentName.lastIndexOf("/") + 1));
	var namePrefix = this.agentName.substring(0, this.agentName.lastIndexOf("/"));
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
	
	// store stuff for future reference
	this.n = n;
	this.namePrefix = namePrefix;
	this.neighbours = neighbours;
	this.notifications = notifications;
	this.result = result;
	this.maxtimesteps = maxtimesteps;
	this.living = living;
	this.timestep = timestep;

	// subscribing to the topic that will publish the start message
	this.subscribe('service/eveserver', function(message) {
		if (message.content == "start")	this.broadcast(this.timestep, this.living);
	});

}


// this is the function that we will use to send out the RPCs to inform the other cells of our state
myAgent.broadcast = function(curtimestep, curliving) {
	//console.log("sending sometin:" + curtimestep);
	for (var i = 0; i < this.neighbours.length; i++) {
		if (this.options.protocol == "local") {
			this.send("local://" + this.namePrefix + "/" + this.neighbours[i], 
					{method:"collect", id:0, params: {living: curliving, timeStep:curtimestep, from:this.n} }, 
					function(answer){ }); //dont have to do anything with the answer... we're just pushing the result

		} else if (this.options.protocol == "http") {
			this.send("http://127.0.0.1:1337/" + this.namePrefix + "/" + this.neighbours[i], 
					{method:"collect", id:0, params: {living: curliving, timeStep:curtimestep, from:this.n} }, 
					function(answer){ }); //dont have to do anything with the answer... we're just pushing the result
		}
	}
} 


myAgent.RPCfunctions.collect = function(params, callback) {
	
	this.notifications[params.timeStep]++;
	this.result[params.timeStep] += params.living;
	callback({ok:"thanks"});
	
	//NB: we need schedule here (translates to setImmediate when no time is given), 
	// because otherwise we may do timestep++ before sending out broadcast of current timestep
	if (this.notifications[params.timeStep] == this.neighbours.length) this.schedule(function() {

		if (this.result[this.timestep] == 3) this.living = true;
		if (this.result[this.timestep] < 2 || this.result[this.timestep] > 3) this.living = false;
		this.timestep++;
		if (this.timestep == this.maxtimesteps) {
			if (this.n == 0) { 
				console.log("reached " + this.maxtimesteps + " timesteps");
				console.timeEnd('run');
			}
			return;
		}

		this.broadcast(this.timestep, this.living);
	});
} 

var AgentBase = require("./agentBase2.js");  // requiring the factory that will wrap a constructor function around our code
module.exports = AgentBase(myAgent);
