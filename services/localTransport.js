module.exports = LocalTransport;

function LocalTransport(incoming, options) {

	options = options || {};

	this.name = "local";

	this.outgoing = function(destination, message, callback) {
		incoming(destination, message, callback);
	}
	
}
