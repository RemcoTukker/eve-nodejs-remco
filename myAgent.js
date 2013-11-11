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

	//invokeMethod("myAgent.myFunction", {a:1}, {b:"result"}, 1);
	
	console.log("3");
	return a + b + c;
}
