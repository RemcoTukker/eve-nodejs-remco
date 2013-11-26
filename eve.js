/*
TODO:

bugfixes:

regressions:
ID in the JSON RPC reply, fix those properly
in case promise is rejected in RPC call, move reason to error field of JSON RPC reply (in case of local calls); dont bother agent with promises

functionality:
get the line number / stack trace out of the threads to facilitate debugging, go into TAGG for that
its probably best to restart the thread after an uncaught error to prevent mem leaks etc (check if this is done already or not) 
do parameter parsing in the threads to make agent programmers life easier
add extra event listeners to give the thread-side of the agent more of the node functionalities, 
	eg http requests (as this is possible from webworkers too I think?), running external scripts may be useful for AIM, .....
agent management functions node-side
implement some locking mechanisms
Add some flexibility in the scheduling: invoke as soon as possible after scheduled time, or only invoke within a certain time window 
					(eg due to downtime, or due to slow RPC requests, or whatever...)
Also, have a setting that the RPCs / state collection should only start right before an invocation instead of immediately
			(perhaps with a default 100 ms before callback)
Also, make schedule persistent
small suite of test agents (see below)
introduce an onerror for uncaught exceptions, to ensure integrity of files for persistent storage
make node serve some webpages with status information
server-wide notifications / starting / stopping
publish subscribe 

style:
be more consistent in where to apply stringify / parsing, to make it more transparent
let somebody look at this code that knows JS better...
rework persistent storage, its ugly now, 'cause it needs to know the url
make a nice package out of it

optimization:
make seperate event callbacks for the schedule and invoke events to minimize the number of checks and operations per event message
move stuff down to c++ ? (Peet?)
improve data store, perhaps a db?
see if we want a global threadpool with some managing mechanism for keeping the threads around for an optimal time instead of the threadpool per agent
move Agent (and perhaps also dataStore) functions to a prototype to reduce memory footprint ? (at the cost of processing time; maybe not)

stuff to check:
when agent is removed, what happens with already scheduled callbacks?

*/


	//TODO  !!!!! we need stack traces from dying agents!!!! best solution: hack this into TAGG. 
	//                 -1st alternative: add a debug option which lets you evaluate the agent in the main thread
 	//                  eg in a separate node instance from the rest of the agents, or in a child process of node,
	//					or within a try block (child process is probably best, try block kills main thread in case of infinite loop)
	//				   -2nd alternative: before adding the agent, try to load the agent within the main thread 
	//					(in this function). Runtime errors will still be in the dark
	// 			NOTE: runtime errors are already reported back now, although they are less helpful than complete stack traces
	//					(basically what you get when you catch an error) 
	

/*
TODO: Test suite:

Adding agent:
Add a proper agent
Try to add an agent from a non-existent file
Try to add an agent that contains errors

Answering requests:
Proper request
Malformed requests (non parseable JSON RPC, no return ID)
Request from nonexistent agent
Request from agent that doesnt answer atm
Request from method that doenst exist on agent
Request from method with wrong parameters
Request resulting in runtime error at agent

Agent functionality:
...

*/



var http = require('http'),
    url = require('url'),
	request = require('request'),
	Q = require('q'),
	storage = require('node-persist'), 
	Threads = require('webworker-threads'); //webworker threads is better than TAGG ´cause this one lets you do importScripts

//for debugging:
//Q.longStackSupport = true;

var eve = {
	location: {href: undefined, host: undefined, port: undefined}   // will contain server location like "http://host:port"
};

//we have to do this for the persistent storage library
storage.initSync();

