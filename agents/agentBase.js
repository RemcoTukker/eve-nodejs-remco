module.exports = AgentBase;

function AgentBase(agentName, filename, options, serviceFunctions) {

	// initializing some fields that may be useful
	this.filename = filename;
	this.agentName = agentName;
	this.options = options;
	this.RPCfunctions = Object.create(AgentBase.prototype.RPCfunctions);
			// make sure we have our own RPCfunctions object, in case we dynamically want to add functions, 
				//for example with closure of our own agent (such as in the init function)

	//this.send = send;
	this.send = function(destination, message, callback) {
		serviceFunctions.send(destination, message, callback);
	}
	//this.publish = pub;
	this.publish = function(topic, message) {
		serviceFunctions.publish(topic, message);
	}
	

	//wrapper functions to "fix" 'this' keyword in agent callbacks.. convenient, but do we actually really want it? 
	var that = this;	

	this.on = function(protocol, address, callback) {		
		serviceFunctions.on(protocol, address, function() {
				callback.apply(that, arguments);  // TODO: use bind here instead of apply
		});		
	} 

	this.subscribe = function(topic, callback) {
		serviceFunctions.subscribe(topic, function() {
			callback.apply(that, arguments);
		});		
	};

	this.schedule = function(callback, time) {  
		var wrapperFunction = function() { callback.apply(that) }; //TODO fix arguments here, remove first two, pass rest

		if (time == 0 || (typeof time != "number")) setImmediate(wrapperFunction);
		else setTimeOut(wrapperFunction, time);

		// TODO: keep track of timeouts for deleting agent
	};  

	this.registerAddressForRPCs = function(protocol, address) {
		this.on(protocol, address, function(parsedRPC, callback) {
				//TODO: keep track of ID, either insert it in intermediate callback or pass it along to RPC function
			this.RPCfunctions[parsedRPC.method].call(this, parsedRPC.params, callback);
				//We need call or apply here, 'cause otherwise the RPCfunctions object will be the "this"
				// maybe we could also use bind @on, to make this prettier
		});
	}

	//register some addresses
	this.registerAddressForRPCs('local', agentName); 
	this.registerAddressForRPCs('http', agentName);  
	
	//let the user defined stuff happen!
	this.init();
}

//stub in case user decides not to define a constructor; will usually be overwritten
AgentBase.prototype.init = function() {

}

//empty RPCfunctions object for the user to extend
AgentBase.prototype.RPCfunctions = {};


