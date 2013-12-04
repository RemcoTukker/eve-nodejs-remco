/*
TODO:

functionality:
Developing agent system: get the line number / stack trace out of the threads to facilitate debugging (see below), do parameter parsing in the threads to make agent programmers life easier
	publish subscribe, init functions in agent, add init parameters that are passed to the agent on construction
General: extra event listeners to give the thread-side of the agent more of the node functionalities (http requests, starting external processes, ...), finish management agent
Scheduling: Add some flexibility (time windows, relative timing RPCs and callback), add persistency
Stability: introduce an onerror for uncaught exceptions (for integrity of files, etc), add typechecking everywhere it could go wrong

style:
prettier comments and function descriptions
let somebody look at this code that knows JS better...
rework persistent storage, its ugly now, 'cause it needs to know the url
parse / stringify consistently

optimization:
only parse / stringify when necessary
make seperate event callbacks for the schedule and invoke events to minimize the number of checks and operations per event message
move stuff down to c++ ? (Peet?)
improve data store, perhaps a db?
see if we want a global threadpool with some managing mechanism for keeping the threads around for an optimal time instead of the threadpool per agent
move Agent (and perhaps also dataStore) functions to a prototype to reduce memory footprint ? (at the cost of processing time; maybe not)

stuff to check:
when agent is removed, what happens with already scheduled callbacks?
perhaps give users a choice to do remote management over JSON RPC, or default it to off
threads are restarted after uncaught errors? Should be done to prevent mem leaks and so on..
how do threadpools behave on destruction? Do we even need to destroy them explicitly?
is the platform still reasonably safe?

related work:
eve frontend to use eve in an express server and couple UIs to agents (think about security here at some point)
build browser-side agent environment

finally:
evaluate threading model, maybe we want to change it to single threaded agents..
see if we want to add some sort of authentication model

*/


	//TODO  !!!!! First and foremost, we need stack traces from dying agents!!!! best solution: hack this into TAGG. 
	//                 -1st alternative: add a debug option which lets you evaluate the agent in the main thread
 	//                  eg in a separate node instance from the rest of the agents, or in a child process of node,
	//					or within a try block (child process is probably best, try block kills main thread in case of infinite loop)
	//				   -2nd alternative: before adding the agent, try to load the agent within the main thread 
	//					(in this function). Runtime errors will still be in the dark
	// 			NOTE: runtime errors are already reported back now, although they are less helpful than complete stack traces
	//					(basically what you get when you catch an error) 


/**
 *
 * Initialization
 *
 */

var http = require('http'),
    url = require('url'),
	request = require('request'),
	Q = require('q'),
	storage = require('node-persist'), 
	Threads = require('webworker-threads'); //webworker threads is better than TAGG ´cause this one lets you do importScripts

var eve = {};  // initialize namespace 
eve.location = {href: undefined, host: undefined, port: undefined} //will contain server location like "http://host:port"
eve.agentList = {}; //this object will hold all agents

storage.initSync(); //we have to do this for the persistent storage library

//Q.longStackSupport = true; //for debugging:

