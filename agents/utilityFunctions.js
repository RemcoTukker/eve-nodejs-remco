module.exports = utilities;

function utilities(newAgent, agentName, filename, options, serviceFunctions ) {

		// initializing some fields that may be useful
		newAgent.filename = filename;
		newAgent.agentName = agentName;
		newAgent.options = options;
		//newAgent.RPCfunctions = Object.create(AgentBase.prototype.RPCfunctions);
				// make sure we have our own RPCfunctions object, in case we dynamically want to add functions, 
					//for example with closure of our own agent (such as in the init function)

		//this.send = send;
		newAgent.send = function(destination, message, callback) {
			serviceFunctions.send(destination, message, callback);
		}
		//this.publish = pub;
		newAgent.publish = function(topic, message) {
			serviceFunctions.publish(topic, message);
		}
	

		
		newAgent.on = function(protocol, address, callback) {		
			serviceFunctions.on(protocol, address, function() {
					callback.apply(newAgent, arguments);  // TODO: use bind here instead of apply
			});		
		} 

		newAgent.subscribe = function(topic, callback) {
			serviceFunctions.subscribe(topic, function() {
				callback.apply(newAgent, arguments);
			});		
		};

		newAgent.schedule = function(callback, time) {  
			var wrapperFunction = function() { callback.apply(newAgent) }; //TODO fix arguments here, remove first two, pass rest

			if (time == 0 || (typeof time != "number")) setImmediate(wrapperFunction);
			else setTimeOut(wrapperFunction, time);

			// TODO: keep track of timeouts for deleting agent
		};  

		newAgent.registerAddressForRPCs = function(protocol, address) {
			newAgent.on(protocol, address, function(parsedRPC, callback) {
					//TODO: keep track of ID, either insert it in intermediate callback or pass it along to RPC function
				newAgent.RPCfunctions[parsedRPC.method].call(newAgent, parsedRPC.params, callback);
					//We need call or apply here, 'cause otherwise the RPCfunctions object will be the "this"
					// maybe we could also use bind @on, to make this prettier
			});
		}

		//register some addresses
		newAgent.registerAddressForRPCs('local', agentName); 
		newAgent.registerAddressForRPCs('http', agentName);  


}

