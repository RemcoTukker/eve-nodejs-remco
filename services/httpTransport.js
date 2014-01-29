var http = require('http'),
    url = require('url'),
	request = require('request');

module.exports = HttpTransport;

	/**
	 * Start a server handling the HTTP JSON RPC requests
	 * @param {Number} port
	 * @param {String} host
	 */


function HttpTransport(incoming, options) {
	
	options = options || {}; //TODO: add default config

	this.name = "http";

	// for outbound requests, the request module
	this.outgoing = function(destination, message, callback) {
		request({uri: destination, method: 'POST', json: message}, function(error, response, body) {
			//TODO: do we want to reply something when an error happened? Or just fail silently?
			callback(body); 
		});
	}

	// for inbound requests, a http server
    http.createServer(function (req, res) {
        var pathname = url.parse(req.url).pathname;
		var prefix = pathname.split('/')[1];

		//if (prefix == 'agents') { //agent request, route to agents //TODO see if we want to use such a prefix or not / make it optional

			var data = "";
		    req.on("data", function(chunk) { data += chunk; });

		    req.on("end", function() {

				try {
					var parsedRPC = JSON.parse(data);
					var eventName = "http." + pathname;

					incoming("http:/" + req.url, parsedRPC, function(reply) {
						res.writeHead(200, {'Content-Type': 'application/json'});
		            	res.end(JSON.stringify(reply));
					});
	
				} catch(err) { //probably message couldnt be parsed
					res.writeHead(200, {'Content-Type': 'application/json'});
		            res.end(JSON.stringify({id:null, result:null, error:"Unkown error, are you sure you sent a valid JSON RPC? " + err}));
				}
		    });

		//} else {  //try to route the request to one of our webpages
		//	var now = new Date();
  		//	var html = "<p>Hello World, in case you want more functionality on webpages, simply embed eve in an express server.</p>"; 
 		//	res.end(html);
		//}
    }).listen(options.port, options.host);

	//TODO: maybe add some notification that this service is up and running

}


