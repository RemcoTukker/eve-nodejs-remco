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

var fs = require('fs');
var parseArgs = require('minimist');


var defaultparams =  { type: 'full', delay: 1000, steps:10, initfile:"./testLife/55blink.txt", transport:"http", agentFile:"myAgent3.js", ownport:8082, otherport:8081 };
var cmdArgs = parseArgs(process.argv.slice(2), {default: defaultparams} );

console.log("usage node server.js --type=[full|odd|even] --delay=[n ms startdelay] --steps=[n cycles] --transport [http|local]")
console.log("default parameters: " + JSON.stringify(defaultparams));

var type = cmdArgs.type;
var startdelay = cmdArgs.delay;
var steps = cmdArgs.steps;
var startfile = cmdArgs.initfile;
var transport = cmdArgs.transport;
var file = cmdArgs.agentFile;
var ownport = cmdArgs.ownport;
var otherport = cmdArgs.otherport;


// if (odd) // nothing has to change
if (type == 'even') { // swap ownport and otherport
	var tmp = ownport;
	ownport = otherport;
	otherport = tmp;
} 
if (type == 'full') {  //full, all agents run on this server
	otherport = ownport;
}

// read initial states
var data = fs.readFileSync(startfile).toString().split('\n'); 
data = data.filter(function(e) {return e != ''});

if (data.length != data[0].length) new Error('this game of life only support square fields'); // TODO: also support rectangular field, to proper input checking on file
var gridsize = data.length;

var datastring = data.join('');

// setting up the object that lets Eve know which agents to initialize at startup
var lifeAgents = {};

for (var i = 0; i < gridsize*gridsize; i = i + 1) {

	if ((type == 'odd') && ((i % 2) == 0)) continue;
	if ((type == 'even') && ((i % 2) == 1)) continue;

	var name = "Agent_" + i;
	var start;
	if (datastring.charAt(i) == '+') start = true;
	if (datastring.charAt(i) == '-') start = false;
	lifeAgents[name] = {filename: file, options: {maxtimesteps: steps, grid: gridsize, protocol: transport, port: ownport, otherport: otherport, startvalue: start} };
}


// setting up the object that lets eve know which services to initialize at startup
var eveOptions = {
	services: { topics: {}, evep2p: {transports: {localTransport: {}, httpTransport: {port: ownport, host: '127.0.0.1'} } }, remoteDebugging: { } },
	agents: lifeAgents
} 

// starting Eve
var Eve = require('../eve.js');
var myEve = new Eve(eveOptions);

// give user some info
console.log("starting game of life with gridsize " + gridsize + " for " + steps + " timesteps" );
var nrRPCs = gridsize * gridsize * 8 * steps; //this is for a torus
console.log("involving " + nrRPCs + " RPCs");

// after a second, give the start signal using the topics service
setTimeout(function() {console.time('run'); myEve.useServiceFunction('publish', "service/eveserver", {content:"start"});  }, startdelay);


