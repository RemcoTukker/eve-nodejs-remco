
var myAgent = {RPCfunctions: {}};

myAgent.init = function() {

	// initialization stuff
	var timestep = 0;
	var n = parseInt(this.agentName.substring(this.agentName.lastIndexOf("_") + 1));
	var namePrefix = "/Agent_"; //this.agentName.substring(0, this.agentName.lastIndexOf("/"));
	if (this.options.startvalue == undefined)	{
		var living = (Math.random() < .5);
	} else {
		//console.log(n + " " + this.options.startvalue);
		var living = this.options.startvalue;
	}
	var neighbours = [];
	var notifications = [];
	var result = [];
	var maxtimesteps = this.options.maxtimesteps;
	var gr = this.options.grid;

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
	this.history = [{cycle:0, alive:living}];

	// subscribing to the topic that will publish the start message
	this.subscribe('service/eveserver', function(message) {
		if (message.content == "start")	this.broadcast(this.timestep, this.living);
	});

}


// this is the function that we will use to send out the RPCs to inform the other cells of our state
myAgent.broadcast = function(curtimestep, curliving) {

	var send = this.send;	

	var sendWithDebug = function(address, rpc, i) {
		send(address, rpc, function(answer) {
			//console.log("Agent " + n + " got answer " + answer.result + " " + answer.error + " from " + neighbours[i] + " for cycle " + rpc.params.cycle);
		});
	}

	for (var i = 0; i < this.neighbours.length; i++) {
		if (this.options.protocol == "local") {
			sendWithDebug("local:/" + this.namePrefix + this.neighbours[i], {method:"collect", id:0, params: {alive: curliving, cycle:curtimestep, from:this.n} }, i);

		} else if (this.options.protocol == "http") {
			var reqport = ((this.neighbours[i] % 2) == (this.n % 2)) ? this.options.port : this.options.otherport;
			sendWithDebug("http://127.0.0.1:" + reqport + "/agents" + this.namePrefix + this.neighbours[i], 
						{method:"collect", id:0, params: {alive: curliving, cycle:curtimestep, from:this.n} }, i);
		}
	}

} 

myAgent.newCycle = function(cycle) {

	//console.log("advancing to cycle " + cycle);
	var oldState = this.history[cycle - 1];

	var newLiving = oldState.alive;
	if (this.result[cycle - 1] == 3) newLiving = true;
	if (this.result[cycle - 1] < 2 || this.result[cycle - 1] > 3) newLiving = false;

	var historyEntry = {cycle:cycle, alive:newLiving};
	this.history.push(historyEntry);
	
	if (cycle == this.maxtimesteps) {
		if (this.n < 2) { 
			this.schedule(function(){
				console.log("Agent " + this.n + " reached " + this.maxtimesteps + " timesteps");
				console.timeEnd('run');

			}, 30); // to make sure its displayed at the end / does give a slightly more negative result
		}
		return;
	}

	this.broadcast(cycle, newLiving);

	// check if we by chance already have all incoming messages of next cycle
	if (this.notifications[cycle] == this.neighbours.length) this.newCycle(cycle + 1);

}

myAgent.RPCfunctions.collect = function(params, callback) {
	
	this.notifications[params.cycle]++;
	this.result[params.cycle] += params.alive;
	callback({result:"thanks", error:null});

	if (this.notifications[params.cycle] == this.neighbours.length && this.history.length == params.cycle + 1) this.newCycle(params.cycle + 1);

} 

myAgent.RPCfunctions.getAllCycleStates = function(params, callback) {
		
		callback({result: this.history, error: null});
}

var AgentBase = require("./agentBase2.js");  // requiring the factory that will wrap a constructor function around our code
module.exports = AgentBase(myAgent);
