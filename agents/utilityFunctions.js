module.exports = utilities;

//TODO: most of the work done in this function shouldnt be necessary / explicit at all, 
// defining and loading a service should be enough to let an agent use them!


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
				// TODO: keep track of callbacks for deleting agent
		}
		//this.publish = pub;
		newAgent.publish = function(topic, message) {
			serviceFunctions.publish(topic, message);
		}
	

		
		newAgent.on = function(protocol, address, callback) {		
			serviceFunctions.on(protocol, address, function() {
					callback.apply(newAgent, arguments);  // TODO: use bind here instead of apply
			});	
			//TODO: keep track of callbacks for deleting agent
		} 

		newAgent.subscribe = function(topic, callback) {
			serviceFunctions.subscribe(topic, function() {
				callback.apply(newAgent, arguments);
			});		
			//TODO: keep track of callbacks for deleting agent
		};

		// TODO fix this up
		newAgent.schedule = function(callback, time) {  
			//var wrapperFunction = function() { callback.apply(newAgent) }; //TODO fix arguments here, remove first two, pass rest

			if (time == 0 || (typeof time != "number")) {
				 setImmediate(function() { callback.apply(newAgent) }); 
			} else {
				setTimeout(function() { callback.apply(newAgent) }, time); //TODO: something goes wrong here
			}

			// TODO: keep track of timeouts for deleting
		};  

		newAgent.registerAddressForRPCs = function(protocol, address) {
			newAgent.on(protocol, address, function(parsedRPC, callback) {
					// TODO: rename this to register or get rid of it completely
					//TODO: keep track of ID, either insert it in intermediate callback or pass it along to RPC function
				var wrappedCallback = function(reply) {
					reply.id = parsedRPC.id;
					callback(reply);
				};
				newAgent.RPCfunctions[parsedRPC.method].call(newAgent, parsedRPC.params, wrappedCallback);
					//We need call or apply here, 'cause otherwise the RPCfunctions object will be the "this"
					// maybe we could also use bind @on, to make this prettier
			});
		}

		//register some addresses

		// TODO: move this to a more logical place..
		newAgent.registerAddressForRPCs('local', agentName); 
		newAgent.registerAddressForRPCs('http', "agents/" + agentName);  
		

}


