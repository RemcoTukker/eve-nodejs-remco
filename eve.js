/*
TODO:

functionality:
get the line number / stack trace out of the threads to facilitate debugging, go into TAGG for that
its probably best to restart the thread after an uncaught error to prevent mem leaks etc (check) 
do something useful with failed RPC requests
schedule a method invocation at the right time ("time" from the point the invocation was received, instead of "time" from the point the RPC calls return)
small suite of test agents
bugfixes [...]

style:
let somebody look at this code that knows JS better...
move everything back in an eve namespace
rework invokeMethod and on("invokeMethod")
ID in the JSON RPC reply: either move JSON RPC parsing into the thread (also better performance) or do it when the request comes in
rework persistent storage, its ugly now, 'cause it needs to know the url
rework more stuff to use Q

extras:
do parameter parsing in the threads to make agent programmers life easier
add extra event listeners to give the thread-side of the agent more of the node functionalities, 
	eg http requests (as this is possible from webworkers too I think?), running external scripts may be useful for AIM, .....
agent management functions node-side
windows/mac compatibility (is it now?)
implement some locking mechanisms
add some flexibility in the scheduling: invoke as soon as possible after scheduled time, or only invoke within a certain time window 
					(eg due to downtime, or due to slow RPC requests, or whatever...)

optimization:
shortcut for requests from local agents (we dont need a http post request for that)
hardcode some of the JSON error replies so that it doesnt have to stringify all the time
when recalling state, dont add it to params, just keep it in a separate object.
	that way we can keep objects in memory stringified, as well as params (removes need for a lot of parsing)
make seperate event callbacks for the schedule and invoke events to minimize the number of checks and operations per event message
move stuff down to c++ ?
improve data store, perhaps a db?
see if we want a global threadpool with some managing mechanism for keeping the threads around for an optimal time
	instead of the threadpool per agent
move Agent (and perhaps also dataStore) functions to a prototype to reduce memory footprint


*/

var http = require('http'),
    url = require('url'),
	request = require('request'),
	Q = require('q'),
	storage = require('node-persist'), 
	Threads = require('webworker-threads'); //webworker threads is better than TAGG ´cause this one lets you do importScripts

// create namespace
var eve = {};

eve.location = {
    href: undefined   // will contain server location like "http://host:port"
};

storage.initSync();

