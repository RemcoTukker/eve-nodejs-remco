module.exports = LocalRequests;

// Maybe we actually want to merge this into one file with the other solution (localRequest2) and make it a optional parameter?

function LocalRequests(messages, eve, options) {

	//monkey patching / replacing eve sendMessage function to include a shortcut for the local messages
	//quite a bit faster than localRequests2.js when only local transports are used (thanks to 1 less event per RPC)

	eve.sendMessage = function(to, RPC, callback) {
		
		var type = to.substr(0,to.indexOf(':'));
		if (type == "local") { 
			messages.emit(to, RPC, callback); // callback may be function or address (?)
		} else {
			messages.emit(type, to, RPC, callback); //callback may be function or address (?)
		}
	};

	
}
