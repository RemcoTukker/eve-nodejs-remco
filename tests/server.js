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

var gridsize = 10;
var mx = 10;

var Eve                   = require('../eve.js');


/* //using separate prototype for each agent: faster, but more memory
var lifeAgents = {};
for (var i = 0; i < gridsize*gridsize; i++) {
	var name = "agent" + i;
	lifeAgents[name] = {filename: 'simpleAgent.js', options: {instanceNumber: i, maxtimesteps: mx, grid: gridsize} };
}
*/
   //using a single prototype: less memory, but slower
lifeAgents = {filename: 'simpleAgent.js', number: gridsize*gridsize, options: {maxtimesteps: mx, grid: gridsize} };


var eveOptions = {
	services: { httpServer: {port:PORT, host:HOST, etc:0}, httpRequests: {}, localRequests: {} },
	agents: lifeAgents
} 

var myEve = new Eve(eveOptions);

console.log("starting game of life with gridsize " + gridsize + " for " + mx + " timesteps" );

var nrRPCs = ( ((gridsize - 2)*(gridsize - 2)*8) + (4*(gridsize - 2)*5) + 4*3 ) * mx;
console.log("involving " + nrRPCs + " RPCs");

setTimeout(function() {myEve.sendMessage("local://start"); console.time('run'); }, 1000);

