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

var ownport = 8082, otherport = 8081;

// game of life parameters for agents
var gridsize = 5;
var steps = 10;

//agents communicate over local or http transport (NB: http is very slow, tune down gridsize and steps)
var transport = "http";

//myAgent1.js and myAgent2.js implement the same functionality in a slightly different coding style (1 seems slightly faster)
var file = "myAgent4.js"; 

// setting up the object that lets Eve know which agents to initialize at startup
var lifeAgents = {};

//runnning the full test
for (var i = 0; i < gridsize*gridsize; i = i + 1) {
	var name = "agent_" + i;
	lifeAgents[name] = {filename: file, options: {maxtimesteps: steps, grid: gridsize, protocol: transport, port: ownport} };
}

// only initialize the odd ones for eve cross-implementation testing
//for (var i = 1; i < gridsize*gridsize; i = i + 2) {
//	var name = "lifeAgent/" + i;
//	lifeAgents[name] = {filename: file, options: {maxtimesteps: steps, grid: gridsize, protocol: transport, port: ownport, otherport: otherport} };
//}



// setting up the object that lets eve know which services to initialize at startup
var eveOptions = {
	services: { topics: {}, evep2p: {transports: {localTransport: {}, httpTransport: {port: ownport, host: HOST} } }, remoteDebugging: { } },
	agents: lifeAgents
} 

// starting Eve
var Eve = require('../eve.js');
var myEve = new Eve(eveOptions);

// give user some info
console.log("starting game of life with gridsize " + gridsize + " for " + steps + " timesteps" );
//var nrRPCs = ( ((gridsize - 2)*(gridsize - 2)*8) + (4*(gridsize - 2)*5) + 4*3 ) * steps; // for a field with borders
var nrRPCs = gridsize * gridsize * 8 * steps; //this is for a torus
console.log("involving " + nrRPCs + " RPCs");

// after a second, give the start signal using the topics service
setTimeout(function() {myEve.useServiceFunction('publish', "service/eveserver", {content:"start"}); console.time('run'); }, 1000);


