//var url = .. .  should be available from webpage;

//var url = local_data.agentAddress;
//var url =  "http://127.0.0.1:3000/agents/bla";
//TODO: we dont even need the address of the server, browser knows it apparently...
var url =  "agents/managementAgent";
//var method = "POST";
//var postData = JSON.stringify({'id':1, 'method':"listAgents", 'params':[{'a':1}, {'b':2}] });
var postData = JSON.stringify({'id':1, 'method':"listAgents", 'params':[] });
//var async = true;


//var request = new XMLHttpRequest();

$.post( url, postData, function( data ) {
	console.log( JSON.stringify(data) ); // John
	//TODO: format the JSON RPC reply nicely    
	$("#listhere").html(JSON.stringify(data));
}, "json");


/*
request.onload = function() {
 	var status = request.status; // HTTP response status, e.g., 200 for "200 OK"
   	var data = request.responseText; // Returned data, e.g., an HTML document.
    
	//TODO: check if request succeeded

	RPCreply = JSON.parse(data);

	//do some stuff to the DOM
    //we need jquery being loaded in head
    $("#listhere").html(status + " " + data + " " + RPCreply.result);
    
}

request.open(method, url, async);
//request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
request.setRequestHeader("Content-Type", "application/json");
request.send(postData); // Actually sends the request to the server.
*/
