/*

Coding agents:

No fancy NodeJS stuff, no require, etc (use importScripts(filename) to load external js files)
No nextTick() or setTimeout()

For now, the name of the file will be used as the name of the object that the functions are called on (thus, do var [filename] = new agentBase();)
For now, all functions should take a single params argument

The return value of a function will be used to answer the JSON RPC call

Save information with store(key, value); dont store state directly!
All extra information that may be required can be obtained by invokeMethod: state or external JSON RPC calls. invokeMethod can also schedule a method in the 
	future. invokeMethod(methodName, params, stateKeys, RPCs, time) State cannot be recalled directly!

TODO:
Only the functions described in the getMethod function are guaranteed to be available to the outside world 

*/

mul = function(a,b) {
	return a*b;
}

var myAgent = new agentBase(); //TODO: how does the caller in the main thread know what this object is called exactly? (right now it doesnt and thats nasty)
								//also, coupling the name of the file to the agent object that is defined here is not so nice (filename should be irrelevant)
//if we do it this way, myAgent cannot really be extracted as far as I could tell.. need to make a separate constructor function and set agentBase as prototype?

myAgent.myFunction = function(params) {
	
	var a = parseInt(params.a);
	var b = parseInt(params.b);
	var result = a + b;
	store("result", a + b);
	console.log("myfunction called with " + a + " " + b);

	send("bla", "bla");
	
	var c = mul(a,b);
	//throw new Error("aae");
	console.log("2");

	invokeMethod("myAgent.myFunction", {a:1}, {b:"result"}, 500);
	
	console.log("3");
	return a + b + c;
}
