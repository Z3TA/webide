
/*
	
	Allow editors to be reached behind NAT
	
	On the computer you want to reach behind NAT:
	node server/server --nat=webide.se/nat/randomkey
	
	
*/

var LOGLEVEL = getArg(["ll", "loglevel"]) || 7; // Will show log messages lower then or equal to this number
var log; // Using small caps because it looks and feels better
(function setLogginModule() { // Self calling function to not clutter script scope
	// Enhanced console.log ...
	var logModule = require("./shared/log.js");
	
	logModule.setLogLevel(LOGLEVEL);
	log = logModule.log;
	
	var logFile = getArg(["log", "logfile"]) || null; // default: Write to stdout, if specified write to a file
	
	if(logFile) logModule.setLogFile(logFile);
	
})();

var module_string_decoder = require('string_decoder');

var getArg = require("./shared/getArg.js");

var DEFAULT = require("./default_settings.js");

var NAT_REVERSE_PORT = getArg(["port", "port"]) || DEFAULT.nat_reverse_port;

var SOCKETS = [];

var StringDecoder = module_string_decoder.StringDecoder;
var decoder = new StringDecoder('utf8');



var server = module_net.createServer();

server.on("listening", function serverListening() {
	log("Listening on port " + NAT_REVERSE_PORT, DEBUG);
});

// We recive connections from editor servers behind NAT
server.on("connection", function connection(socket) {
	log("socket connection !");
	
	SOCKETS.push(socket);
	
	socket.on("data", function socketData(data) {
		console.log("socketData: data.length=" + (data && data.length) );
		
		var str = decoder.write(data);
	});

	socket.on("end", function socketEnd(endData) {
		console.log("socketEnd: endData.length=" + (endData && endData.length) );
	});
	
	socket.on("close", function sockClose(hadError) {
		console.log("socket closed. hadError=" + hadError);
		SOCKETS.splice(SOCKETS.indexOf(socket));
	});
	
	// Must listen for errors or node -v 8 on Windows will throw on any socket error!
	socket.on("error", function sockError(err) {
		console.log("socket error: " + err.message);
	});
	
});

server.on("error", function stdSocketError(err) {
	log("stdin channel error: " + err.message, WARN);
});

server.listen(NAT_REVERSE_PORT, "127.0.0.1");

