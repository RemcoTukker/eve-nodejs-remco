
var http = require('http'),
    url = require('url'),
    //couch_client = require('couch-client'),
	Threads = require('webworker-threads'); //webworker threads is better than TAGG ´cause this one lets you do importscript (does it in threads? prolly not -> TODO)
    //ManagerAgent = require('./agent/ManagerAgent.js'),
	//Threads = require('threads_a_gogo'); 

// create namespace
var eve = {};

eve.location = {
    href: undefined   // will contain server location like "http://host:port"
};

//dataStore object that becomes part of the main-thread-side of the agent
function dataStore() {

	associativeArray = new Object();

	this.save = function(key, value) {
		//todo: add more logix here
		associativeArray[key] = value;
	}

	this.recall = function(key) {
		//this probably doesnt need to be more intelligent; or perhaps store the last time this element was accessed? 
		return associativeArray[key];
	}

}

//object representing main-thread side of agent  
function Agent(filename, url, threads)
{
	//constructor
	var agentData = new dataStore();

	//save the init parameter for some introspection
	agentData.save("address", JSON.stringify(url)); 
	agentData.save("threads", JSON.stringify(threads));
	agentData.save("filename", JSON.stringify(filename));

	//have a thread pool for every agent (because threads-a-gogo requires file to be loaded beforehand; loading code into threads on the fly is likely not very performant)
	var pool = Threads.createPool(threads); 
	pool.load(__dirname + filename);   //load the file in the threads so that they are ready for execution

	//function for running a function in a thread
	this.invokeMethod = function(methodName, params) {

		console.log("invoking method " + methodName + '(' + params + ')');	

		pool.any.eval(methodName + '(' + params + ')'); 
		//  TODO think about security implicactions of eval'ing external messages on the thread.. can we do this better? always send it to a dispatcher function?
		///TODO hrm... perhaps make it so that there should always be a return value? for the response of the agent I mean...
		// then we should add a callback for once the agent replies to us
	}

	// ********* Handlers for events that can be generated in the threads ***************

	// event listener to store something in the state
	pool.on("storeData", function(key, value) {
		agentData.save(key, JSON.parse(value));  //would be nicer to store all data stringified, but we have to parse and stringify it again before sending anyway
	});

	// event listener to send messages
	pool.on("sendEveMessage", function(destination, data)  {
		//create and send the json rpc message (see Jos' work.. hrm no use, wasnt implemented yet)

		console.log("got sendEveMessage event");	

	});

	var that = this; //there's prettier ways to do this.. doesnt matter... used later on in scheduling new tasks		

	// event listener for invoking other agent methods
	pool.on("invokeMethod", function(time, functionName, strParams, strStateKeys) {
		//recall all state that the new function call requires		
		//and add the recalled state to the params object
		//TODO: check wheter this is working as intended
		params = JSON.parse(strParams);
		stateKeys = JSON.parse(strStateKeys);

		console.log("got invokeMethod event");	
		console.log(time + " " + functionName+ " " + params + " " + stateKeys );

		for (key in stateKeys) {
			console.log(key);
			params[key] = agentData.recall(stateKeys[key]);
		}

		console.log("got invokeMethod event");	
		console.log(time + " " + functionName+ " " + JSON.stringify(params) + " " + JSON.stringify(stateKeys) );

		if (time == 0) { //check how this statement evaluates in edge cases (undefined etc)
			process.nextTick(function() { return that.invokeMethod(fucntionName, JSON.stringify(params)); });
		} else { 
			setTimeout(function() { return that.invokeMethod(functionName, JSON.stringify(params)); }, time);
		}

	});


/* TODO: make seperate event callbacks for the schedule and invoke events to minimize the number of checks and operations per callback, as follows

	// invoke one of your own methods
	pool.on("invokeMethod", function(nextFunction, params) {
		invokeMethod(nextFunction, params);
	});

	// event listener to handle state requests
	pool.on("invokeMethodWithState", function(nextFunction, params, statekeys) {
		//recall all state that the new function call requires		
		//and add the recalled state to the params object
		//TODO: check wheter this is working as intended
		for (key in statekeys) {
			params.key = agentData.recall(key);
		}

		//invoke the method		
		invokeMethod(nextFunction, params);
	});

	pool.on("scheduleMethod", function(time, nextFunction, params) {
		var that = this; //there's prettier ways to do this.. doesnt matter...		
		setTimeout(function(){ return that.invokeMethod(nextFunction, params); }, time);
	});

	pool.on("scheduleMethodWithState", function(time, nextFunction, params, statekeys) {
		//add recalled values to params
		for (key in statekeys) {
			params.key = agentData.recall(key);
		}
		//and schedule the function
		var that = this; //there's prettier ways to do this.. doesnt matter...		
		setTimeout(function(){ return that.invokeMethod(nextFunction, params); }, time);
	});
*/

	

	//TODO: agent self-management:
	//create a way to temporarily block incoming messages and answer them with an "out of office" reply, such that we can re-initialize threadpool to:
	// * change the number of threads for this agent (after checking pendingJobs() a couple of times to see if the thread pool is the right size)
	// * load a different js file in the threads, for effectively transfering your address to a new agent and for allowing modifying code, eg to inject a new function in an agent

	//TODO: stash agent away Jos-style in case it is not used for a while
	// perhaps even let a management agent do this? I really do want somebody to keep track of all messages anyway, for the pwetty
	// graph visualization with moving packages (maybe make it optional if it has performance implications)

	//TODO: add extra event listeners to give the thread-side of the agent more of the node functionalities, 
	// eg http requests (as this is possible from webworkers too I think?), running external scripts may be useful for AIM, .....

	//TODO: perhaps keep track of threads, if one or more are running too long, get rid of them

}


