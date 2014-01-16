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

var request = require('request');

// constants
var HOST = '127.0.0.1',
    PORT = process.argv[2] || 1337;

// imports
var Eve                   = require('../eve.js');

//var myEve = new Eve({services: {}});

//To use with node 0.10, either use this:
//process.maxTickDepth = 10000000;
//or solve the problem by using setImmediate instead of process.nexttick in the agents

var gridsize = 10;
var mx = 1000;
var lifeAgents = {};
for (var i = 0; i < gridsize*gridsize; i++) {
	var name = "agent" + i;
	lifeAgents[name] = {filename: 'simpleAgent', options: {id: i, maxtimesteps: mx, grid: gridsize} };
}

var eveOptions = {
	services: { httpServer: {port:PORT, host:HOST, etc:0}, httpRequests: {}, localRequests2: {} },
	//agents: { agent1: {filename: 'simpleAgent', options: {} } }
	agents: lifeAgents
}

var myEve = new Eve(eveOptions);

console.log("starting game of life with gridsize " + gridsize + " for " + mx + " timesteps" );

var nrRPCs = ( ((gridsize - 2)*(gridsize - 2)*8) + (4*(gridsize - 2)*5) + 4*3 ) * mx;
console.log("involving " + nrRPCs + " RPCs");

setTimeout(function() {myEve.sendMessage("local://start"); console.time('run'); }, 1000);

//myEve.addAgents();

/*
    CalcAgent             = require('./agent/CalcAgent.js'),
    GoogleDirectionsAgent = require('./agent/GoogleDirectionsAgent.js'),
    GoogleCalendarAgent   = require('./agent/GoogleCalendarAgent.js'),
    UserAgent             = require('./agent/UserAgent.js');
*/

/*
for (var i = 0; i < 200; i++) { //400 gives "too many open files" ....
	eve.management.addAgent("tests/myAgent.js", {'initStatics':{'n':i}});
}
*/

// start the eve server
//eve.listen(PORT, HOST);
//console.log('Eve running at http://' + HOST + ':' + PORT + '/');

//// initiating some activity 
/*
setTimeout(function() {
	request({uri:'http://'+ HOST + ':' + PORT + '/agents/tests/myAgent/1', method: "POST", json:{id:3, method:'myFunction', params:{a:1, b:3}} },
	function(err, res, body) {
		console.log("response to initiating request: " + JSON.stringify(err) + " " + JSON.stringify(body));
	});
	console.log("request sent");

}, 1000);
*/

//setTimeout(function() {return eve.remove("/myAgent.js/1"); }, 2000);


