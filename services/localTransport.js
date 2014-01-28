module.exports = LocalTransport;

// Maybe we actually want to merge this into one file with the other solution (localRequest2) and make it a optional parameter?

function LocalTransport(eve, options) {

	options = options || {};

	eve.registerTransport('local', function(to, msg, callback) {
		eve.incomingMessage(to, msg, callback);
	});
	
}
