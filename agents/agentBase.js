module.exports = AgentBase;

function AgentBase(on, send, sub, pub, filename, options) {

	// initializing some fields that may be useful
	this.filename = filename;
	this.options = options;
	this.RPCfunctions = Object.create(AgentBase.prototype.RPCfunctions);
			// make sure we have our own RPCfunctions object, in case we dynamically want to add functions, 
				//maybe with closure of our own agent (such as in the init function)

	this.send = send;
	this.publish = pub;
	
	//wrapper functions to "fix" 'this' keyword in agent callbacks.. convenient, but do we actually really want it? 
	var that = this;	

	this.on = function(protocol, address, callback) {		
		on(protocol, address, function() {
			callback.apply(that, arguments);
		});
	} 

	this.subscribe = function(address, callback) {
		sub(address, function() {
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
			this.RPCfunctions[parsedRPC.method].call(this, parsedRPC.params, callback);
				//We need call or apply here, 'cause otherwise the RPCfunctions object will be the "this"
				// maybe we could also use bind @on, to make this prettier
		});
	}

	//register some addresses
	//TODO: fix this better! Maybe use the names that the user supplies?
	this.registerAddressForRPCs('local', 'tests/myAgent/' + options.instanceNumber);
	this.registerAddressForRPCs('http', 'tests/myAgent/' + options.instanceNumber);

	//let the user defined stuff happen!
	this.init();
}

//stub in case user decides not to define a constructor; will usually be overwritten
AgentBase.prototype.init = function() {

}

//empty RPCfunctions object for the user to extend
AgentBase.prototype.RPCfunctions = {};

