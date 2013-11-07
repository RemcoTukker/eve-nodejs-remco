

// functions for sending stuff back to the main thread

invokeMethod = function(methodName, params, stateKeys, time) {

	console.log("sending invokeMethod event");
	console.log('invokeMethod ' + time +" "+ methodName+" " + JSON.stringify(params)+" " + JSON.stringify(stateKeys));
	//parse this nicely in the events that the main thread is listening for
	thread.emit('invokeMethod', time, methodName, JSON.stringify(params), JSON.stringify(stateKeys));
}
	
send = function(destination, data) {
		
	thread.emit('sendEveMessage', destination, JSON.stringify(data));
}

store = function(key, value) {
		
	thread.emit('storeData', key, JSON.stringify(value));
}


function agentBase() { //encapsulates all basic functionality that the agent can use
	


	

	//thread.on(...)  //we're not sending any events from the main thread to here, so we dont have to listen...

	// obligatory methods 
	// TODO: help users with taking care of these
	this.getMethods = function() {  ///TODO: preferably add some sugar functions to allow functions with parameter lists instead of a parameter object

	}

	this.getId = function() {

	}

	this.getUrls = function() {

	}



}


// end user generated code example


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
	
	console.log("2");

	invokeMethod("myAgent.myFunction", {a:1}, {b:"result"}, 1);
	
	console.log("3");
	//return a + b;
}

