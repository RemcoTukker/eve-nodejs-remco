
var myAgent = {RPCfunctions: {}};

myAgent.init = function() {

	// initialization stuff
	var timestep = 0;
	var n = parseInt(this.agentName.substring(this.agentName.lastIndexOf("_") + 1));
	var namePrefix = "/Agent_"; //this.agentName.substring(0, this.agentName.lastIndexOf("/"));
	if (this.options.startvalue == undefined)	{
		var living = (Math.random() < .5);
	} else {
		console.log(n + " " + this.options.startvalue);
		var living = this.options.startvalue;
	}
	var neighbours = [];
	var notifications = [];
	var result = [];
	var maxtimesteps = this.options.maxtimesteps;

	var gr = this.options.grid;
/*   this is for a field with borders
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
	
	// store stuff for future reference
	this.n = n;
	this.namePrefix = namePrefix;
	this.neighbours = neighbours;
	this.notifications = notifications;
	this.result = result;
	this.maxtimesteps = maxtimesteps;
	this.living = living;
	this.timestep = timestep;
	this.history = [];

	// subscribing to the topic that will publish the start message
	this.subscribe('service/eveserver', function(message) {
		if (message.content == "start")	this.broadcast(this.timestep, this.living);
	});

}


// this is the function that we will use to send out the RPCs to inform the other cells of our state
myAgent.broadcast = function(curtimestep, curliving) {
	//console.log("sending sometin:" + curtimestep);
	var historyEntry = {cycle: curtimestep, alive: curliving};
	this.history.push(historyEntry);

	for (var i = 0; i < this.neighbours.length; i++) {
		if (this.options.protocol == "local") {
			this.send("local:/" + this.namePrefix + this.neighbours[i], 
					{method:"collect", id:0, params: {alive: curliving, cycle:curtimestep, from:this.n} }, 
					function(answer){ }); //dont have to do anything with the answer... we're just pushing the result

		} else if (this.options.protocol == "http") {
			var reqport = (this.options.otherport != undefined && (this.neighbours[i] % 2 == 0)) ? this.options.otherport : this.options.port;
				//console.log(this.options.otherport);
				//console.log(reqport);

			this.send("http://127.0.0.1:" + reqport + "/agents" + this.namePrefix + this.neighbours[i], 
					{method:"collect", id:0, params: {alive: curliving, cycle:curtimestep, from:this.n} }, 
					function(answer){ }); //dont have to do anything with the answer... we're just pushing the result
		}
	}
} 


myAgent.RPCfunctions.collect = function(params, callback) {
	
	this.notifications[params.cycle]++;
	this.result[params.cycle] += params.alive;
	callback({ok:"thanks"});
	
	//NB: we need schedule here (translates to setImmediate when no time is given), 
	// because otherwise we may do timestep++ before sending out broadcast of current timestep
	if (this.notifications[params.cycle] == this.neighbours.length) this.schedule(function() {

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

myAgent.RPCfunctions.getAllCycleStates = function(params, callback) {
		
		callback({result: this.history, error: null});
}

var AgentBase = require("./agentBase2.js");  // requiring the factory that will wrap a constructor function around our code
module.exports = AgentBase(myAgent);
