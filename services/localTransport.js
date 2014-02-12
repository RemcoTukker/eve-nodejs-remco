module.exports = LocalTransport;

function LocalTransport(incoming, options) {

	options = options || {};

	this.name = "local";

	this.outgoing = function(destination, message, sender, callback) {
		incoming(destination, message, callback);
	}
	
}
