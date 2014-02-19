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
	var n = parseInt(this.agentName.substring(this.agentName.lastIndexOf("_") + 1));
	var namePrefix = "/Agent_";  // this.agentName.substring(0, this.agentName.lastIndexOf("/"));
	var history = [];	
	//set the initial state: 
	if (this.options.startvalue == undefined)	{
		history.push({cycle:0, alive:(Math.random() < .5)})
	} else {
		history.push({cycle:0, alive:this.options.startvalue})
	}	
	var neighbours = [];
	var notifications = [];
	var result = [];

	// for use in the functions that dont have 'this'	
	var maxtimesteps = this.options.maxtimesteps;
	var send = this.send;
	var transport = this.options.protocol;	
	var port = this.options.port;
	var otherport = this.options.otherport;
	var schedule = this.schedule;
	var gr = this.options.grid;
	
	// calculate neighbours in a torus
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

	// initializing to zero
	for (var i = 0; i < maxtimesteps; i++) {
		notifications[i] = 0;
		result[i] = 0;
	}
	
	// this is the function that we will use to send out the RPCs to inform the other cells of our state
	var broadcast = function(curtimestep, curliving) {
		
		//console.log("agent " + n + " in cycle " + curtimestep + " starts sending messages");

		var sendWithDebug = function(address, rpc, i) {
			send(address, rpc, function(answer) {
				//console.log("Agent " + n + " got answer " + answer.result + " " + answer.error + " from " + neighbours[i] + " for cycle " + rpc.params.cycle);
			});
		}
				
		for (var i = 0; i < neighbours.length; i++) {
			if (transport == "local") {
				sendWithDebug("local:/" + namePrefix + neighbours[i], {method:"collect", id:0, params: {alive: curliving, cycle:curtimestep, from:n} }, i);
			} else if (transport == "http") {
				var reqport = ((neighbours[i] % 2) == (n % 2)) ? port : otherport;
				sendWithDebug("http://127.0.0.1:" + reqport + "/agents" + namePrefix + neighbours[i], 
						{method:"collect", id:0, params: {alive: curliving, cycle:curtimestep, from:n} }, i);
			}
		}

		//console.log("agent " + n + " in cycle " + curtimestep + " should have sent and received " + neighbours.length + " messages");

	}

	// here the new state is calculated
	var newCycle = function(cycle) {

		var oldState = history[cycle - 1];
		var newLiving = oldState.alive;
		if (result[cycle - 1] == 3) newLiving = true;
		if (result[cycle - 1] < 2 || result[cycle - 1] > 3) newLiving = false;

		var historyEntry = {cycle:cycle, alive:newLiving};
		history.push(historyEntry);

		//message for once we are done
		if (cycle == maxtimesteps) {
			if (n < 2) { 
				schedule(function(){
					console.log("Agent " + n + " reached " + maxtimesteps + " timesteps");
					console.timeEnd('run');
				}, 30); // to make sure its displayed at the end / does give a slightly more negative result
			}
			return;
		}

		broadcast(cycle, newLiving); 

		//console.log("Agent " + n + " advanced to cycle " + cycle );

		// check if we by chance already have all incoming messages of the current cycle, and if so, advance to next one immediately
		if (notifications[cycle] == neighbours.length) newCycle(cycle + 1);

	}
 

	// subscribing to the topic that will publish the start message
	this.subscribe('service/eveserver', function(message) {
		if (message.content == "start")	broadcast(0, history[0].alive);
	});

	// Add the RPC functions
	this.RPCfunctions = {}; //TODO possible to move this to agent factory
	// this receives the new states from other agents
	this.RPCfunctions.collect = function(params, callback) {
	
		notifications[params.cycle]++;
		result[params.cycle] += params.alive;
		callback({result:"thanks", error:null});
		//console.log("Agent " + n + " received " + params.cycle + " " + params.alive + " from agent " + params.from);

		// if we got all neighbours' states and we know our own, advance a cycle
		if (notifications[params.cycle] == neighbours.length && history.length == params.cycle + 1) newCycle(params.cycle + 1);
 
	}

	// this basically gives a simple log to the outside world
	this.RPCfunctions.getAllCycleStates = function(params, callback) {
		callback({result: history, error: null});
	}

}


var AgentBase = require("./agentBase2.js");  // requiring the factory that will wrap a constructor function around our code
module.exports = AgentBase(myAgent);

