
var privateKey = "wlnoFHclwcqe3Vs3sG26gPqlu5TbBG0qWijycwrxFck";


var module_webpush = require('web-push');

function main() {

	var express = require('express');
	var httpServer = express();
	
	// Parse JSON body
	var bodyParser = require('body-parser');
	httpServer.use(bodyParser.json());
	httpServer.use('/', express.static('client'));
	
	getKeys(function(err, keys) {

		var server = startServer(httpServer, serverRunning);
		
});
	
	
	
	function serverRunning(err, url) {
		if(err) throw err;
		
		console.log("PWA push notifications example server listening on " + url);
		
	}
	
	
	httpServer.post('/api/send-push-msg', (req, res) => {
		const options = {
			vapidDetails: {
				subject: 'https://developers.google.com/web/fundamentals/',
				publicKey: req.body.applicationKeys.public,
				privateKey: req.body.applicationKeys.private
			},
			// 1 hour in seconds.
			TTL: 60 * 60
		};
		
		module_webpush.sendNotification(req.body.subscription, req.body.data, options).then(() => {
			res.status(200).send({success: true});
		}).catch((err) => {
			if (err.statusCode) {
				res.status(err.statusCode).send(err.body);
			} else {
				res.status(400).send(err.message);
			}
		});
	});
	
	
	
	
	
}






function getKeys(cb) {
	var keys;
	var fs = require("fs");
	var fileName = "keys.dat";
	fs.readFile(fileName, "utf8", function(err, data) {
		if(err) {
			if(err.code == "ENOENT") generate();
			else throw err; // Unexpected error
		}
		else {
			try {
				var keys = JSON.parse(data);
			}
			catch(err) {
				console.warn("Unable to parse: " + err.message);
				generate();
			}
		}
		cb(null, keys);
	});
	
	function generate() {
		console.log("Generating new keys!");
		keys = module_webpush.generateVAPIDKeys();
		var data = JSON.stringify(keys);
		fs.writeFile(fileName, data, function(err) {
			if(err) throw err;
			console.log("Keys saved!");
		});
		
	}
	
}

function startServer(httpServer, cb) {
	if(process.env.myName) {
		var appName = "PushNoti";
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
