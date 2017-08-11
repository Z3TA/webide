/*
	Let users run nodejs scripts.
	The script will execute in a vm chrooted to the users home dir
	
	Gotcha: We are not able to capture errors from here. (they have to be handled by whoever spawns this script)
	If we listen to process messages (from the parent) we can't know if and when the script exist!
	
*/

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
	
	var scriptContext = {
	console: {
	log: function () {
	var msg = arguments[0];
	for (var i = 1; i < arguments.length; i++) msg += " " + arguments[i];
	var where = getStack(scriptName);
					process.send({log: msg, scriptName: scriptName, location: where});
	},
	warn: function () {
	var msg = arguments[0];
	for (var i = 1; i < arguments.length; i++) msg += " " + arguments[i];
	var where = getStack(scriptName);
					process.send({warn: msg, scriptName: scriptName, location: where});
	},
	error: function () {
	var msg = arguments[0];
	for (var i = 1; i < arguments.length; i++) msg += " " + arguments[i];
	var where = getStack(scriptName);
					process.send({error: msg, scriptName: scriptName, location: where});
	}
	},
	require: function (moduleName) {
				var where = getStack(scriptName);
				process.send({require: moduleName, scriptName: scriptName, location: where});
				return require(moduleName);
	}
	}
	var vm = require("vm");
	var context = new vm.createContext(scriptContext);
	var scriptOptions = {
	filename: scriptName,
	displayErrors: true
	}
	
	// Try here will only capture global errors, not errors within functions!
	try {
	//var script = new vm.Script(code, scriptOptions);
	//var result = script.runInContext(context);
	//var result = script.runInNewContext(context, scriptOptions);
	var result = vm.runInContext(code, context, scriptOptions);
	}
	catch(err) {
			var where = getStack(scriptName);
			process.send({error: err.message, scriptName: scriptName, location: where});
	}
	
		// result is always undefined ...
		// We will exist when the script exists!
		// Any code here will be executed *before* the script exits!
		
	});
	}
	
	function getStack(scriptName) {
	var stack = (new Error().stack).split(/\r\n|\n/);
	//console.log("stack: " + stack);
	var line4 = stack[3];
	//console.log("line4: " + line4);
	var match = line4.match(new RegExp(scriptName + ":(\\d+):(\\d+)"));
	//console.log("match: " + match);
	if(!match) return line4;
	if(match.length != 3) return line4;
	return {row: parseInt(match[1]), col: parseInt(match[2])};
	}
	
	
	