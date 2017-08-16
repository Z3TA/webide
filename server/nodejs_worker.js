/*
	This script has been depricated and nodejs scripts are spawned directly.
	It's cool that we can "capture" console.log, require etc, 
	so we might use vm instead of spawning scripts directly
	
	Let users run nodejs scripts.
	The script will execute in a vm chrooted to the users home dir
	
	Gotchas
	-------
	We are not able to capture errors from here. (they have to be handled by whoever spawns this script)
	If we listen to process messages (from the parent) we can't know if and when the script exits!
	Can't use console.log while using apparmor!??
	
	
*/

//console.log("process.env=" + JSON.stringify(process.env));

var username = process.env.username;
var uid = process.env.uid;
var gid = process.env.gid;
var scriptName = process.env.scriptToRun;

if(!username) throw new Error("No username defined in process.env=" + JSON.stringify(process.env));
if(!uid) throw new Error("No uid defined! process.env=" + JSON.stringify(process.env));
if(!gid) throw new Error("No gid defined in process.env=" + JSON.stringify(process.env));

uid = parseInt(uid);
gid = parseInt(gid);


var posix = require("posix");
	posix.chroot('/home/' + username);
	posix.setegid(gid);
	posix.seteuid(uid);


// Set default file permissions
	var newmask = parseInt("0027", 8); // four digits, last three mask, ex: 0o027 ==> 750 file permissions
	var oldmask = process.umask(newmask);
	
// Show large stacks
Error.stackTraceLimit = Infinity;

	/*
	process.on('message', function commandMessage(message) {
	
	// We can not recive sockJS connection handles!
	
	if(message == undefined) throw new Error("Nodejs worker message=" + message);
	
	if(message.runScript) {
	runScript(message.runScript.scriptName);
	}
	});
*/

runScript(scriptName);

function runScript(scriptName) {
	
	var fs = require("fs");
	fs.readFile(scriptName, "utf8", function readScript(err, code) {
	if(err) throw err;
	
		/*
			All expected globals need to be specified here ...
			https://nodejs.org/api/globals.html
		*/
		var scriptContext = {
			Buffer: Buffer,
			__dirname: getDirectoryFromPath(scriptName),
			__filename: getFilenameFromPath(scriptName),
			clearImmediate: clearImmediate,
			clearInterval: clearInterval,
			clearTimeout: clearTimeout,
	console: {
	log: function () {
					var msg = parseString(arguments[0]);
					for (var i = 1; i < arguments.length; i++) msg += " " + parseString(arguments[i]);
						var where = getStack(scriptName);
						process.send({log: msg, scriptName: scriptName, location: where});
					},
	warn: function () {
					var msg = parseString(arguments[0]);
					for (var i = 1; i < arguments.length; i++) msg += " " + parseString(arguments[i]);
	var where = getStack(scriptName);
					process.send({warn: msg, scriptName: scriptName, location: where});
	},
				error: function () {
					var msg = parseString(arguments[0]);
					for (var i = 1; i < arguments.length; i++) msg += " " + parseString(arguments[i]);
					var where = getStack(scriptName, 0);
					process.send({error: msg, scriptName: scriptName, location: where});
	}
				
			},
			exports: exports,
			global: global,
			module: module,
			process: process,
			require: function (moduleName) {
				var where = getStack(scriptName);
				process.send({require: moduleName, scriptName: scriptName, location: where});
				
				// Make relative paths work
				if(moduleName.charAt(0) == ".") {
					moduleName = getDirectoryFromPath(scriptName) + moduleName.substr(1);
				}
				
				return require(moduleName);
	},
			setImmediate: setImmediate,
			setInterval: setInterval,
			setTimeout: setTimeout
	}
	var vm = require("vm");
	var context = new vm.createContext(scriptContext);
	var scriptOptions = {
	filename: scriptName,
	displayErrors: true
	}
	
		//process.on('uncaughtException', function(err) {});
		
	// Try here will only capture global errors, not errors within functions!
	//try {
	//var script = new vm.Script(code, scriptOptions);
	//var result = script.runInContext(context);
	//var result = script.runInNewContext(context, scriptOptions);
	var result = vm.runInContext(code, context, scriptOptions);
	//}
		//catch(err) {
			//console.log("vm:err:" + err.message);
			//var where = getStack(scriptName);
		//process.send({error: err.message, scriptName: scriptName, location: where, stack: err.stack()});
	//}
		
		// result is always undefined ...
		// We will exist when the script exists!
		// Any code here will be executed *before* the script exits!
		
	});
	}
	
function parseString(obj) {
	if(typeof obj == "object") return JSON.stringify(obj, null, 2);
	else return obj + "";
}

	function getStack(scriptName, lineNr) {
	if(lineNr == undefined) lineNr = 0;
	
	//RangeError: Maximum call stack size exceeded
	try {
	var stack = (new Error().stack).split(/\r\n|\n/);
	}
	catch(err) {
		return null;
	}
	
	filterStack(stack); // recursive
	
	if(lineNr >= stack.length) lineNr = stack.length-1;
	
	//console.log("stack: " + stack);
	
	var re = new RegExp(scriptName + ":(\\d+):(\\d+)");
	var match;
	for (var i=0; i<stack.length; i++) {
		match = stack[i].match(re);
		if(match) break;
		}
	
	if(!match) {
		return stack[lineNr];
	}
	
	//return {row: parseInt(match[1]), col: parseInt(match[2])};
	return stack[i];
	
		
		function filterStack(stack) {
			/*
				Remove unnessesary functions from the stack trace
				
				 Error
				,    at getStack (/home/zeta/dev/jzedit/server/nodejs_worker.js:112:15)
				,    at readScript (/home/zeta/dev/jzedit/server/nodejs_worker.js:99:16)
				,    at FSReqWrap.readFileAfterClose [as oncomplete] (fs.js:380:3)
				
				
				Error
				,    at getStack (/home/zeta/dev/jzedit/server/nodejs_worker.js:143:15)
				,    at Object.scriptContext.console.log (/home/zeta/dev/jzedit/server/nodejs_worker.js:71:19)
				,    at /nodejs/funfuncat.js:8:9
				,    at Object.exports.runInContext (vm.js:44:17)
				,    at readScript (/home/zeta/dev/jzedit/server/nodejs_worker.js:121:18)
				,    at FSReqWrap.readFileAfterClose [as oncomplete] (fs.js:380:3)
				
			*/
			
			for (var i=0; i<stack.length; i++) {
				if(stack[i].indexOf("at readScript (/home/zeta/dev/jzedit/server/nodejs_worker.js") != -1) {
					stack.splice(i, 2);
					return filterStack(stack);
				}
				else if(stack[i].indexOf("/home/zeta/dev/jzedit/server/nodejs_worker.js") != -1) {
					stack.splice(i, 1);
					return filterStack(stack);
				}
			}
		}
		
	}

function getDirectoryFromPath(path) {
	if(path.indexOf("/") > -1) {
		return path.substr(0, path.lastIndexOf('/'));
	}
	else {
		// Assume \ is the folder separator
		return path.substr(0, path.lastIndexOf('\\')+1);
	}
}

function getFilenameFromPath(path) {
	if(path.indexOf("/") > -1) {
		return path.substr(path.lastIndexOf('/')+1);
	}
	else {
		// Assume \ is the folder separator
		return path.substr(path.lastIndexOf('\\')+1);
	}
}
