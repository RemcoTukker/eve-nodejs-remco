module.exports = LocalRequests;

function LocalRequests(messages, eve, options) {
	
	messages.on('local', function(destination, RPC, callback) {
		messages.emit(destination, RPC, callback);
	});
	
}
