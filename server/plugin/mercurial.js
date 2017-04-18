/*

	Mercurial Distributed SCM (version 3.7.3)
	(see https://mercurial-scm.org for more information)

*/

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
	var save = json.save;
	
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

			if(save) {

				var hgrc = localPath + ".hg/hgrc";
				console.log("Saving credentials in hgrc: " + hgrc);
				var fs = require('fs')
				fs.readFile(hgrc, 'utf8', function (err,data) {
				  if (err) throw err;

				  var repoWithoutProtocol = remote.replace(/^.*:\/\//, "");

				  data += "\n[auth]\nfoo.prefix = " + repoWithoutProtocol + "\nfoo.username = " + hguser + "\nfoo.password = " + pw + "\n";

				  fs.writeFile(hgrc, data, 'utf8', function (err) {
				     if (err) throw err;
				     else done();
				  });
				});

			} else done();

			function done() {callback(null, {path: local});}
			
		}
	});
}



MERCURIAL.status = function hgstatus(user, json, callback) {
	// show changed files in the working directory
	
	var directory = json.directory;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	var localDirectory = user.translatePath(directory);
	
	if(directory instanceof Error) return callback(directory);
	
	var exec = require('child_process').exec;

	// Make sure we are not checking in a parent dir (that the user don't have acccess to)

	exec("hg root", { cwd: localDirectory }, function (err, stdout, stderr) {
		console.log("stderr=" + stderr);
		console.log("stdout=" + stdout);

		if(err) callback(err);
		else if(stderr) callback(stderr);
		else {
			var rootDir = user.toVirtualPath(stdout.trim());

			if(rootDir instanceof Error) callback("Unable to find a mercurial reposity from directory=" + directory);
			else {

				exec("hg status", { cwd: localDirectory }, function (err, stdout, stderr) {

					console.log("stderr=" + stderr);
					console.log("stdout=" + stdout);

					if(err) callback(err);
					else if(stderr) callback(stderr);
					else {
						
						var modified = [];
						var untracked = [];
						
						var files;
						
						if(stdout.indexOf("\r\n") != -1) files = stdout.split("\r\n");
						else files = stdout.split("\n");
						
						for(var attr, path, i=0; i<files.length-1; i++) {
							attr = files[i].substring(0, files[i].indexOf(" "));
							path = files[i].substring(attr.length + 1);
							
							if(attr == "?") untracked.push(path);
							else if(attr == "M") modified.push(path);
							else throw new Error("Unknown status attr=" + attr + " for path=" + path + "\nfile=" + files[i]);
						}
						
						callback(null, {modified: modified, untracked: untracked, rootDir: rootDir});
						
					}
				});
			} 
		}

		

	});

	
}