/**
 *
 * functions for agents
 *
 */

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
eve.Agent = function(filename, uri, threads, initState, initStatics) {
	//constructor
	var agentData = new eve.DataStore(uri);
	var acceptingRequests = false;
	
	//save the init parameter for some introspection
	agentData.save("uri", uri);
	agentData.save("threads", threads); //is this actually relevant? doesnt it change all the time?
	agentData.save("filename", filename);
	//TODO: save the initState

	//have a thread pool for every agent (because threads-a-gogo requires file to be loaded beforehand; 
	// loading code into threads on the fly is likely not very performant)
	var pool = Threads.createPool(threads); 

	//Q stuff to be used later on, make promise-returning functions out of NodeJS functions with callback
	var evalAny = Q.nbind(pool.any.eval, pool);
	
	// ******* functions for getting the thread to work for us, entry point of JSON RPCs in the agent **********
	this.requestDeliveryPromise = function(request) {
		if (!acceptingRequests) {
			console.log("test:");
			return Q.reject("Agent does not accept requests at the moment");
		}

		return evalAny("entryPoint(" + request + ")")
		.fail(function(err) {
			console.log("Error! In agent " + uri + ", function returned with err " + err + " and value " + completionValue);
			console.log("in reply to the following request: " + request + "; stack trace: " + err.stack);
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
		//console.log("got invokeMethod event");	
		//console.log(time + " " + functionName + " " + strParams + " " + strStateKeys + " " + strRPCs);
		
		var stateKeys = JSON.parse(strStateKeys); //we assembled those things, so we can hopefully assume they get parsed without errors
		var RPCs = JSON.parse(strRPCs);

		//convert timeout to date
		var executionDate = new Date(); 
		executionDate.setMilliseconds(executionDate.getMilliseconds() + Number(time));

		

		Q.delay(executionDate - Date.now()).then(function() { //TODO: add some flexibility in timing
			//build a promise array
			var promiseArray = [];
			for (key in RPCs) {
				RPCs[key].arrayNumber = promiseArray.length;
				promiseArray.push(eve.requestSendPromise(RPCs[key]));
			}		
	
			Q.allSettled(promiseArray).then( function(RPCarray) {  
				
				if (functionName == "") return; //TODO: fix this in a nicer way

				var RPCresults = {}; //copy over RPC results
				for (key in RPCs) {
					var arrayNr = RPCs[key].arrayNumber;
					RPCresults[key] = RPCarray[arrayNr].value;
				}

				var state = {};  //copy over state recall results
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

	/* agent management functions */

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
	var loadError = false;
	pool.load(__dirname + "/" + filename, function(err, completionValue) {  //cannot really use Q here, 'cause this callback is called multiple times... welcome pyramid of doom
																			// (maybe we should make our own threadpool implementation to fix this and perhaps some other stuff too)
		nrLoaded++;		
		if ((err != null) && (loadError == false)) {
			console.log("Error during loading of: " + __dirname + "/" + filename + "; error: " + err.message + " " + err.stack);
			process.nextTick( function() { return eve.agentList["/agents/management"].removeAgent(uri); }, 1000); 					
			loadError = true;
		}

		if ((nrLoaded == threads) && (loadError == false)) {
			//console.log("agentBase.js loaded succesfully!");
			
			// proceed to initAll
			var nrInit = 0;

			pool.all.eval("initAll(" + JSON.stringify(initStatics) + ")", function(err, value) {  //TODO stringify can fail
				nrInit++;
				if ((err != null) && (loadError == false)) {
					console.log("Error during initAll of: /" + filename + "; error: " + err.message + " " + err.stack);
					process.nextTick( function() { return eve.agentList["/agents/management"].removeAgent(uri); }, 1000); 					
					loadError = true;
				}

				if ((nrInit == threads) && (loadError == false)) {
					//console.log("InitAll succeeded");

					// then open up for requests
					acceptingRequests = true;

					// then do the init once function
					pool.any.eval("initOnce()", function(err, value) {
						if (err != null) {
							console.log("Error during initOnce of: /" + filename + "; error: " + err.message + " " + err.stack);
							process.nextTick( function() { return eve.agentList["/agents/management"].removeAgent(uri); }, 1000);
						} else {
							//console.log("Initialization sequence completed by agent: /" + filename );
						}
					});
				}
			});
		}
	});

}

/**
 *
 * Server management functions, wrapped in an agent for remote management
 *
 */

eve.agentList["/agents/management"] = {
	requestDeliveryPromise: function(request) {  //should this function be async to line up with normal agents function?
		//parse request

		//do useful stuff, such as sending back stuff
	
		//return a promise
		
	},

	//TODO: see how to handle building a network and do the pretty moving package view in the browser
	//TODO: see if we want to give agent details from here or from the agent itself

	removeAll: function() {
		for (agent in eve.agentList) {
			//agent.
		}
		
	},

	pauseAll: function() {
		for (agent in eve.agentList) {
			agent.blockRequests();
		}
	},

	resumeAll: function() {
		for (agent in eve.agentList) {
			agent.resumeRequests();
		}
	},

	notifyAll: function() {
		//TODO: see how actually to do this; make a stub in in AgentBase?
	},

	serverStatus: function() {

	},

	listAgents: function() {

	},

	pauseAgent: function(uri) {

	},

	resumeAgent: function(uri) {

	},

	setAddress: function (port, host) {
		eve.location.href = "http://" + host + ":" + port, eve.location.port = port, eve.location.host = host;
	},

	addAgent: function(filename, options) {
		// TODO: check that options.uri and options.threads are of the right type and check that options even exists 
		if (options === undefined) var options = new Object(); // TODO see how to do this properly

		if (options.threads === undefined) options.threads = 2;  //default value for threads
	
		// see whether we need to assign a uri automatically
		if (options.uri === undefined || (options.uri in eve.agentList)) {

			var number = 1;
			var proposedUri = "/agents/" + filename + "/" + number; //maybe not ideal to use filename here... 
			while (proposedUri in eve.agentList) {
				number++;
				proposedUri = "/agents/" + filename + "/" + number;
			}
		
			options.uri = proposedUri;
		}
	
		eve.agentList[options.uri] = new eve.Agent(filename, options.uri, options.threads, options.initState, options.initStatics);
	
		//console.log("Added agent from " + filename + " at " + options.uri + " with " + options.threads + " threads."); 
		return options.uri;
	},

	removeAgent: function(uri, timeout) {
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

}

/**
 *
 * functions for handling incoming RPC messages 
 *
 */

// route a request to the right location
eve.requestRelayPromise = function (params) { 

	if (params.uri in eve.agentList) {
		return eve.agentList[params.uri].requestDeliveryPromise(params.json);
	} else {
		return Q.reject("Agent " + params.uri + " does not exist here at " + eve.location.href + "!");
	}

}

//wrap local RPCs and http RPCs in a nice wrapper that always returns a promise that will resolve in a JSON RPC reply
eve.requestSendPromise = function(RPC) {

	//TODO: make sure that we have a valid url in agentBase (or here)! Otherwise this comes down crashing
	var dest = url.parse(RPC.destination);
	
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
}

//to handle requests that are coming in from outside (this is what you'ld call from express)
eve.incomingRequest = function(req, res) {  //req.body should contain the parsed JSON RPC message, req.url the uri as used in the agentname, eg, /agents/agenttype/nr

	var params = {'json': JSON.stringify(req.body), 'uri':req.url};
	eve.requestRelayPromise(params)
	.then( function(value) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(value);  
	}, function(err) {  //assemble the error message based on rejected promise and request
		res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({id:req.body.id, result:null, error:err}));
		//TODO perhaps send an additional warning in case 'id' is undefined
	}).done();

}


/**
 * Start a server handling the HTTP requests
 * @param {Number} port
 * @param {String} host
 */

eve.listen = function (port, host) {
    eve.location.href = "http://" + host + ":" + port, eve.location.port = port, eve.location.host = host;

    http.createServer(function (req, res) {
        var pathname = url.parse(req.url).pathname;
        
		var prefix = pathname.split('/')[1];
		if (prefix == 'agents') { //agent request, route to agents

			var data = "";
		    req.on("data", function(chunk) { data += chunk; });

		    req.on("end", function() {
		        console.log("receiving request: " + req.url + data);

				try {
					var parsedRPC = JSON.parse(data);				
					eve.incomingRequest({'url':pathname, 'body':parsedRPC}, res);
				} catch(err) { //probably message couldnt be parsed
					res.writeHead(200, {'Content-Type': 'application/json'});
		            res.end(JSON.stringify({id:null, result:null, error:"Unkown error, are you sure you sent a valid JSON RPC? " + err}));
				}
		    });

		} else {  //try to route the request to one of our webpages
			var now = new Date();
  			var html = "<p>Hello World, in case you want more functionality on webpages, simply embed eve in an express server.</p>"; 
 			res.end(html);
		}
    }).listen(port, host);
};


/**
 * nodejs exports
 */

exports.listen = eve.listen;
exports.management = eve.agentList["/agents/management"];
exports.handleRequest = eve.incomingRequest;

