module.exports = LocalTransport;

function LocalTransport(incoming, options) {

	options = options || {};

	this.name = "local";

	this.outgoing = function(destination, message, sender, callback) {
		setImmediate(incoming(destination, message, callback));  //to make function async, just like other transports? 
		//incoming(destination, message, callback)
	}
	
}
