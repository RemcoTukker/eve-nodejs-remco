/// !example
/// ## Loading the worker code from a file (worker side)
///
/// This file contains the pong (worker) side of our ping pong example.
/// It is loaded by a `t.load` call in `ex4_main.js`.
function fibo(n) {  //horribly inefficient way of calculating fibonacci sequence! Lets give agents some state to improve this...
        
	var result = n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
	puts(result + " ");	
	return result;
}

// returning the next fibonacci number when a 'next' event comes in:
var i = 1;
thread.on('next', function() {
        thread.emit('data', i, fibo(i));
        i++;
});
