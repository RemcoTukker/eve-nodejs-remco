/*

Coding agents:

No fancy NodeJS stuff, no require, etc (use importScripts(filename) to load external js files)
No nextTick() or setTimeout(), so, sorry, no async stuff in here!

For now, the name of the file will be used as the name of the object that the functions are called on (thus, do var [filename] = new agentBase();)
For now, all functions should take a single params argument

The return value of a function will be used to answer the JSON RPC call  

Save information with store(key, value); dont store state directly!
All extra information that may be required can be obtained by invokeMethod: state or external JSON RPC calls. invokeMethod can also schedule a method in the 
	future. invokeMethod(methodName, params, stateKeys, RPCs, time) State cannot be recalled directly!
methodName: think of it as the callback function within this agent (string)
params:     info that you want to give the method from here  (associative array)
stateKeys:  info that you want to give the method from the state (associative array)
RPCs:		info that you want to give the method from a different agent (associative array)
Time: 		timeout/delay in ms to use for the invocation of the method (int)

The filename should be the same as the name of the object that is your agent (minus the .js). This protects you from writing two agent objects with the same 
	name (as long as you keep the agent files in the same folder) and makes the agent code portable (prevents naming conflicts)

TODO:
Only the functions described in the getMethod function are guaranteed to be available to the outside world (even better, at all reachable from outside)
Have a transparent way of returning errors vs data to the JSON RPC request

Do we need a special constructor in which we can send initializing messages or can we just do that anywhere? 
Probably better to have a special constructor! Also more clear that in there you can set "static variables"
Also, we need startup parameters
preferably, seperate init every thread (for static variables in the thread) and init once (for storing variables in memory)

*/

importScripts("agentBase.js");

var myAgent = Object.create(agentBase); 


var neighbours = [];
var myNumber;

/*
Two possible models for game of life: either send your neighbours as soon as you know your new state, or poll your neighbours untill you get something back

Chosen now: send neighbours as soon as you know

*/

myAgent.initAll = function(params) {   ///use this function to store information in this thread; in general, use only for static stuff!

	var n = params.n;
	myNumber = n;
	if (n >= 20) neighbours.push(n-20); //upper neighbour
	if (n < 180) neighbours.push(n+20); //lower neighbour
	if (n % 20 != 0) neighbours.push(n-1); //left neighbour
	if (n % 20 != 19) neighbours.push(n+1); //right neighbour
	if ((n >= 20) && (n % 20 != 0)) neighbours.push(n-21); //upper left
	if ((n >= 20) && (n % 20 != 19)) neighbours.push(n-19); //upper right
	if ((n < 180) && (n % 20 != 0)) neighbours.push(n+19); //lower left
	if ((n < 180) && (n % 20 != 19)) neighbours.push(n+21); //lower right

}

myAgent.initOnce = function(params) {  //use this function to start activity; its called once per agent after initialization

	var livingNow = (Math.random() < .5);
	var timeStep = 0;
	store("timeStep", timeStep);
	store("living", livingNow);

	var value = livingNow ? 1 : 0;
	var RPCobject = {};
	for (var i = 0; i < neighbours.length; i++) {
		RPCobject[i] = {'destination':'http://127.0.0.1:1337/agents/tests/myAgent.js/' + neighbours[i].toString(), 
								'data':{'id':0, 'method':'collectResults','params':{'origin':myNumber, 'timeStep':currentTimeStep, 'value':value}}};
	}

	invokeMethod('checkIfMessageArrived', {}, {}, RPCobject, 0);

}

myAgent.checkIfMessageArrived = function(params) {

	//todo: resend if it didnt arrive for some reason (some agent that was temporarily out of order?)

}

myAgent.collectResults = function(params) {
	var origin = params.origin;
	var timeStep = params.timestep;
	var name = timeStep.toString() + origin.toString();
	store(name, params.value);

	var stateObject = {};
	stateObject.living = "living";
	stateObject.timeStep = "timeStep";
	//add the states of the neighbours
	for (var i = 0; i < neighbours.length; i++) {
		stateObject[neighbours[i].toString()] = timeStep.toString() + neighbours[i].toString();
	}

	invokeMethod('myAgent.checkAllValues', {name:params.value}, stateObject ,{}, 0);
}

myAgent.checkAllValues = function(params) {
	var sum = 0;
	for (var i = 0; i < neighbours.length; i++) {
		if (params[neighbours[i].toString()] === undefined) {
			return; //break out, dont do anything, we dont have all required data yet
		} else {
			sum = sum + params[neighbours[i]];
		}
	}

	//see what our state is in the next timestep
	var livingNow = params.living;
	if (livingNow) {
		if (sum < 2 || sum > 3) livingNow = false;
	} else {
		if (sum == 3) livingNow = true;
	}

	var currentTimeStep = params.timeStep + 1;

	//store new currentTimeStep and livingNow	
	store("timeStep", currentTimeStep);
	store("living", livingNow);
	

	var value = livingNow ? 1 : 0;
	var RPCobject = {};
	for (var i = 0; i < neighbours.length; i++) {
		RPCobject[i] = {'destination':'http://127.0.0.1:1337/agents/tests/myAgent.js/' + neighbours[i].toString(), 
								'data':{'id':0, 'method':'collectResults','params':{'origin':myNumber, 'timeStep':currentTimeStep, 'value':value}}};
	}

	invokeMethod('checkIfMessageArrived', {}, {}, RPCobject, 0);
	
	return;
}


myAgent.myFunction = function(params) {
	
	var a = parseInt(params.a);
	var b = parseInt(params.b);
	var result = a + b;
	store("result", a + b);

	var c = mul(a,b);
	//console.log("2");

	//invokeMethod("myAgent.myFunction", {a:1}, {b:"result"}, {}, 1000);
	//invokeMethod("myAgent.myFunction", {a:1}, {}, {b:{destination:"http://localhost:1337/myAgent.js/1", 
	//					data:JSON.stringify({id:3, method:"myFunction", params: {a:1337, b:9}})}}, 500);
	if (a === 1) {
		invokeMethod('myAgent.myFunction', {a:1}, {}, {b:{destination:'http://127.0.0.1:1337/agents/tests/myAgent.js/1', 
						data:{id:3, method:'myFunction', params: {a:1337, b:result}}}}, 500);
		console.log("sent invokeMethod message");
	}
	
	//if (c > 1000000) throw new Error("Number too large");

	console.log("myfunction called with " + a + " " + b + " and will now return " + Number(a + b + c));
	return a + b + c;
}

//helper functions that wont be accessible from outside:
mul = function(a,b) {
	return a*b;
}