//dataStore object that becomes part of the main-thread-side of the agent
function dataStore(url) {
	var prefix = url.replace(/\//g,'');  // workaround for prefix with slash, otherwise fails silently..
	var associativeArray = new Object();

	this.save = function(key, value) {
		//TODO: add more logix here
		associativeArray[key] = value;
		storage.setItem(prefix + key, value); 
		//storage.setItem(key, value);
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

function Agent(filename, url, threads)
{
	//constructor
	var agentData = new dataStore(url);
	var acceptingRequests = false;
	
	//save the init parameter for some introspection
	agentData.save("url", JSON.stringify(url)); 
	agentData.save("threads", JSON.stringify(threads)); //is this actually relevant? doesnt it change all the time?
	agentData.save("filename", JSON.stringify(filename));

	//have a thread pool for every agent (because threads-a-gogo requires file to be loaded beforehand; 
	// loading code into threads on the fly is likely not very performant)
	var pool = Threads.createPool(threads); 
	var firstLoaded = false;
	pool.load(__dirname + "/" + filename, function(err, completionValue) {
		if (!firstLoaded) {
			firstLoaded = true;		
			if (err != null) {
				console.log("Error: " + __dirname + "/" + filename + " could not be loaded; error: " + err.message + " " + err.stack);				
				var url = JSON.parse(agentData.recall("url"));
				process.nextTick( function() { return remove(url); }, 1000); 					
			} else {
				console.log("agentBase.js loaded succesfully!");
				acceptingRequests = true;
			}
		}
	});

	/* functions for getting the thread to work for us */

	this.sendRequest = function(request, callback) {
		if (!acceptingRequests) {
			try {
				req = JSON.parse(request);
				callback(JSON.stringify({"id": req.id, "result": null, "error":"Agent does not accept requests at the moment."})); 
			} catch (e) {
				callback(JSON.stringify({"id": null, "result": null, "error":"Please use a valid JSON RPC request."})); 
			}
			return;
		}

		pool.any.eval("entryPoint(" + request + ")", function(err, completionValue) {
			
			var id;
			try { 
 				req = JSON.parse(request);
				id = req.id;
			} catch (e) {
				callback(JSON.stringify({"id": null, "result": null, "error":"Please use a valid JSON RPC request."})); 
				return;
			}			

			if (err != null) {
				console.log("function returned with err " + err + " and value " + completionValue);
				console.log("in reply to the following request: " + request);
				console.log("stack trace: " + err.stack); 
				callback(JSON.stringify({"id": id, "result":null, "error":err.message})); 			
			} else {
				var result = JSON.parse(completionValue);
				callback(JSON.stringify({"id": id, "result":result, "error":null})); 			
			}

		} );
	}

	//function for running a function in a thread
	this.invokeMethod = function(methodName, params) {
		if (!acceptingRequests) return;

			console.log("invoking method " + methodName + '(' + params + ')');        

			pool.any.eval(methodName + '(' + params + ')');
	}

	// ********* Handlers for events that can be generated in the threads ***************

	// event listener to store something in the state
	pool.on("storeData", function(key, value) {
		agentData.save(key, JSON.parse(value));  //would be nicer to store all data stringified, but we have to parse and stringify it again before sending anyway
	});

	var that = this; //there's prettier ways to do this.. doesnt matter... used later on in scheduling new tasks		

	// event listener for invoking other agent methods
	pool.on("invokeMethod", function(time, functionName, strParams, strStateKeys, strRPCs) {
		//recall all state that the new function call requires		
		//and add the recalled state to the params object
		params = JSON.parse(strParams);
		stateKeys = JSON.parse(strStateKeys);
		RPCs = JSON.parse(strRPCs);

		console.log("got invokeMethod event");	
		console.log(time + " " + functionName + " " + params + " " + stateKeys );

		// first send out RPCs

		var requestPromise = Q.denodeify(request);
		var promiseArray = [];
		for (key in RPCs) {
			var options = {uri: RPCs[key].destination, method: "POST", json: RPCs[key].data }; //is data stringified already? I think so
			promiseArray.push(requestPromise(options));
		}

		Q.all(promiseArray).done( function(RPCresults) {  

			var n = 0;
			for (key in RPCs) {
				//console.log(RPCresults[n][0]); //this should be the
				//console.log(RPCresults[n][1]);
				params[key] = JSON.parse(RPCresults[n][1].result); 
				n++;
				console.log(key);
			}

			for (key in stateKeys) {
				console.log(key);
				params[key] = agentData.recall(stateKeys[key]); 
			}

			console.log("invoking method with the following parameters");	
			console.log(time + " " + functionName + " " + JSON.stringify(params) );
		
			//eve.handleRequest("/myAgent.js", "1", JSON.stringify({method:"myFunction", params:{a:1, b:3}}), function(res) {console.log(res);});
			
			if (time == 0) { //check how this statement evaluates in edge cases (undefined etc)
				process.nextTick(function() { return that.invokeMethod(functionName, JSON.stringify(params)); });
			} else { 
				setTimeout(function() { return that.invokeMethod(functionName, JSON.stringify(params)); }, time);
			}

		}, function(err) {console.log("RPC requests failed " + err);} ); 

	});

	/* management functions */

	this.stop = function() {
		//console.log("rude" + pool.totalThreads());
		acceptingRequests = false;
		pool.destroy(true); //this destroys threads //TODO: gives error, cause pool is already destroyed.. fix this!
	}

	this.blockRequests = function() {
		acceptingRequests = false;
	}

	this.resumeRequests = function() {
		//TODO: only allow if we have a threadpool
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

}

/* functions for keeping track of all the instantiated agents */

eve.agentList = new Object(); 

//eve.add = function(filename, options) {
function add(filename, options) {

	//TODO  !!!!! we need stack traces from dying agents!!!! best solution: hack this into TAGG. 
	//                 -1st alternative: add a debug option which lets you evaluate the agent in the main thread
 	//                  eg in a separate node instance from the rest of the agents, or in a child process of node,
	//					or within a try block (child process is probably best, try block kills main thread in case of infinite loop)
	//				   -2nd alternative: before adding the agent, try to load the agent within the main thread 
	//					(in this function). Runtime errors will still be in the dark
	// 			NOTE: runtime errors are already reported back now, although they are less helpful than complete stack traces
	//					(basically what you get when you catch an error) 
	
	//TODO: check that options.url and options.threads are of the right type and check that options even exists 
	var options = new Object(); //TODO see how to do this properly

	if (options.threads === undefined) options.threads = 2;  //default value for threads
	
	// see whether we need to assign a url automatically
	if (options.url === undefined || (options.url in eve.agentList)) {

		var number = 1;
		var proposedUrl = filename + "/" + number; //maybe not ideal to use filename here... 
		while (proposedUrl in eve.agentList) {
			number++;
			proposedUrl = filename + "/" + number;
		} 
		
		options.url = proposedUrl;
		
	}
	
	eve.agentList[options.url] = new Agent(filename, options.url, options.threads);
	
	console.log("Added agent from " + filename + " at " + options.url + " with " + options.threads + " threads."); 

	return options.url;
}

function remove(url, timeout) { //timeout is for finishing existing threads

	if (url in eve.agentList) {
		eve.agentList[url].blockRequests(); 
		//TODO: check type of timeout		
		if (timeout === undefined) timeout = 1000;
		setTimeout(function(){ 
			eve.agentList[url].stop(); 
			delete eve.agentList[url]; 
			console.log("Removed agent " + url); 
		}, timeout); 
		console.log("Agent " + url + " will be removed after " + timeout + " ms.");
	} else {
		console.log("Warning: Failed to remove agent at " + url + "; doesnt exist!");
	}

	//TODO: add return value that makes sense	
}

/* functions for handling incoming RPC messages */

eve.handleRequest = function (agentType, agentId, request, callback) {
	
	var targetAgentURL = agentType + "/" + agentId; //do we need this agentID?
	console.log(targetAgentURL);
	if (targetAgentURL in eve.agentList) {
		eve.agentList[targetAgentURL].sendRequest(request, callback);
	} else {
		try {
			var req = JSON.parse(request);
			callback(JSON.stringify({"id": req.id, "result": null, "error":"Requested agent does not exist here."})); 
		} catch (e) {
			callback(JSON.stringify({"id": null, "result": null, "error":"Please use a valid JSON RPC request."})); 
		}
	}
}


/**
 * Start a server handling the HTTP requests
 * @param {Number} port
 * @param {String} host
 */
eve.listen = function (port, host) {
    eve.location.href = "http://" + host + ":" + port;

    http.createServer(function (req, res) {
        var data = "";

        var pathname = url.parse(req.url).pathname,
            parts = pathname.split('/'),
            type = parts[1],
            id = parts[2];   ///TODO: check whether this still makes sense
		//actually, it doesnt make sense to do this _here_ ; we only need to know the address to forward the request to
		// no need to know the type and ID of agent in here.. Thus, change this to get everything that follows the hostname

        req.on("data", function(chunk) {
            data += chunk;
        });

        req.on("end", function() {
            console.log(req.url);
            console.log(data);

            eve.handleRequest(type, id, data, function(response) { 
				console.log(response);
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(response);
            });
        });
    }).listen(port, host);
};


//// test lines here

add("myAgent.js");
//agentList[0].invokeMethod("myAgent.myFunction", JSON.stringify({a:4, b:4}));
//agentList[0].invokeMethod("myAgent.myFunction", JSON.stringify({a:4, b:4}));
//agentList[0].invokeMethod("myAdd", JSON.stringify({a:4, b:4}));
setTimeout(function() {return eve.handleRequest("myAgent.js", "1", JSON.stringify({id:3, method:"myFunction", params:{a:1, b:3}}), function(res) {console.log(res);}); }, 1000);

//setTimeout(function() {return remove("myAgent.js/1"); }, 2000);

/**
 * nodejs exports
 */
exports.listen = eve.listen;
exports.add = add;
