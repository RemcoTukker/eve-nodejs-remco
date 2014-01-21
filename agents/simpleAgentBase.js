module.exports = SimpleAgentBase;

function SimpleAgentBase(on, send, filename, options ) {

	this.RPCfunctions = {};

	// do stuff, such as registering addresses for RPCs


	//options.addresses //check if some addresses were already reserved for us

	//otherwise try to reserve some address

/*	var number = 1;
	var proposedUri = "local.simpleAgent." + number; //maybe not ideal to use filename here... 
	while (messages.listeners(proposedUri).length > 0) {
		number++;
		proposedUri = "local.simpleAgent." + number;
	}
*/
	//TODO: improve!
	var that = this.RPCfunctions;	
	on('local', 'tests/myAgent/' + options.instanceNumber, function(parsedRPC, callback) {
		that[parsedRPC.method](parsedRPC.params, callback);
	});

	on('http', 'tests/myAgent/' + options.instanceNumber, function(parsedRPC, callback) {

		that[parsedRPC.method](parsedRPC.params, callback);
	});



	/*
	 * 	Obligatory Eve methods
  	 */
	this.RPCfunctions.getUrls = function(parameters, callback) { 
		//return array of strings
	};
	this.RPCfunctions.getId = function(parameters, callback) {
		//kind of nonsense function, we dont have IDs in here.. hrm maybe name?
	};	
	this.RPCfunctions.getMethods = function(parameters, callback) {
		//var res = [];		
		//for (var methodName in this) {
		//	if (typeof this[methodName] === "function") {
		//		var methodDescription = {method:methodName, params: [{name:'test', type:'int', required:'false'}], resulttype: 'int'};
		//		res.push(methodDescription);
		//	}
		//}
	};

	this.registerToTopic = function(topicName, callback) {
		on('local', topicName, callback);
		//on('local', topicName, this[callback]);
	};
	
	this.schedule = function(callback, time) {
		//setTimeOut / setImmediate + remembering callback for removing them when removing agent
	};

	// function that may become useful if we want to set more options
	this.setRPCfunction = function(name, RPCfunction) {
		this.RPCfunctions[name] = RPCfunction;
	};

	// if user defined some init function, execute it
	if (typeof this.init == "function") this.init(options, send, this.registerToTopic, this.setRPCfunction, this.schedule);

}
