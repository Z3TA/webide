
function main() {
	
	var express = require('express');
	var httpServer = express();
	
	// Parse JSON body
	var bodyParser = require('body-parser');
	httpServer.use(bodyParser.json());
	httpServer.use('/', express.static('client'));
	
	
	var server;
	var sendPush;
	getKeys(function(err, keys) {
		if(err) throw err;
		
		server = startServer(httpServer, serverRunning);
		sendPush = makeSendPush(keys);
		
		var publicKey = keys.publicKey;
		
		httpServer.get("/api/publicKeyPlease", function(req, res) {
			console.log("Got public key request from client ...");
			res.status(200).send({publicKey: publicKey});
		});
		
	});
	
	function serverRunning(err, url) {
		if(err) throw err;
		
		console.log("PWA push notifications example server listening on " + url);
	}
	
	
	httpServer.post("/api/pushSubscription", function(req, res) {
		
		var pushSubscription = req.body.subscription;
		
		console.log("Got push subscription from client: " + JSON.stringify(pushSubscription));
		
		res.status(200).send({success: true});
		
		sendPush("Server got push subscription!", pushSubscription);
		
	});
}

function makeSendPush(keys) {
	return function sendPush(msg, pushSubscription, cb) {
		var options = {
			vapidDetails: {
				// Put your e-mail, or URL to contact page in subject. More info: https://tools.ietf.org/html/draft-thomson-webpush-vapid-02
				subject: 'mailto: ' + process.env.myName + "@" + process.env.tld,
				
				publicKey: keys.publicKey,
				privateKey: keys.privateKey
			},
			TTL: 60 * 60 // 1 hour in seconds.
		};
		
		var webpush = require('web-push');
		webpush.sendNotification(pushSubscription, msg, options).then(success).catch(fail);
		
		function success() {
			console.log("Push sent: " + msg);
			if(cb) cb(null);
		}
		
		function fail(err) {
			console.log("Failed to send push msg=" + msg + "Error: " + err.message);
			if(cb) cb(err);
		}
	}
}

function getKeys(cb) {
	// Will call back with {publicKey, privateKey}
	
	var keys;
	var fs = require("fs");
	var fileName = "keys.dat";
	fs.readFile(fileName, "utf8", function(err, data) {
		if(err) {
			if(err.code == "ENOENT") {
				generate();
				return;
			}
			else {
				if(cb) return cb(err);
				else throw err; // Unexpected error
			}
		}
		else {
			try {
				var keys = JSON.parse(data);
			}
			catch(err) {
				console.warn("Unable to parse: " + err.message);
				generate();
				return;
			}
			cb(null, keys);
		}
	});
	
	function generate() {
		console.log("Generating new keys!");
		var webpush = require('web-push');
		keys = webpush.generateVAPIDKeys();
		
		cb(null, keys);
		
		var data = JSON.stringify(keys);
		fs.writeFile(fileName, data, function(err) {
			if(err) throw err;
			console.log("Keys saved!");
		});
	}
}

function startServer(httpServer, cb) {
	if(process.env.myName) {
		var appName = "PushNoti".toLowerCase();
		var unixSocket = "/sock/" + appName;
	}
	else {
		var port = 8000;
	}
	
	// Change the umask so that the unix socket created will be accessible by www-data
	var newMask = parseInt("0007", 8); // four digits, last three mask, ex: 0o027 => 750 file permissions
	var oldMask = process.umask(newMask);
	console.log("Changed umask from " + oldMask.toString(8) + " to " + newMask.toString(8));
	
	if(unixSocket) {
		var url = "http://" + appName + "." + process.env.myName + "." + process.env.tld;
	}
	else {
		var url = "http://localhost:" + port + "/";
	}
	
	return httpServer.listen(unixSocket || port, function(err) {
		if(err) {
			if(cb) return cb(err);
			else throw err;
		}
		
		if(cb) cb(null, url);
	});
	
}

main();