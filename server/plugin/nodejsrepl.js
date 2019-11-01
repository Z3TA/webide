
var repl;

var REPL = {
	
	feed: function(user, json, callback) {
		
		if(repl) {
			// Clear it
			repl.stdin.write(".clear\n");
			afterStartup();
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
			repl.stdin.write(json.content + "\n");
			
			if(json.run) {
				setTimeout(function() {
					REPL.run(user, {content: json.run}, callback);
				}, 100);
			}
			else if(json.autocomplete) {
				setTimeout(function() {
					REPL.autocomplete(user, {content: json.autocomplete}, callback);
				}, 100);
			}
			else callback(null);
			
			callback = null;
		}
		
	},
	
	run: function(user, json, callback) {
		
		if(!repl) return callback(new Error("No REPL running. Start using nodejsrepl.feed!"));
		
		repl.stdout.on('data', read);
		
		var outputStr = "";
		
		function read(data) {
			console.log("Record repl stdout: data=" + data);
			
			if(data == "...") repl.stdin.write("\x03"); // CTRL+C
			
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
	
	quit: function() {
		if(repl) repl.kill();
	}
	
}

module.exports = REPL;
