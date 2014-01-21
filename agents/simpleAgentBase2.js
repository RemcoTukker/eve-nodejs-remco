var simpleAgentBase2 = {
	registerAddresses: function(on, options) {
		//TODO: improve!
		//console.log('tests/myAgent/' + options.instanceNumber);
		if (typeof this.RPCfunctions == "undefined") this.RPCfunctions = {};
		var that = this.RPCfunctions;	
		on('local', 'tests/myAgent/' + options.instanceNumber, function(parsedRPC, callback) {
			//console.log("got the message!");
			that[parsedRPC.method](parsedRPC.params, callback);
		});

		on('http', 'tests/myAgent/' + options.instanceNumber, function(parsedRPC, callback) {

			that[parsedRPC.method](parsedRPC.params, callback);
		});

	},
	
	schedule: function(callback, time) {

		if (time == 0 || (typeof time != "number")) setImmediate(callback);
		else setTimeOut(callback, time);

		//TODO: remembering callback for removing them when removing agent
	}

}

module.exports = simpleAgentBase2;

