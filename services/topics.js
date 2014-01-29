
var EventEmitter2 = require('eventemitter2').EventEmitter2;


module.exports = Topics;


function Topics(eve, options, addServiceFunction) {

	var topics = new EventEmitter2({
		//delimiter: '::',  		// the delimiter used to segment namespaces, defaults to `.`.
		newListener: true, 			// if you want to emit the newListener event set to true.
		maxListeners: 10000,		// max listeners that can be assigned to an event, default 10.
		wildcard: true 				// use+ wildcards.
	});

	addServiceFunction('publish', function(topic, message) {

		if (typeof message != "object") {
			console.log("Publishing failed: tried to publish a non-object");
			return;
		}
		
		Object.freeze(message); //make sure the subscribers dont change the message, would turn out very messy
		topics.emit(topic, message);
		
	});

	addServiceFunction('subscribe', function(topic, callback) {

		topics.on(topic, callback);

	});



}


