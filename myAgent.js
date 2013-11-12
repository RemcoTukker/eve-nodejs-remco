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
Only the functions described in the getMethod function are guaranteed to be available to the outside world 
Have a transparent way of returning errors vs data to the JSON RPC request

*/

importScripts("agentBase.js");

var myAgent = Object.create(agentBase); 

myAgent.myFunction = function(params) {
	
	var a = parseInt(params.a);
	var b = parseInt(params.b);
	var result = a + b;
	store("result", a + b);
	console.log("myfunction called with " + a + " " + b);

	var c = mul(a,b);
	console.log("2");

	//invokeMethod("myAgent.myFunction", {a:1}, {b:"result"}, {}, 1000);
	//invokeMethod("myAgent.myFunction", {a:1}, {}, {b:{destination:"http://localhost:1337/myAgent.js/1", 
	//					data:JSON.stringify({id:3, method:"myFunction", params: {a:1337, b:9}})}}, 500);
	if (a === 1) invokeMethod("myAgent.myFunction", {a:1}, {}, {b:{destination:"http://localhost:1337/myAgent.js/1", 
						data:{id:3, method:"myFunction", params: {a:1337, b:result}}}}, 500);
	
	console.log("3");
	return a + b + c;
}

//helper functions that wont be accessible from outside:
mul = function(a,b) {
	return a*b;
}