var agentList = [];
var urlToAgentMapping = new Object();

eve.add = function(filename, options) {

	//TODO use options object for the following:
	//TODO get an initial decision on how many threads to use (preferably from user?)
	//TODO get a url to use for this agent, preferably check whether it wasnt in use yet..
	//TODO  !!!!! we need stack traces from dying agents!!!! best solution: hack this into TAGG. Alternative: add a debug option which lets you run the agent in the main thread
 	//                  eg in a separate node instance from the rest of the agents, or in a child process of node

	var threads = 5;	
	var url = "bla"; 

	urlToAgentMapping[url] = agentList.length;	
	agentList.push(new Agent(filename, url, threads) );

}

eve.handleRequest = function (agentType, agentId, request, callback) {
	
	//unfortunately, we have to parse the request here, to find out which method has to be called
	//unless... *TODO* we make a generic request acceptor function on the agent side that can then distribute the request further
	//is that possible (not breaking other stuff)?

	var req = JSON.parse(request);

	var targetAgentURL = agentType + "/" + agentId; //do we need this agentID?
	//do some sanity checks around here
	var targetAgentNr = urlToAgentMapping[targetAgentURL];
	agentList[targetAgentNr].invokeMethod(req.method, JSON.stringify(req.params));


	//placeholder for some intelligent agent-level, json rpc id based list thats waiting for responses TODO
	var response = {
       "id": id,
        "result": null,
    	"error": err
	};
    callback(JSON.stringify(response));

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

        // instantiate the correct type of agent, extract this type from the url
        var pathname = url.parse(req.url).pathname,
            parts = pathname.split('/'),
            type = parts[1],
            id = parts[2];

        req.on("data", function(chunk) {
            data += chunk;
        });

        req.on("end", function() {
            console.log(req.url);
            console.log(data);

            eve.handleRequest(type, id, data, function(response) { 
				//hrm, is this really necessary here? can we not decide on our own whether or when to send something back?
				//if we do it like this, we to keep the callback around until the agent decide to send something back... and at some point just give up waiting... or not?
                console.log(response);
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(response);
            });
        });
    }).listen(port, host);
};


//// test lines here

eve.add("/agentBase.js");
//agentList[0].invokeMethod("myAgent.myFunction", JSON.stringify({a:4, b:4}));
agentList[0].invokeMethod("myAgent.myFunction", JSON.stringify({a:4, b:4}));
//agentList[0].invokeMethod("myAdd", JSON.stringify({a:4, b:4}));



/**
 * nodejs exports
 */
exports.listen = eve.listen;
exports.add = eve.add;
