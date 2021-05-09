"use strict";

/*

	Note: Git is not meant to be used in scripts. Git want to interact with a pty!

*/

var UTIL = require("../../client/UTIL.js");
var CORE = require("../server_api.js");
var module_which = require('which')

var module_child_process = require('child_process');
var execFile = module_child_process.execFile;

var module_stream = require('stream');

var gitBin = "git";

var GIT = {};

var GIT_PATH = "git";

module_which("git", function(err, path) {
	if(err) {

		console.warn("Unable to find git in process.env.HOME=" + process.env.HOME);

		console.error(err);
	}
	else {
		GIT_PATH = path;
	}
});

var execFileOptions = {
	env: {
		HOME: process.env.HOME || "/",
		ENCODING: "utf-8",
		PATH: process.env.PATH || "/usr/bin:/bin/"
	}
}

if( process.platform == "win32" ) {
	//execFileOptions.env.APPDATA = process.env.APPDATA;
	execFileOptions.env = process.env;
}

console.log("execFileOptions=" + JSON.stringify(execFileOptions));

GIT.checkout = function gitCheckout(user, json, callback) {
	
	var directory = UTIL.trailingSlash(json.directory);
	if(directory == undefined) directory = user.workingDirectory;

	var branchCommitOrPath = [json.name];

	execFile(GIT_PATH, ["checkout"].concat(branchCommitOrPath), { cwd: directory, env: execFileOptions.env }, function (err, stdout, stderr) {
		if(err) callback(err);
		else if(stderr) callback(stderr);
		else {

			// git diff --name-status HEAD@{1} HEAD



			if(stdout != "") callback(stdout);
			else callback(null, {});

		}
	});

}

GIT.clone = function gitClone(user, json, callback) {

	var repo = json.repo;
	if(repo == undefined) return callback(new Error("What repository (repo) to clone?!? repo=" + repo + " "));

	var directory = UTIL.trailingSlash(json.directory);
	if(directory == undefined) directory = user.workingDirectory;
	
	var reHttp = /(https?):\/\/(.*)/i;
	var matchHttp = repo.match(reHttp);

	if(json.username && matchHttp) {
		repo = matchHttp[1] + "://" + json.username + ":" + json.password + "@" + matchHttp[2];
	}

	console.log(json.password);

	var progressInterval = setInterval(sendProgress, 500);

	// Using spawn instead of exec because clone might take a long time...

	var messageLog = [];

	var gitArg = ["clone", repo, "--progress"];
	var gitOptions = {
		cwd: directory, 
		env: execFileOptions.env
	};
	var gitClone = module_child_process.spawn(gitBin, gitArg, gitOptions);
	
	gitClone.stdout.setEncoding('utf8');
	
	gitClone.on("close", function (code, signal) {
		console.log("gitClone close: code=" + code + " signal=" + signal);

		user.send({progress: []}); // Finish

		if(!callback) return;

		if(code == 0) callback(null);
		else if(messageLog.length > 0) callback(   new Error( messageLog.reverse().join("\n") )   );
		else callback(new Error("Unknown clone error: Exit code=" + code));

		callback = null;

		clearInterval(progressInterval);

	});

	gitClone.on("disconnect", function () {
		console.log("gitClone disconnect: gitClone.connected=" + gitClone.connected);
	});

	gitClone.on("error", function (err) {
		console.log(" gitClone error: err.message=" + err.message);
		console.error(err);
		if(callback) {
			callback(err);
			callback = null;
		}
	});

	// note: Moste messages will be in stderr!

	gitClone.stdout.on("data", function(data) {
		//console.log(" gitClone stdout: " + data);
		bufferData(data, "stdout");
	});

	var dataBuffer = {
		stderr: "",
		stdout: ""
	}

	var lastMsg = "";

	gitClone.stderr.on("data", function (data) {
		//console.log(" gitClone stderr: " + data);

		bufferData(data, "stderr");

	});

	gitClone.stdout.on('end', function(data) {
		console.log(" gitClone stdout end! data=" + data);
		bufferData(data, "stdout", true);
	});

	gitClone.stderr.on('end', function(data) {
		console.log(" gitClone stdout end! data=" + data);
		bufferData(data, "stderr", true);
	});


	// git uses carrige return as line delimiters, but we can't be sure

	var reLine = /\r\n|\n|\r/;

	function indexOfLineBreak(str) {
		var match = str.match(reLine);
		if(match) return [match.index, match[0].length];
		else return [-1, 0];
	}

	function bufferData(data, type, end) {

		//console.log(" gitClone bufferData type=" + type + " end=" + end + " data.length=" + (data && data.length) + " dataBuffer.length=" + dataBuffer[type].length);

		if(data != undefined) {
			var str = data.toString();
			dataBuffer[type] += str;

			//console.log(UTIL.lbChars(str));
		}

		var lineIndex = indexOfLineBreak(dataBuffer[type]);

		//console.log("lineIndex=" + JSON.stringify(lineIndex));

		var counter = 0;

		while(lineIndex[0] != -1 && ++counter < 1000) {
			var msg = dataBuffer[type].slice(0, lineIndex[0]);
			dataBuffer[type] = dataBuffer[type].slice(lineIndex[0]+lineIndex[1]);

			checkMsg(msg);

			lineIndex = indexOfLineBreak(dataBuffer[type]);
		}

		if(end) {
			checkMsg(dataBuffer[type]);
		}
	}

	/*

		remote: Compressing objects:  26% (41/157)
		Receiving objects:  99% (10605/10654)
		Resolving deltas:  98% (5851/5955)
		Checking out files:  99% (1427/1441)

	*/
	var reProgress = /^(.*):\ *(\d+)% \((\d+)\/(\d+)\)/;
	var progressTypes = {};

	var progressInc = 0;
	var progressTotalInc = 0;

	function checkMsg(msg) {

		console.log("gitClone checkMsg: msg=" + msg);

		var matchProgress = msg.match(reProgress);
		if(matchProgress) {

			//console.log(matchProgress);

			var pType = matchProgress[1];
			var pPerc = UTIL.numberOrError(matchProgress[2]);
			var pAcc =  UTIL.numberOrError(matchProgress[3]);
			var pTot =  UTIL.numberOrError(matchProgress[4]);

			if( !progressTypes.hasOwnProperty(pType) ) {
				progressTypes[pType] = {acc: pAcc, tot: pTot}
				
				progressInc += pAcc;
				progressTotalInc += pTot;

				console.log("progressInc=" + progressInc + " pAcc=" + pAcc + " progressTotalInc=" + progressTotalInc + " pType=" + pType);

			}
			else {
				var pInc = pAcc - progressTypes[pType].acc;
				var ptInc = pTot - progressTypes[pType].tot;

				progressTypes[pType].acc = pAcc;

				if(ptInc > 0) throw new Error("ptInc=" + ptInc + " pTot=" + pTot + " pInc=" + pInc + " progressTypes[" + pType + "]=" + JSON.stringify(progressTypes[pType])  );

				progressInc += pInc;
				
				console.log("progressInc=" + progressInc + " pInc=" + pInc + " pType=" + pType);

			}

		}

		if(msg != undefined && msg.length > 0) {
			messageLog.unshift(msg);
			if(messageLog.length > 10) messageLog.length = 10;

		}
	}

	function sendProgress() {
		if(progressInc == 0) return;
		user.send({ progress: [progressInc, progressTotalInc] });
		progressInc = 0;
		progressTotalInc = 0;
	}

}


function check(fun) {
	// some boilerplate code that checks root dir etc...



}

module.exports = GIT;