//dataStore object that becomes part of the main-thread-side of the agent
eve.DataStore = function(uri) {
	var prefix = uri.replace(/\//g,'');  // workaround for prefix with slash, otherwise fails silently..
	var associativeArray = new Object();

	this.save = function(key, value) {
		//TODO: add more logix here
		associativeArray[key] = value;
		storage.setItem(prefix + key, value); 
	}

	this.recall = function(key) {
		//this probably doesnt need to be more intelligent; or perhaps store the last time this element was accessed? 
		if (key in associativeArray) {
			return associativeArray[key];
		} else {
			return storage.getItem(prefix + key); //undefined if it doesnt exist
		}
	}

	//can be very useful to have this as an atomic operation
	this.recallAndRemove = function(key) {
		if (key in associativeArray) {
			var value = associativeArray[key];
			delete associativeArray[key];
			storage.removeItem(prefix + key);
			return value;
		} else {
			var data = storage.getItem(prefix + key);
			storage.removeItem(prefix + key);
			return data; //undefined in case it wasnt in the persistent storage
		}
	}
}

//object representing main-thread side of agent 
eve.Agent = function(filename, uri, threads) {
	//constructor
	var agentData = new eve.DataStore(uri);
	var acceptingRequests = false;
	
	//save the init parameter for some introspection
	agentData.save("uri", uri); 
	agentData.save("threads", threads); //is this actually relevant? doesnt it change all the time?
	agentData.save("filename", filename);

	//have a thread pool for every agent (because threads-a-gogo requires file to be loaded beforehand; 
	// loading code into threads on the fly is likely not very performant)
	var pool = Threads.createPool(threads); 

	//Q stuff to be used later on, make promise-returning functions out of NodeJS functions with callback
	var evalAny = Q.nbind(pool.any.eval, pool);
	var httpRequestPromise = Q.denodeify(request);
	
	// ******* functions for getting the thread to work for us, entry point of JSON RPCs in the agent **********
	this.requestPromise = function(request) {
		if (!acceptingRequests) {
			console.log("test:");
			return Q.reject("Agent does not accept requests at the moment");
		}
		
		return evalAny("entryPoint(" + request + ")")
		.fail(function(err) {
			console.log("in agent " + uri);
			console.log("function returned with err " + err + " and value " + completionValue);
			console.log("in reply to the following request: " + request);
			console.log("stack trace: " + err.stack);
			return Q.reject("Agent had an internal error: " + err.message);
		});
	}

	// ********* Handlers for events that can be generated in the threads ***************

	// event listener to store something in the state
	pool.on("storeData", function(key, value) {
		agentData.save(key, JSON.parse(value));  //would be nicer to store all data stringified, but we have to parse and stringify it again before sending anyway
	});

	// event listener for invoking other agent methods ("callback over threads")
	pool.on("invokeMethod", function(time, functionName, strParams, strStateKeys, strRPCs) {
		//recall all state that the new function call requires and add the recalled state to the params object
		
		stateKeys = JSON.parse(strStateKeys); //we assembled those things, so we can hopefully assume they get parsed without errors
		RPCs = JSON.parse(strRPCs);

		//console.log("got invokeMethod event");	
		//console.log(time + " " + functionName + " " + strParams + " " + strStateKeys + " " + strRPCs);

		//convert timeout to date
		var executionDate = new Date(); 
		executionDate.setMilliseconds(executionDate.getMilliseconds() + Number(time));

		//build a promise array
		var promiseArray = [];

		for (key in RPCs) {
			//TODO: make sure that we have a valid url in agentBase! Otherwise this comes down crashing
			var dest = url.parse(RPCs[key].destination);
			RPCs[key].arrayNumber = promiseArray.length;

			//if ( ((dest.hostname == "localhost") || (dest.hostname == eve.location.host) ) && (dest.port == eve.location.port) ) {
			if (false) {			
				//console.log("local call "); // to " + dest.pathname + " " + JSON.stringify(RPCs[key].data));  //we have a local request
				RPCs[key].type = "local";
				promiseArray.push(eve.handleRequestPromise({'uri': dest.pathname, 'json': JSON.stringify(RPCs[key].data)}));
			} else {
				//console.log("http call");				//we have a http request
				RPCs[key].type = "remote";				
				promiseArray.push(httpRequestPromise({uri: RPCs[key].destination, method: "POST", json: RPCs[key].data }));
			}
		}

		Q.delay(executionDate - Date.now()).then(function() { 
			Q.allSettled(promiseArray).then( function(RPCarray) {  

				if (functionName == "") return; //TODO: fix this in a nicer way

				console.log(JSON.stringify(RPCarray));

				var RPCresults = {}; //object to send back; only copy actual results in there (we get back a lot more from http request)			
				//TODO: add error information that is missing now.. //TODO: in case of rejected, we should copy the error, not the value..
				for (key in RPCs) {
					var arrayNr = RPCs[key].arrayNumber;
					RPCresults[key] = {};
					RPCresults[key].state = RPCarray[arrayNr].state;  
					if (RPCresults[key].state === "fulfilled") {					
						if (RPCs[key].type === "remote") {
							RPCresults[key].value = RPCarray[arrayNr].value[1];
						} else {  // RPCs[key].type === "local"
							RPCresults[key].value = JSON.parse(RPCarray[arrayNr].value); 
						}
					} else {
						RPCresults[key].reason = RPCarray[arrayNr].reason;
					}
				}

				var state = {};
				for (key in stateKeys) {
					state[key] = agentData.recall(stateKeys[key]); 
				}

				return {'functionName':functionName, 'strParams':strParams, 'strState':JSON.stringify(state), 'strRPCresults':JSON.stringify(RPCresults) };
			})
			.then(function(results) {
				//TODO: should we check if agent is currently accepting requests or not?
				pool.any.eval("invokeCallback(\""+results.functionName+"\","+results.strParams+","+results.strState+","+results.strRPCresults+")");
			})  
			.done();
		})
		.done(); 

	});

	/* management functions */

	this.stop = function() {
		//console.log("rude" + pool.totalThreads());
		acceptingRequests = false;
		pool.destroy(true); //this destroys threads 
	}

	this.blockRequests = function() {
		acceptingRequests = false;
	}

	this.resumeRequests = function() {
		//TODO: only allow if we have a functional threadpool
		acceptingRequests = true;
	}

	this.checkLoad = function() { //I guess this function should be called regularly.. perhaps just let it schedule itself
		var tooFewThreads = pool.pendingJobs();
		var tooManyThreads = pool.idleThreads();
		
		//TODO: keep a rolling average of this information

		//TODO: do something if the rolling averages are too high or low

		//I guess we also need some input from the user: if this agent is very important, keep extra threads around for
		// peak loads. If this agent is not so important, 

		//TODO: perhaps also keep track of threads, if one or more are running too long, get rid of them
	}

	//TODO: agent self-management:
	//create a way to temporarily block incoming messages and answer them with an "out of office" reply, such that we can re-initialize threadpool to:
	// * change the number of threads for this agent 
	// * load a different js file in the threads, for effectively transfering your address to a new agent and for allowing 
	//       modifying code, eg to inject a new function in an agent

	//TODO: stash agent away Jos-style in case it is not used for a while
	// perhaps even let a management agent do this? I really do want somebody to keep track of all messages anyway, for the pwetty
	// graph visualization with moving packages (maybe make it optional if it has performance implications)

	//Finally, load the agent code
	var nrLoaded = 0;

	pool.load(__dirname + "/" + filename, function(err, completionValue) {
		nrLoaded++;		
		if (nrLoaded == 1) {
			if (err != null) {
				console.log("Error: " + __dirname + "/" + filename + " could not be loaded; error: " + err.message + " " + err.stack);				
				var uri = agentData.recall("uri");
				process.nextTick( function() { return remove(uri); }, 1000); 					
			} else {
				console.log("agentBase.js loaded succesfully!");
				acceptingRequests = true;
			}
		} else if (nrLoaded == threads) {
			//pool.all.eval();  //initializer function, give the a priori information (and possibly construction arguments?)
			// add callback function that will do the "once" init parts
		}
	});

}

/* functions for keeping track of all the instantiated agents */

eve.agentList = {};

eve.add = function(filename, options) {
//function add(filename, options) {

	//TODO: check that options.uri and options.threads are of the right type and check that options even exists 
	var options = new Object(); //TODO see how to do this properly

	if (options.threads === undefined) options.threads = 2;  //default value for threads
	
	// see whether we need to assign a uri automatically
	if (options.uri === undefined || (options.uri in eve.agentList)) {

		var number = 1;
		var proposedUri = "/" + filename + "/" + number; //maybe not ideal to use filename here... 
		while (proposedUri in eve.agentList) {
			number++;
			proposedUri = "/" + filename + "/" + number;
		} 
		
		options.uri = proposedUri;
		
	}
	
	eve.agentList[options.uri] = new eve.Agent(filename, options.uri, options.threads);
	
	console.log("Added agent from " + filename + " at " + options.uri + " with " + options.threads + " threads."); 

	return options.uri;
}

//function remove(uri, timeout) { //timeout is for finishing existing threads
eve.remove = function(uri, timeout) {
	if (uri in eve.agentList) {
		eve.agentList[uri].blockRequests(); 
		//TODO: check type of timeout		
		if (timeout === undefined) timeout = 1000;
		setTimeout(function(){ 
			eve.agentList[uri].stop(); 
			delete eve.agentList[uri]; 
			console.log("Removed agent " + uri); 
		}, timeout); 
		console.log("Agent " + uri + " will be removed after " + timeout + " ms.");
	} else {
		console.log("Warning: agent " + uri + " couldnt be removed; doesnt exist.")
		//TODO: see if we can safely do this..		
		//return new Error("Warning: Failed to remove agent at " + uri + "; doesnt exist!");
	}

}

/* functions for handling incoming RPC messages */

eve.handleRequestPromise = function (params) { 

	if (params.uri in eve.agentList) {
		return eve.agentList[params.uri].requestPromise(params.json);
	} else {
		return Q.reject("Agent " + params.uri + " does not exist here at " + eve.location.href + "!");
	}

}

/**
 * Start a server handling the HTTP requests
 * @param {Number} port
 * @param {String} host
 */
eve.listen = function (port, host) {
    eve.location.href = "http://" + host + ":" + port, eve.location.port = port, eve.location.host = host;

    http.createServer(function (req, res) {
        var data = "", pathname = url.parse(req.url).pathname;
        
        req.on("data", function(chunk) { data += chunk; });

        req.on("end", function() {
            console.log("receiving request: " + req.url + data);

			eve.handleRequestPromise({'uri':pathname, 'json':data})
			.then(function(value) {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(value);  
			})
			.fail(function(err) {  //assemble the error message based on rejected promise and request
				parsedRPC = JSON.parse(data);
				if (parsedRPC.id === undefined) {
					res.writeHead(200, {'Content-Type': 'application/json'});
                	res.end(JSON.stringify({id:null, result:null, error:"Please send valid JSON RPCs (include ID); moreover: " + err}));
				} else {
					res.writeHead(200, {'Content-Type': 'application/json'});
                	res.end(JSON.stringify({id:parsedRPC.id, result:null, error:err}));
				}
			})
			.fail(function(err) { //special message in case we couldnt parse the message (most likely..)
				res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({id:null, result:null, error:"Please send valid JSON RPCs only! " + err}));
			}).done(); // if we cannot send a response at all for some reason, just crash the whole server..

        });
    }).listen(port, host);
};


//// test lines here 


Q.delay(1000)
.then(function(value) { 
	eve.handleRequestPromise({'uri':'/myAgent.js/1', 'json':JSON.stringify({id:3, method:'myFunction', params:{a:1, b:3}})  })
	.then(function (value) {
		console.log(value);	
	}, function(err) {
		console.log(err);
	}).done();
})
.done();


setTimeout(function() {return eve.remove("/myAgent.js/1"); }, 2000);

/**
 * nodejs exports
 */
exports.listen = eve.listen;
exports.add = eve.add;

