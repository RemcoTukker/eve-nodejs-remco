var request = require('request');

module.exports = HttpRequests;

/*
 * This sevice can be used by agents for doing JSON RPCs over HTTP
*/

/*
	TODO:
	Add proper checks and warnings
	Check whether we want the reply to call a callback (like now), or emit an event, moving the callback system down to the agent (cleaner?)

**/

function HttpRequests(messages, eve, options) {

	messages.on('http', function(destination, RPC, callback) {
		//console.log("doing http request to " + destination);
		request({uri: destination, method: 'POST', json: RPC}, function(error, response, body) {
			callback(body); 
		});

	});


}

