
const Stream = require('stream');
const repl = require('repl');

var REPL = {
	
	
	run: function(user, json, callback) {
		
		
	},
	
	autocomplete: function(user, json, callback) {
		
		if(typeof callback != "function") throw new Error("callback=" + callback + " is not a function!");
		
		var input = new Stream();
		input.write = input.pause = input.resume = (buf) => {
			console.log("input.write: " + buf);
		};
		input.readable = true;
		
		var output = new Stream();
		output.write = output.pause = output.resume = function(buf) {
			console.log("output.write: " + buf);
			output.accumulator.push(buf);
		};
		output.accumulator = [];
		output.writable = true;
		
		var replServer = repl.start({
			input: input,
			output: output,
			useColors: false,
			terminal: true, // Needed to be able to send Ctrl+C
			useGlobal: true // Make it possible to require modules etc
		});
		
		var runBefore = json.before;
		if(typeof runBefore == "string") runBefore = [runBefore];
		for (var i=0; i<runBefore.length; i++) {
			console.log("runBefore[" + i + "]=" + runBefore[i]);
			replServer.write(runBefore[i] + (runBefore[i].slice(-1) == "\n" ? "" : "\n"));
		}
		
		//replServer.write('var foo = require( "http" ) ;\nvar server = foo.createServer( function lala() {});\nserver.\n');
		
		
		replServer.write("\n");
		
		// Send one Ctrl+C in case we got stuck
		replServer.write(null, { ctrl: true, name: 'c' });
		//replServer.emit('SIGINT');
		//replServer.emit('SIGCONT');
		
		console.log("complete=" + json.complete);
		
		replServer.complete(json.complete, function(err, res) {
			if(err) {
				console.error(err);
				callback(err);
			}
			else {
				console.log("autocomplete res=" + JSON.stringify(res));
				console.log("replServer output: " + replServer.output.accumulator.join('\n'));
				
				var completions = res[0];
				
				callback(null, completions);
			}
		});
		
		// replServer will kill itself!
		
	}
	
}

// Problem: We need to wait between each message ...
var SENDQUEUE = [];

var queueInterval = setInterval(runQueue, 30);

function runQueue() {
	for (var i=0, msg, queue; i<SENDQUEUE.length; i++) {
		queue = SENDQUEUE[i].queue;
		if(queue.length > 0) {
			msg = queue.shift(); // First in, first out
			console.log("REPL: Writing: " + msg);
			SENDQUEUE[i].write(msg);
			if(queue.length ==0 && SENDQUEUE[i].callbacks.length > 0) {
				console.log("Queue has " + SENDQUEUE[i].callbacks.length + " callbacks");
				var callbacks = SENDQUEUE[i].callbacks.slice(); // Copy the array
				SENDQUEUE[i].callbacks.length = 0; // Clear the array
				setTimeout(function() {
					console.log("Calling " + callbacks.length + " callbacks");
					for (var j=0; j<callbacks.length; j++) {
						console.log("Calling " + typeof callbacks[j]);
						callbacks[j](); // Call back
					}
				}, 15);
			}
		}
	}
}

function send(stdin, messages, callback) {
	
	if(typeof messages == "string") messages = [messages];
	
	if(callback != undefined && typeof callback != "function") throw new Error("callback=" + callback + " is not a function!");
	
	var queue;
	for (var i=0; i<SENDQUEUE.length; i++) {
		if(SENDQUEUE[i] == stdin) {
			queue = SENDQUEUE[i].queue;
			break;
		}
	}
	
	if(!queue) {
		var i = SENDQUEUE.push(stdin) -1;
		SENDQUEUE[i].queue = [];
		SENDQUEUE[i].callbacks = [];
		
		queue = SENDQUEUE[i].queue;
	}
	
	for (var j=0; j<messages.length; j++) {
		queue.push(messages[j]);
	}
	
	if(callback) SENDQUEUE[i].callbacks.push(callback);
}



module.exports = REPL;
