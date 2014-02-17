/*
 * Copyright 2014 Remco Tukker
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var zmq = require('zmq'), sock1 = zmq.socket('push'), sock2 = zmq.socket('pull');

module.exports = ZMQ;


function ZMQ(eve, options, addServiceFunction) {
	sock1.bindSync('tcp://127.0.0.1:1330');
	console.log('Producer bound to port 1330');

	setInterval(function(){
  		console.log('sending work');
		sock1.send('some work');
	}, 500);


	sock2.connect('tcp://127.0.0.1:1330');
	console.log('Worker connected to port 1330');

	sock2.on('message', function(msg){
	  console.log('work: %s', msg.toString());
	});


}
