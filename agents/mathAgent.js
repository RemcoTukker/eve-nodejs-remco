
var myAgent = {RPCfunctions: {}};

myAgent.init = function() {
	
	this.registerAddressForRPCs('http', "agents/" + this.agentName);  

	// no further init necessary
	console.log("mathAgent added");
}

myAgent.RPCfunctions.add = function (params, callback) {
    callback({id: 0, result: params.a + params.b, error:null });
};


myAgent.RPCfunctions.sum = function(params, callback) {
    if (params.values === undefined) {
        callback({id: 0, result: null, error:"Parameter 'values' missing" }); 
        return;
    }
    if (!(params.values instanceof Array)) {
        callback({id: 0, result: null, error:"Parameter 'values' must be an Array" }); 
        return;
    }

    var total = 0;
    for (var p = 0, pMax = params.values.length; p < pMax; p++) {
        total += params.values[p];
    }

    callback({id: 0, result: total, error: null});

};

myAgent.RPCfunctions.indirectAdd = function(params, callback) {
	// just a function to see whether http transport is still working correctly when using an external http server

	this.send("http://127.0.0.1:3000/agents/" + this.agentName,  ///hrmm... prefix?
						{method:"add", id:0, params: {a: params.a, b: params.b} }, 
						function(answer){ callback(answer); }); //dont have to do anything with the answer... we're just pushing the result


};

var AgentBase = require("./agentBase2.js");  // requiring the factory that will wrap a constructor function around our code
module.exports = AgentBase(myAgent);


