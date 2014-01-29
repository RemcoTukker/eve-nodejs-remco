/*
TODO: Write a proper test suite:

Adding agent:
Add a proper agent
Try to add an agent from a non-existent file
Try to add an agent that contains errors

Answering requests:
Proper request
Malformed requests (non parseable JSON RPC, no return ID)
Request from nonexistent agent
Request from agent that doesnt answer atm
Request from method that doenst exist on agent
Request from method with wrong parameters
Request resulting in runtime error at agent

Agent functionality:
...

*/


var HOST = '127.0.0.1',
    PORT = process.argv[2] || 1337;

var gridsize = 3;
var steps = 10;
//using a single prototype: less memory, but slower
//using separate prototype for each agent: faster, but more memory
var singlePrototype = false; 
//myAgent1.js and myAgent2.js implement the same functionality in a slightly different coding style
//myAgent1 seems faster 
var file = "myAgent1.js"; 

var Eve                   = require('../eve.js');

var lifeAgents = {};

if (singlePrototype) {
	lifeAgents = {filename: file, number: gridsize*gridsize, options: {maxtimesteps: steps, grid: gridsize} };
} else {
	for (var i = 0; i < gridsize*gridsize; i++) {
		var name = "agent" + i;
		lifeAgents[name] = {filename: file, options: {instanceNumber: i, maxtimesteps: steps, grid: gridsize} };
	}
}

var eveOptions = {
	//services: { httpServer: {port:PORT, host:HOST, etc:0}, httpRequests: {}, localRequests: {} }, //http requests fails in strict mode
	//services: { httpTransport: {port:PORT, host:HOST, etc:0}, localTransport: {}, topics: {}, p2p: {} },
	services: { topics: {}, p2p: {} },
	agents: lifeAgents
} 

var myEve = new Eve(eveOptions);

console.log("starting game of life with gridsize " + gridsize + " for " + steps + " timesteps" );
var nrRPCs = ( ((gridsize - 2)*(gridsize - 2)*8) + (4*(gridsize - 2)*5) + 4*3 ) * steps;
console.log("involving " + nrRPCs + " RPCs");

//myEve.useServiceFunction('publish', 'service/eveserver', {content:"start"});

// give start sign after a slight timeout to make sure agents are instantiated (TODO: add "all instantiated" event)
//setTimeout(function() {myEve.publish("service/eveserver", {content:"start"}); console.time('run'); }, 1000);

setTimeout(function() {myEve.useServiceFunction('publish', "service/eveserver", {content:"start"}); console.time('run'); }, 1000);