MERCURIAL.add = function hgadd(user, json, callback) {
	// add the specified files on the next commit
	
	var directory = json.directory;
	var files = json.files;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	if(files == undefined) return callback(new Error("No files defined"));
	
	directory = UTIL.trailingSlash(directory);
	
	var localDirectory = user.translatePath(directory);
	if(localDirectory instanceof Error) return callback(localDirectory);
	
	var fileString = "";
	for(var i=0, localPath; i<files.length; i++) {
		localPath = user.translatePath(directory + files[i]);
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
	
	if(Object.prototype.toString.call( files ) !== '[object Array]') return callback("Expected files to be an array of files");

	//if(files.length == 0) return callback("No files specified for commit");


	directory = UTIL.trailingSlash(directory);

	var localDirectory = user.translatePath(directory);
	if(localDirectory instanceof Error) return callback(localDirectory);
	
	var fileString = "";
	for(var i=0, localPath; i<files.length; i++) {
		localPath = user.translatePath(directory + files[i]);
		if(localPath instanceof Error) return callback(localPath);
		fileString += ' "' + localPath + '"';
	}
	
	var exec = require('child_process').exec;
	exec('hg commit -m "' + message + '"' + fileString, { cwd: localDirectory }, function (err, stdout, stderr) {

		console.log("stderr=" + stderr);
		console.log("stdout=" + stdout);

		if(stdout == "nothing changed") return callback("Nothing has been changed! Did you forget to add files ?");

		if(err) callback(err);
		else if(stderr) callback(stderr);
		else {
			
			if(stdout != "") callback(stdout);
			else callback(null, {directory: directory});
			
		}
	});
}

MERCURIAL.incoming = function hgincoming(user, json, callback) {
	// add the specified files on the next commit
	
	var directory = json.directory;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	directory = UTIL.trailingSlash(directory);
	
	var localDirectory = user.translatePath(directory);
	if(localDirectory instanceof Error) return callback(localDirectory);
	
	var exec = require('child_process').exec;
	exec("hg incoming --noninteractive --stat", { cwd: localDirectory }, function (err, stdout, stderr) {
		console.log("stdout=" + stdout);
		console.log("stderr=" + stderr);
		
		if(err) callback(err);
		else if(stderr) callback(stderr);
		else {
			
			var matchRepoUrl = stdout.match(/comparing with (.*)/);
			
			if(!matchRepoUrl) throw new Error("Can not find repo url string (matchRepoUrl=" + matchRepoUrl + ") in stdout=" + stdout);
			
			var repoUrl = matchRepoUrl[2];
			
			console.log("repoUrl=" + repoUrl);
			
			if(stdout.match(/no changes found/)) {
				callback(null, {changes: null});
			}
			else {
				var searchingChangesStr = "searching for changes";
				var indexSearchingChanges = stdout.indexOf(searchingChangesStr);
				
				if(indexSearchingChanges == -1) throw new Error("Can not find string '" + searchingChangesStr + "' in stdout=" + stdout);
				
				var strChanges = stdout.substr(indexSearchingChanges + searchingChangesStr.length);
				
				strChanges = strChanges.trim();
				
				var arrChanges = strChanges.split(/(\r\n|\n)\s*(\r\n|\n)/); // Two line breaks (can have spaces between)
				
				console.log("arrChanges.length=" + arrChanges.length);
				
				for(var i=0; i<arrChanges.length; i++) {
					console.log("arrChanges[" + i + "]=" + arrChanges[i]);
					while(arrChanges[i].match(/^(\r\n|\n)$/)) arrChanges.splice(i, 1); // Remove emty sets
				}
				console.log("arrChanges=" + JSON.stringify(arrChanges, null, 2));
				
				var objChanges = {};
				var obj;
							
				
				for(var i=0; i<arrChanges.length; i+=2) {
					arrChanges[i] = arrChanges[i].split(/\r\n|\n/);
					
					for (var j=0; j<arrChanges[i].length; j++) {

						var name = arrChanges[i][j].substr(0, arrChanges[i][j].indexOf(":"));
						var value = arrChanges[i][j].substr(arrChanges[i][j].indexOf(":")+1).trim();
						console.log("name=" + name);
						console.log("value=" + value);
						
						if(name == "changeset") obj = objChanges[value] = {};
						else obj[name] = value;
					
					}
					
					var matchStat = arrChanges[i+1].match(/ \d+ files changed, \d+ insertions\(\+\), \d+ deletions\(-\)$/);
					
					if(!matchStat) throw new Error("Did not find change stats! arrChanges=" + JSON.stringify(arrChanges, null, 2));
					
					obj["files"] = {};
					var strStat = arrChanges[i+1].substring(0, matchStat.index).trim();

					console.log("strStat=" + strStat);
					var arrFiles = strStat.split(/\r\n|\n/);
					console.log("arrFiles=" + JSON.stringify(arrFiles));
					for(var f=0; f<arrFiles.length; f++) {
						arrFiles[f] = arrFiles[f].split(" | ");

						var fileName = arrFiles[f][0].trim();
						var filePath = directory + fileName;
						var changeCount = parseInt(arrFiles[f][1]);
						
						console.log("fileName=" + fileName);
						console.log("changeCount=" + changeCount);
						
						obj["files"][filePath] = changeCount;
						
					}
				}
			
				console.log("objChanges=" + JSON.stringify(objChanges, null, 2));
				
				callback(null, {changes: objChanges, repo: repoUrl});
				
			}
		}
	});
}

module.exports = MERCURIAL;