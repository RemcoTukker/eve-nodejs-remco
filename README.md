# Eve

Eve is a multi purpose, web based agent platform. 
It has implementations on various platforms. 
This is a node.js implementation. 

Documentation of Eve is available on http://almende.github.com/eve

Author:  Remco Tukker, 2013-2014; Jos de Jong 2011-2012

License: Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0)

# Usage

download or clone

npm install

node testLife/server

This will run a game of life of which the starting parameters and setup of eve is done in tests/server and which uses the agents in the agents folder. Included services are a local transport and a http transport (which is rather slow). Codebase is small and should be easy to digest.

# Background 


## Overview

This is a JavaScript agent platform for NodeJS that implements the Eve specification. Eve specifies only the way of communication between agents: using JSON RPCs over a number of transport layers (HTTP, local, and later also ZeroMQ, WebRTC and possibly XMPP). This platform is to be extended to modern browser environments in order to achieve agent mobility between a NodeJS server and browsers.

Eve NodeJS has been created for convenient development and deployment of multi-agent systems.

### Features
  - JavaScript agents are easy to develop and can be extended on the fly
  - Communication using Eve
    - Uses JSON RPC: human readable, useable from any language (Eve has Java and JavaScript implementation at the moment)
    - Multiple protocols: HTTP, XMPP, ZeroMQ, ...
  - Excellent agent mobility, from server to browser
  - Good performance (for an interpreted language): ....




## Installation and Your First Agent

[Installation instructions]

### Your First Agent

[Example of the simplest agent imaginable]




## Agent Details

In Eve NodeJS, an agent can be in three states: hibernated, suspended or running. Every agent starts its life _hibernated_: the agent is just a javascript constructor stored in one or more files. An agent platform can load these files and call the constructor to bring it to a _running_ state. Possibly, the agent platform can then decide to _suspend_ the agent, in which case the agent platform moves the agent out of memory but will recall it in case a message for the agent comes in; so, it will only maintain the address of the agent and has the responsibility of the storage.

The whole lifecycle is thus: hibernated -> running -> suspended -> running -> hibernated.

In order to support this lifecycle, the agent is preferably stored in two separate files [hrm, actually, maybe this is a bit silly, not really necessary. Only thing we can do is make a standard constructor/desctructor/etc file available for simplest use cases]: one for the agent functionality and logic (or "state"), the second for the agent lifecycle management. In code, this translates respectively to a plain object for the functionality/state, and constructor wrapper code for the lifecycle management. These files are connected according to the CommonJS standard: a simple 'require' to the constructor wrapper from the agent object.

### Agent Mobility

Note that transferring the agent to a different address (and thus, possibly, a different location) is just a matter of hibernating the agent, possibly moving the JS files to a new location, and starting the agent again. Ideally, some extra effort is done to ensure that the hibernated agent can actually start again: to do so, the agent has to be constructed at its new address before the old agent is removed from memory in its old location. That would add a fourth agent state to the list: an "in transit" state in which the agent doesnt accept requests but only ensures it is started in the new location and then possibly notify other agents of its new location (note that this should be done from the old location to ensure security). 

### What can an agent expect from the agent platform?
  - The agent platform will supply the agent with functions for sending and receiving Eve messages
  - The agent platform will supply the agent with resources, namely processer time and memory
  - The agent platform may try to suspend the agent (although it should be possible to prevent this from the agent)
  - A management agent that can be contacted at a fixed address for server management info/functions (eg for moving in/out)
  - Notifications of upcoming events (eg, server will be down sometime, some service (will be) changed)
  - Some privacy, possibly
  - Authentication???

### What can the agent platform expect from an agent?

I feel it is best to make as little assumptions as possible. However, some assumptions are necessary:
  - The agent will have appropriate functions for all state changes: a constructor, desctructor / serializer, ...
  - The agent will have an entry point for Eve messages (JSON RPCs)

Additionally, for now, we make the following assumptions:
  - No infinite loops
  - No memory leaks
  - No errors
  - Lots of other stuff....


## Platform Details

### What can the owner of the server expect from the agent platform?
  - A management agent that can be contacted at a fixed address for server management info/functions
  - A user interface to get an overview of what is happening at the server

### Code Structure

The entrance file is eve.js. This module is actually merely a crude plugin system that is tweaked towards an agent platform: it maintains a list of services and a list of agents. The services register "servicefunctions" that eve.js makes available to the agents. Thus, something is supposed to be a service when it is only relevant for the agents at the local server and it is more than one or just a handful of agents using it. All other functionality belongs in an agent. The minimal service Eve NodeJS should have available is a way of communication, which is currently defined in EveP2P.js. EveP2P.js itself then loads the js files for particular transports.




