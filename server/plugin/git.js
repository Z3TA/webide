"use strict";

var UTIL = require("../../client/UTIL.js");
var CORE = require("../server_api.js");
var module_which = require('which')

var module_child_process = require('child_process');
var execFile = module_child_process.execFile;

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

	var user = json.username;
	var pw = json.password;

	var gitArg = ["clone", repo];
	var gitOptions = { cwd: directory, env: execFileOptions.env };
	var gitClone = module_child_process.spawn(gitBin, gitArg, gitOptions);
	

	gitClone.on("close", function (code, signal) {
		console.log("gitClone close: code=" + code + " signal=" + signal);
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

	gitClone.stdout.on("data", function(data) {
		console.log(" gitClone stdout: " + data);

		var str = data.toString();

		if( str.match(/Username for.*/) ) {
			console.log(" gitClone: Writing username to stdin... ");
			gitClone.stdin.write(json.username + "\n");
		}
		else if( str.match(/Password.*/) ) {
			console.log(" gitClone: Writing password to stdin... ");
			gitClone.stdin.write(json.password + "\n");
		}
		else {
			console.log(" gitClone: No match for str=" + str);
		}
		
	});

	gitClone.stderr.on("data", function (data) {
		console.log(" gitClone stderr: " + data);

		var str = data.toString();

		
	});

}



function check(fun) {
	// some boilerplate code that checks root dir etc...



}

module.exports = GIT;

