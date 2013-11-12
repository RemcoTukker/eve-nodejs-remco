
// functions for sending stuff back to the main thread



invokeMethod = function(methodName, params, stateKeys, RPCs, time) {

	console.log("sending invokeMethod event");
	console.log('invokeMethod ' + time + " " + methodName + " " + JSON.stringify(params) + " "  + JSON.stringify(RPCs) + " " + JSON.stringify(stateKeys));
	//parse this nicely in the events that the main thread is listening for
	thread.emit('invokeMethod', time, methodName, JSON.stringify(params), JSON.stringify(stateKeys), JSON.stringify(RPCs));
}

store = function(key, value) {
		
	thread.emit('storeData', key, JSON.stringify(value));
}

// entry point function for invoking agent functions  
// TODO: once we have better error information in the main thread, get rid of the try statements
entryPoint = function(req) {
	
	//check if the method exists from agent.getMethods? 
	try {
		var result = myAgent[req.method](req.params); //perfect / safe? except that we dont know the name of the agent yet...
	} catch (e) {
		console.log("error!" + e.message + " " + e.stack);
		var result = null;
	}
	
	//TODO: check type of result and so on; result = null in case of a void function.. etc...		
	return result;   ///return value is used to send the response to the JSON RPC call

}

//this function loads the agent code that the user wrote. This may facilitate getting stack traces out of the thread.
//If possible (regarding getting useful stack traces), I'ld prefer the user to do a importScripts(agentBase.js) in 
	//their code and do a pool.load(userAgent.js) from the main thread.
// TODO: once we have better error information in the main thread, get rid of this function
loadAgent = function(filename) {
	
	importScripts(filename);
	
	console.log("loaded " + filename);

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



