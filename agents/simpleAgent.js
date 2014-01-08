module.exports = SimpleAgent;



function SimpleAgent(messages, topics, options) {

	//options.addresses //check if some addresses were already reserved for us

	//otherwise try to reserve some address
	var number = 1;
	var proposedUri = "local.simpleAgent." + number; //maybe not ideal to use filename here... 
	while (messages.listeners(proposedUri).length > 0) {
		number++;
		proposedUri = "local.simpleAgent." + number;
	}

	messages.on(proposedUri, function(type, content) {
		
	});	

	//check which transport layers are available here...
	//topics.listeners('services.transport.*'); 


	//once we have some address, register listeners functions

	messages.on('http./agents/tests/myAgent.js/1', function(parsedRPC, callback) {

		console.log(parsedRPC);
		callback("hi");
	});


	messages.on('http./agents/tests/myAgent.js/2', function(type, parsedRPC) {

		console.log(parsedRPC);
		
	});


	//see if we can do an RPC call to ourselves...
	setTimeout(function() {
		messages.emit('httpRequest', 'http://127.0.0.1:1337/agents/tests/myAgent.js/1', 'http./agents/tests/myAgent.js/2', {req: "bla"});
		console.log("request sent");
	
	}, 2000);
	
	

}


