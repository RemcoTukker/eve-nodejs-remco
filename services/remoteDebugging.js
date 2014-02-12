var io = require('socket.io').listen(8090); 
// TODO possibly use an existing http server (maybe move this to http file)
// TODO make it possible to listen only to particular event types / levels to prevent flooding

'use strict';

module.exports = RemoteDebugging;


function RemoteDebugging(eve, options, addServiceFunction) {
	
	var debugsockets = io.of('/debug').on('connection', function(socket) {

		// send some initial info
		//var nameArray = eve.listAgents();
		//socket.emit('CurrentState', { nameArray: nameArray }); // emit list of agents names

		socket.on('StateRequest', function () {
			var nameArray2 = eve.listAgents();
			socket.emit('CurrentState', { nameArray: nameArray }); // emit list of agents names
		});

	});

	// we're only extending the original evedebug to also send a message over a socket
	var originalDebug = evedebug;
	evedebug = function(topic, message) {

		//TODO: check if we have to save up messages and only send once in a while
		//      the number of messages may become quite big..

		debugsockets.emit(topic, {message: message});

		originalDebug(topic, message);		

	}
}
