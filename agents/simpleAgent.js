module.exports = SimpleAgent;

function SimpleAgent(on, send, filename, options ) {

	//options.addresses //check if some addresses were already reserved for us

	//otherwise try to reserve some address

/*	var number = 1;
	var proposedUri = "local.simpleAgent." + number; //maybe not ideal to use filename here... 
	while (messages.listeners(proposedUri).length > 0) {
		number++;
		proposedUri = "local.simpleAgent." + number;
	}
*/

	var timestep = 0;
	var n = options.id;
	var living = (Math.random() < .5);
	var neighbours = [];
	var gr = options.grid;

	if (n >= gr) neighbours.push(n-gr); //upper neighbour
	if (n < (gr*gr - gr)) neighbours.push(n+gr); //lower neighbour
	if (n % gr != 0) neighbours.push(n-1); //left neighbour
	if (n % gr != (gr - 1)) neighbours.push(n+1); //right neighbour
	if ((n >= gr) && (n % gr != 0)) neighbours.push(n-gr-1); //upper left
	if ((n >= gr) && (n % gr != (gr-1))) neighbours.push(n-gr+1); //upper right
	if ((n < (gr*gr - gr)) && (n % gr != 0)) neighbours.push(n+gr-1); //lower left
	if ((n < (gr*gr - gr)) && (n % gr != (gr-1))) neighbours.push(n+gr+1); //lower right

	var notifications = [];
	var result = [];
	for (var i = 0; i < options.maxtimesteps; i++) {
		notifications[i] = 0;
		result[i] = 0;
	}

	//console.log(n + " " + JSON.stringify(neighbours));

	this.broadcast = function(curtimestep, curliving) {
		for (var i = 0; i < neighbours.length; i++) {
			send("local://tests/myAgent/" + neighbours[i], {living: curliving, timeStep:curtimestep, from:n}, function(answer){
				//dont have to do anything... just pushing the result
			});
		}
	};
	var that = this;

	on('local', 'start', function(parsedRPC, callback) {
		//console.log("got start message");
		that.broadcast(timestep, living);
	});

	on('local', 'tests/myAgent/' + n, function(parsedRPC, callback) {
		//console.log(n + " " + parsedRPC.from + " " + parsedRPC.timeStep + " " + notifications[parsedRPC.timeStep] + " " + result[parsedRPC.timeStep] + " " +  neighbours.length); 
				
		notifications[parsedRPC.timeStep]++;
		result[parsedRPC.timeStep] += parsedRPC.living;
		callback({ok:"thanks"});
				//NB: we _need_ nexttick here, because other we may do timestep++ before 
				//     we actually sent out the result of the current timestep
		if (notifications[parsedRPC.timeStep] == neighbours.length) process.nextTick(function() {
			//console.log(n + " gots everything @timestep " + timestep );			
			if (result[timestep] == 3) living = true;
			if (result[timestep] < 2 || result[timestep] > 3) living = false;
			timestep++;
			if (timestep == options.maxtimesteps) {
				if (n == 0) { 
					console.log("reached " + options.maxtimesteps + " timesteps");
					console.timeEnd('run');
				}
				return;
			}
			that.broadcast(timestep, living);
			
		});
	});

/*
	//grab some address
	on('local','tests/myAgent/1', function(parsedRPC, callback) {
		callback(5);
	});

	on('http', 'agents/tests/myAgent/1', function(parsedRPC, callback) {

		send("local://tests/myAgent/1", {bla:3}, function(answer){
			
			send("http://localhost:1337/agents/tests/myAgent/2", {tsja:2}, function(answer2) {
				callback("hi"+answer+answer2);

			} );			
		});

		

		console.log(parsedRPC);
		
	});

	on('http', 'agents/tests/myAgent/2', function(parsedRPC, callback) {
		console.log(parsedRPC);
		callback(4);
	});
*/	


	/*
	 * 	Obligatory Eve methods
  	 */

	this.getUrls = function() {
		//return array of strings
	};

	this.getId = function() {
		//kind of nonsense function, we dont have IDs in here
	};	

	this.getMethods = function() {
/*
		var res = [];		
		for (var methodName in this) {
			if (typeof this[methodName] === "function") {
				var methodDescription = {method:methodName, params: [{name:'test', type:'int', required:'false'}], resulttype: 'int'};
				res.push(methodDescription);
			}
		}
*/
	};

}


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


