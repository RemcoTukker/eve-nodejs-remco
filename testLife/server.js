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


// http p2p transport settings
var HOST = '127.0.0.1',
    PORT = process.argv[2] || 1337;

// game of life parameters for agents
var gridsize = 5;
var steps = 10;

//using a single agent prototype: less memory, but slower   vs    using separate prototype for each agent: faster, but more memory
var singlePrototype = true; 

//agents communicate over local or http transport (NB: http is very slow, tune down gridsize and steps)
var transport = "http";

//myAgent1.js and myAgent2.js implement the same functionality in a slightly different coding style (1 seems slightly faster)
var file = "myAgent3.js"; 

// setting up the object that lets Eve know which agents to initialize at startup
var lifeAgents = {};

if (singlePrototype) {
	lifeAgents = {filename: file, number: gridsize*gridsize, options: {maxtimesteps: steps, grid: gridsize, protocol: transport} };
} else {
	for (var i = 0; i < gridsize*gridsize; i++) {
		var name = "lifeAgent/" + i;
		lifeAgents[name] = {filename: file, options: {maxtimesteps: steps, grid: gridsize, protocol: transport} };
	}
}

// setting up the object that lets eve know which services to initialize at startup
var eveOptions = {
	services: { topics: {}, p2p: {transports: {localTransport: {}, httpTransport: {port: PORT, host: HOST} } } },
	agents: lifeAgents
} 

// starting Eve
var Eve = require('../eve.js');
var myEve = new Eve(eveOptions);

// give user some info
console.log("starting game of life with gridsize " + gridsize + " for " + steps + " timesteps" );
var nrRPCs = ( ((gridsize - 2)*(gridsize - 2)*8) + (4*(gridsize - 2)*5) + 4*3 ) * steps;
console.log("involving " + nrRPCs + " RPCs");

// after a second, give the start signal using the topics service
setTimeout(function() {myEve.useServiceFunction('publish', "service/eveserver", {content:"start"}); console.time('run'); }, 1000);


