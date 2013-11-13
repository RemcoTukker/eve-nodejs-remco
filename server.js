
// constants
var HOST = '127.0.0.1',
    PORT = process.argv[2] || 1337;

// imports
var eve                   = require('./eve.js');

/*
    CalcAgent             = require('./agent/CalcAgent.js'),
    GoogleDirectionsAgent = require('./agent/GoogleDirectionsAgent.js'),
    GoogleCalendarAgent   = require('./agent/GoogleCalendarAgent.js'),
    UserAgent             = require('./agent/UserAgent.js');
*/

// register some agent types
//eve.add(CalcAgent);
//eve.add(UserAgent);
//eve.add(GoogleDirectionsAgent);
//eve.add(GoogleCalendarAgent);

eve.add("myAgent.js");

// start the eve server
eve.listen(PORT, HOST);
console.log('Eve running at http://' + HOST + ':' + PORT + '/');
