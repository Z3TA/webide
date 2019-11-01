
var repl;

var REPL = {
	
	feed: function(user, json, callback) {
		
		if(repl) {
			// Clear it
			send(repl.stdin, [".clear", "\n"], afterStartup);
		}
		else {

			var pathToNodeJs = "/usr/bin/node";
			
			var replOptions = {
				silent: true, // Makes us able to capture stdout and stderr, otherwise it will use our stdout and stderr
				execPath: pathToNodeJs
			}
			
			if(user.chrooted) {
				replOptions.execPath = pathToNodeJs;
			}
			
			var fork = require('child_process').fork;
			
			// Need to use fork (not spawn) to be able to listen for stdin/stdiout!
			
			var args = ["-i"];
			
			console.log("Forking/spawning REPL with replOptions=" + JSON.stringify(replOptions) + " args=" + JSON.stringify(args));
			repl = fork(args, replOptions);
			
			repl.stdin.setEncoding('utf-8');
			
			var replStarted = false;
			
			repl.stdout.on('data', function (data) {
				console.log("repl stdout: data=" + data);
				if(!replStarted) {
replStarted = true;
					console.log("REPL now started!");
					afterStartup();
				}
			});
			
			repl.stderr.on('data', function (data) {
				console.log("repl stderr: data=" + data);
			});
			
			repl.on('error', function (err) {
				console.log("repl error: err.message=" + err.message);
				
				if(callback) {
					callback(err);
					callback = null;
				}
				
			});
			
			repl.on('close', function (exitCode) {
				console.log("repl close: exitCode=" + exitCode);
				repl = null;
				
				if(callback) {
					callback(new Error("repl closed with code=" + exitCode));
					callback = null;
				}
			});
			
			
			/*
				var waitForStartupTimer = setInterval(function() {
				if(replStarted) {
				clearInterval(waitForStartupTimer);
				afterStartup();
				}
				}, 100);
			*/
		}
		
		function afterStartup() {
			
			send(repl.stdin, [json.content, "\n"], function() {
				if(json.run) {
					REPL.run(user, {content: json.run}, callback);
				}
				else if(json.autocomplete) {
					REPL.autocomplete(user, {content: json.autocomplete}, callback);
				}
				else callback(null);
				
				callback = null;
			});
			
		}
		
	},
	
	run: function(user, json, callback) {
		
		if(!repl) return callback(new Error("No REPL running. Start using nodejsrepl.feed!"));
		
		repl.stdout.on('data', read);
		
		var outputStr = "";
		
		function read(data) {
			console.log("Record repl stdout: data=" + data);
			
			//if(data == "...") repl.stdin.write("\x03"); // CTRL+C
			
			outputStr += data.toString();
			
		}
		
		repl.stdin.write(json.content + "\n");
		
		setTimeout(waitForData, 100);
		
		function waitForData() {
			console.log("outputStr=" + outputStr + " (" + outputStr.length + ")");
			if(!outputStr || outputStr == ">") return setTimeout(waitForData, 100);
			
			repl.stdout.removeListener("data", read);
			callback(null, outputStr);
			callback = null;
		}
		
	},
	
	autocomplete: function(user, json, callback) {
		
		if(typeof callback != "function") throw new Error("callback=" + callback + " is not a function!");
		
		if(!repl) return callback(new Error("No REPL running. Start using nodejsrepl.feed!"));
		
		var maxWait = 10;
		var waitCounter = 0;
		
		console.log("REPL.autocomplete: json=" + JSON.stringify(json));
		
		console.log("REPL.autocomplete: Sending TAB to clear ...");
		send(repl.stdin, "\t");
		
		
		repl.stdout.on('data', read);
		
		var outputStr = "";
		
		function read(data) {
			console.log("REPL.autocomplete: Recording: data=" + data);
			outputStr += data.toString();
		}
		
		send(repl.stdin, [json.content, "\t"], waitForData);
		
		function waitForData() {
			console.log("outputStr=" + outputStr + " (" + outputStr.length + ") Waiting for output...");
			if(!outputStr || outputStr == ">") {
				if(++waitCounter >= maxWait) {
					return end(new Error("Did not get any outpot from the REPL when trying to autocomplete " + json.content), outputStr);
				}
				else {
					console.log("REPL.autocomplete: Sending TAB");
					send(repl.stdin, "\t");
					return setTimeout(waitForData, 100);
				}
			}
			else end(null, outputStr);
			
			function end(err, resp) {
				repl.stdout.removeListener("data", read);
				callback(null, outputStr);
				callback = null;
			}
		}
		
	},
	
	quit: function() {
		if(repl) repl.kill();
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
