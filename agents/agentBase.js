
// functions for sending stuff back to the main thread

invokeMethod = function(methodName, params, stateKeys, RPCs, time) {

	//console.log("sending invokeMethod event");
	//console.log('invoking Method: ' + time + " " + methodName + " " + JSON.stringify(params) + " "  + JSON.stringify(RPCs) + " " + JSON.stringify(stateKeys));
	//parse this nicely in the events that the main thread is listening for

	//TODO: check if the urls in the RPCs are valid (can be parsed by url), otherwise eve comes crashing down
	thread.emit('invokeMethod', time, methodName, JSON.stringify(params), JSON.stringify(stateKeys), JSON.stringify(RPCs));
}

store = function(key, value) {
		
	thread.emit('storeData', key, JSON.stringify(value));
}

// entry point function for invoking agent functions  
// TODO: once we have better error information in the main thread, get rid of the try statements
entryPoint = function(req) {
	
	//check if the method exists from agent.getMethods?
	var result = null;
	var err = null;
 
	try {
		var result = myAgent[req.method](req.params); //perfect / safe? except that we dont know the name of the agent yet...
	} catch (e) {
		console.log("error! " + e.message + " " + e.stack);
		//throw new Error("error! " + e.message);
		var err = e.message;
	}
	
	//TODO: check type of result and so on; result = null in case of a void function.. etc...		
	return JSON.stringify({'result':result, 'id':req.id, 'error':err });   ///return value is used to send the response to the JSON RPC call

}

invokeCallback = function(methodName, params, state, RPCresults) {
	
	//console.log("invoking callback function " + methodName);

	//try to combine params, state and RPCresults in one object
	for (var key in state) {
		params[key] = state[key]; 
	}
	//console.log("RPCresults: " + JSON.stringify(RPCresults));
	for (var key in RPCresults) {
		//if (RPCresults.error == null) {
			params[key] = RPCresults[key].result; 
		//} else {
		//	params[key] = undefined; //TODO: do we need more intelligent stuff in case of an error?
		//}
		//console.log("RPC: " + key + " " + params[key]);
	}

	//remove the myAgent. from beginning of method name, if it is there
	if ("myAgent" ===  methodName.substr(0, methodName.indexOf('.'))) {
		methodName = methodName.substr(methodName.indexOf('.') + 1, methodName.length);
	}

	try {
		var result = myAgent[methodName](params); //perfect / safe? except that we dont know the name of the agent yet...
	} catch (e) {
		console.log("error!" + e.message + " " + e.stack);
		var result = null;
	}

	return result; 
} 

initAll = function(data) {
	myAgent.initAll(data);
}

initOnce = function() {
	myAgent.initOnce();
}

var agentBase = {};

agentBase.initAll = function(params) {
	console.log("agentBase initAll function executed");
}

agentBase.initOnce = function() {
	console.log("agentBase initOnce function executed");
}

// TODO: add standard getMethods, getId, and getUrls functions
// TODO: help users with taking care of these
// TODO: preferably add some sugar functions to allow functions with parameter lists instead of a parameter object


