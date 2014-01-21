var request = require('request');

module.exports = HttpRequests;

/*
 * This sevice can be used by agents for doing JSON RPCs over HTTP
*/

/*
	TODO:
	Add proper checks and warnings
	Check whether we want the reply to call a callback (like now), or emit an event, moving the callback system down to the agent (cleaner?)
			Performance hit of extra emitted events shouldnt be an issue at this rate...
	Check performance of this this and of the http server; seems to work a factor 5-10 slower than would be reasonable 
		(like 100 requests per second)
**/

function HttpRequests(messages, eve, options) {

	messages.on('http', function(destination, RPC, callback) {
		//console.log("doing http request to " + destination);
		request({uri: destination, method: 'POST', json: RPC}, function(error, response, body) {
			callback(body); 
		});

	});

}

