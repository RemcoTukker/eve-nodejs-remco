module.exports = LocalTransport;

// Maybe we actually want to merge this into one file with the other solution (localRequest2) and make it a optional parameter?

function LocalTransport(incoming, options) {

	options = options || {};

	this.name = "local";

	this.outgoing = function(destination, message, callback) {
		//console.log("send! " + destination  + message);
		incoming(destination, message, callback);
	}
	
}
