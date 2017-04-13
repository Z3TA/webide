"use strict";

var UTIL = require("../../client/UTIL.js");
var CORE = require("../server_api.js");

var MERCURIAL = {};


MERCURIAL.clone = function hgclone(user, json, callback) {
	// Clone a remote repository
	
	var local = json.local;
	var remote = json.remote;
	var hguser = json.user;
	var pw = json.pw;
	var saveCredentials = json.saveCredentials;
	
	if(!local) callback(new Error("A local directory need to be specified! local=" + local));
	if(!remote) callback(new Error("A remote URL need to be specified! remote=" + remote));
	
	var localPath = user.translatePath(local);
	
	if(localPath instanceof Error) return callback(localPath);
	
	var config = " --config auth.x.prefix=* --config auth.x.username=" + hguser + " --config auth.x.password=" + pw;
	
	console.log("process.env.PATH=" + process.env.PATH);

	/*
		Using cwd in Linux will result in Error: spawn /bin/sh ENOENT !
	*/

	var exec = require('child_process').exec;
	exec("hg clone " + remote + " " + localPath + config, function (err, stdout, stderr) {

		console.log("stderr=" + stderr);
		console.log("stdout=" + stdout);

		if(err) {
			
			var destinationNotEmpty = stderr.match(/abort: destination '(.*)' is not empty/);
			
			if(destinationNotEmpty) {
				callback(new Error("The destination folder is not empty: " + local + destinationNotEmpty[1]));
			}
			else callback(err);

		}
		else if(stderr) {

			if(stderr.match(/: No such file or directory$/)) {
				callback("Directory does not exist: " + local);
			}			

			else callback(stderr);
		}
		else {
			
			/*
			var matchDir = stdout.match(/destination directory: (.*)/);
			var dir;
			
			if(matchDir) {
				if(matchDir.length == 4) dir = matchDir[1];
			}
			
			if(!dir) throw new Error("stdout does not contain destination directory! stdout=" + stdout + " matchDir=" + JSON.stringify(matchDir, null, 2));
			
			var path = user.toVirtualPath(dir);
			*/
			
			callback(null, {path: local});
			
		}
	});
}



MERCURIAL.status = function hgstatus(user, json, callback) {
	// show changed files in the working directory
	
	var directory = json.directory;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	directory = user.translatePath(directory);
	
	if(directory instanceof Error) return callback(directory);
	
	var exec = require('child_process').exec;
	exec("hg status", { cwd: directory }, function (err, stdout, stderr) {
		if(err) callback(err);
		else if(stderr) callback(stderr);
		else {
			
			var modified = [];
			var untracked = [];
			
			var files;
			
			if(stdout.indexOf("\r\n") != -1) files = stdout.split("\r\n");
			else files = stdout.split("\n");
			
			for(var attr, path, i=0; i<files.length; i++) {
				attr = files[i].substring(0, files[i].indexOf(" "));
				path = files[i].substring(attr.length + 1);
				
				if(attr == "?") untracked.push(path);
				else if(attr == "M") modified.push(path);
				else throw new Error("Unknown status attr=" + attr + " for path=" + path + "\nstdout=" + stdout);
			}
			
			callback(null, {modified: modified, untracked: untracked});
			
		}
	});
}


MERCURIAL.add = function hgadd(user, json, callback) {
	// add the specified files on the next commit
	
	var directory = json.directory;
	var files = json.files;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	if(files == undefined) return callback(new Error("No files defined"));
	
	
	var localDirectory = user.translatePath(directory);
	if(localDirectory instanceof Error) return callback(localDirectory);
	
	var fileString = "";
	for(var i=0, localPath; i<files.length; i++) {
		localPath = user.translatePath(files[i]);
		if(localPath instanceof Error) return callback(localPath);
		fileString += ' "' + localPath + '"';
	}
	
	var exec = require('child_process').exec;
	exec("hg add" + fileString, { cwd: localDirectory }, function (err, stdout, stderr) {
		if(err) callback(err);
		else if(stderr) callback(stderr);
		else {
			
			if(stdout != "") callback(stdout);
			else callback(null, {files: files});
			
		}
	});
}

MERCURIAL.init = function hginit(user, json, callback) {
	// create a new repository in the given directory
	
	var directory = json.directory;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	var localDirectory = user.translatePath(directory);
	if(localDirectory instanceof Error) return callback(localDirectory);
	
	var exec = require('child_process').exec;
	exec("hg init", { cwd: localDirectory }, function (err, stdout, stderr) {
		if(err) callback(err);
		else if(stderr) callback(stderr);
		else {
			
			if(stdout != "") callback(stdout);
			else callback(null, {directory: directory});
			
		}
	});
}


MERCURIAL.commit = function hgcommit(user, json, callback) {
	// commit the specified files or all outstanding changes
	
	var directory = json.directory;
	var files = json.files;
	var message = json.message;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	if(files == undefined) return callback(new Error("No files defined"));
	if(message == undefined) return callback(new Error("No message defined"));
	
	
	var localDirectory = user.translatePath(directory);
	if(localDirectory instanceof Error) return callback(localDirectory);
	
	var fileString = "";
	for(var i=0, localPath; i<files.length; i++) {
		localPath = user.translatePath(files[i]);
		if(localPath instanceof Error) return callback(localPath);
		fileString += ' "' + localPath + '"';
	}
	
	var exec = require('child_process').exec;
	exec('hg commit -m "' + message + '"' + fileString, { cwd: localDirectory }, function (err, stdout, stderr) {
		if(err) callback(err);
		else if(stderr) callback(stderr);
		else {
			
			if(stdout != "") callback(stdout);
			else callback(null, {directory: directory});
			
		}
	});
}


module.exports = MERCURIAL;