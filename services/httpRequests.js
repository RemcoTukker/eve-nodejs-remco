var request = require('request');

module.exports = HttpRequests;

/*
 * This sevice can be used by agents for doing JSON RPCs over HTTP
*/

function HttpRequests(messages, options) {

	messages.on('httpRequest', function(destination, origin, RPC) {
		request({uri: destination, method: 'POST', json: JSON.stringify(RPC)}, function(error, response, body) {
			//TODO: add proper checks and warnings

			messages.emit(origin, 'RPCreply', body);

			//callback(response); 
			//TODO: callback or event?!?! callback would keep reference to object and possibly keep object alive; do we want that? dont think so
		});


		/*
			do we want to make this separation here? see discussion point: do we want to allow agent to have different behavior on different transport layers?

			//first find out whether we have a local request or a http request:
	if ( ((dest.hostname == "localhost") || (dest.hostname == eve.location.host) ) && (dest.port == eve.location.port) ) {
		console.log("local call "); // to " + dest.pathname + " " + JSON.stringify(RPCs[key].data));  //we have a local request

		return eve.requestRelayPromise({'uri': dest.pathname, 'json': JSON.stringify(RPC.data)})
		.then(function(val) {
			return JSON.parse(val);
		}, function(err) {
			//TODO: add a check on id and give extra complaint in case its undefined
			return {id: RPC.data.id, result: null, error: err }; //do we need a toString or something?
		});

	} else {
		console.log("http call");				//we have a http request
		var httpRequestPromise = Q.denodeify(request);
	
		return httpRequestPromise({uri: RPC.destination, method: "POST", json: RPC.data })
		.then(function(val) {
			return val[1]; //this should be the JSON RPC reply
		}, function(err) {
			//TODO: add a check on id and give extra complaint in case its undefined   //if (RPC.json.id === undefined) or typeof or something..
			return {id: RPC.data.id, result: null, error: err }; //do we need a toString or something?
		});
	}


		*/

	});


}

