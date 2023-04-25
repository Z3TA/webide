#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

httpGet("https://nodejs.org/en", function(err, str) {
	if(err) throw err;

	var reLTS = /Download (\d+\.\d+\.\d+) LTS/;
	var match = str.match(reLTS);

	if(match == null) throw new Error("Can't find reLTS=" + reLTS + " in str=" + str + " str.length=" + str.length);

	//console.log(match);

	var latestVersion = "v" + match[1];
	var currentVersion = process.version;

	//if(latestVersion != currentVersion) throw new Error("Update dev enviroment (" + currentVersion + ") to latest LTS " + latestVersion + " and run tests before upgrading/releasing!");

	console.log(latestVersion);
});


function httpGet(url, callback) {
	var https = require('https');

	var req = https.get(url, httpResponse);

	req.on("error", function(err) {
		callback(err);
		callback = null;
	});

	function httpResponse(res) {
		var data = [];

		var headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
		//console.log('Status Code:', res.statusCode);
		//console.log('Date in Response header:', headerDate);

		res.on('data', function(chunk) {
			data.push(chunk);
		});

		res.on('end', function() {
			var str = Buffer.concat(data).toString();

			if(str.length == 0) return callback(  new Error( "res.statusCode=" + res.statusCode + " Empty data! headers: " + JSON.stringify(res.headers, null, 2) )  );

			callback(null, str);
		});
	}
}
