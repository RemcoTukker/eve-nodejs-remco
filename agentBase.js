
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


var agentBase = {};

// TODO: add standard getMethods, getId, and getUrls functions
// TODO: help users with taking care of these
// TODO: preferably add some sugar functions to allow functions with parameter lists instead of a parameter object


