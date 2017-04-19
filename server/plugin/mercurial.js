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
	
	localPath = UTIL.trailingSlash(localPath);

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

				saveCredentialsInHgrc(user, localPath, remote, hguser, pw, function hgrcSaved(err) {
					if (err) throw err;
					else done();
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
	
	if(localDirectory instanceof Error) return callback(localDirectory);
	
	localDirectory = UTIL.trailingSlash(localDirectory);

	var exec = require('child_process').exec;

	// Make sure we are not checking in a parent dir (that the user don't have acccess to)

	exec("hg root", { cwd: localDirectory }, function (err, stdout, stderr) {
		console.log("stderr=" + stderr);
		console.log("stdout=" + stdout);

		if(err) callback(err);
		else if(stderr) callback(stderr);
		else {
			
			var mercurialRoot = stdout.trim();
			
			if(user.rootPath) {
				if(mercurialRoot.indexOf(user.rootPath) !== 0) {
					console.warn("user.rootPath=" + user.rootPath + " mercurialRoot=" + mercurialRoot);
					return callback("Unable to find a mercurial reposity from directory=" + directory);
				}
			}
			
			var rootDir = user.toVirtualPath(mercurialRoot);
			
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
	
	localDirectory = UTIL.trailingSlash(localDirectory);

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
	
	localDirectory = UTIL.trailingSlash(localDirectory);

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
	
	localDirectory = UTIL.trailingSlash(localDirectory);

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
	// show list of changes from remote repo
	
	var directory = json.directory;
	var hguser = json.user;
	var pw = json.pw;
	var save = json.save;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	directory = UTIL.trailingSlash(directory);
	
	var localDirectory = user.translatePath(directory);
	if(localDirectory instanceof Error) return callback(localDirectory);
	
	localDirectory = UTIL.trailingSlash(localDirectory);

	var exec = require('child_process').exec;
	
	var config = (hguser != undefined && pw != undefined) ? " --config auth.x.prefix=* --config auth.x.username=" + hguser + " --config auth.x.password=" + pw : "";
	
	var execOptions = {
		encoding: 'utf8',
		timeout: 3000,
		maxBuffer: 200*1024,
		killSignal: 'SIGTERM',
		cwd: localDirectory,
		env: null,
	}
	
	exec("hg incoming --stat --noninteractive" + config, execOptions, function (err, stdout, stderr) {
		
		console.log("localDirectory=" + localDirectory);
		console.log("stdout=" + stdout);
		console.log("stderr=" + stderr);
		console.log("err=" + err);
		
		if(stdout) {
			var matchRepoUrl = stdout.match(/comparing with (.*)/);
			
			if(!matchRepoUrl) throw new Error("Can not find repo url string (matchRepoUrl=" + matchRepoUrl + ") in stdout=" + stdout);
			
			var repoUrl = matchRepoUrl[1];

			console.log("repoUrl=" + repoUrl);

			var noChanges = stdout.match(/(\r\n|\n)no changes found/);

			console.log("noChanges=" + noChanges);

		}

		if(err) {
			// It seems Mercurial "sometimes" returns exit code 1 when there's nothhing to pull !?!?
			if(!noChanges) return callback(err);
			else callback(null, {changes: null, repo: repoUrl});
		}
		else if(stderr) return callback(stderr);
		else {


			if(noChanges) {
				callback(null, {changes: null, repo: repoUrl});
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

		// We have already returned if the credentials was wrong!
		if(save) {
			console.log("Saving mercurial credentials for user.name=" + user.name + " for repoUrl=" + repoUrl);
			saveCredentialsInHgrc(user, localDirectory, repoUrl, hguser, pw, function hgrcSaved(err) {
				if (err) throw err;
				console.log(user.name + " saved Mercurial credentials for repoUrl=" + repoUrl);
			});
		}
		else console.log("save=" + save);


	});
}


MERCURIAL.pull = function hgpull(user, json, callback) {
	// pull changes from remote repo
	
	var directory = json.directory;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	directory = UTIL.trailingSlash(directory);

	var localDirectory = user.translatePath(directory);
	if(localDirectory instanceof Error) return callback(localDirectory);
	
	localDirectory = UTIL.trailingSlash(localDirectory);

	var exec = require('child_process').exec;
	exec('hg pull --noninteractive', { cwd: localDirectory }, function (err, stdout, stderr) {

		console.log("stderr=" + stderr);
		console.log("stdout=" + stdout);

		if(err) callback(err);
		else if(stderr) callback(stderr);
		else {

			// added 2 changesets with 1 changes to 1 files
			
			var matchPull = stdout.match(/added (\d+) changesets with (\d+) changes to (\d+) files/);
			var resp = {};
			var fileCount = -1;
			
			if(matchPull) {
				resp.changesets = parseInt(matchPull[1]);
				resp.changes = parseInt(matchPull[2]);

				fileCount = parseInt(matchPull[3]);
			}
			
			// Get list of files that will be affected by a "hg update"
			exec('hg status --rev tip', { cwd: localDirectory }, function (err, stdout, stderr) {
				if(err) throw err;
				else if(stderr) throw new Error("stderr=" + stderr);
				else {
					
					var affectedFiles = stdout.split(/\n|\r\n/);
					
					for(var i=0; i<affectedFiles.length; i++) affectedFiles[i] = directory + affectedFiles[i].substr(affectedFiles[i].indexOf(" ")).trim(); // Remove M, A, R, etc and add directory
					
					if(fileCount != affectedFiles.length && fileCount > -1) throw new Error("fileCount=" + fileCount + " affectedFiles (" + affectedFiles.length + ") =" + JSON.stringify(affectedFiles));
					
					resp["files"] = affectedFiles;
					
					callback(null, resp);
					
				}
				
			});
			
		}
	});
}


MERCURIAL.update = function hgupdate(user, json, callback) {
	// Update pulled changes
	
	var directory = json.directory;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	directory = UTIL.trailingSlash(directory);

	var localDirectory = user.translatePath(directory);
	if(localDirectory instanceof Error) return callback(localDirectory);
	
	localDirectory = UTIL.trailingSlash(localDirectory);

	var exec = require('child_process').exec;
	exec('hg update', { cwd: localDirectory }, function (err, stdout, stderr) {

		console.log("stderr=" + stderr);
		console.log("stdout=" + stdout);
		
		// abort: not a linear update
		
		if(err) callback(err);
		else if(stderr) callback(stderr);
		else {
	
			//if(stdout.match(/(\n|\r\n)no changes found/)) return callback(null, {changesets: 0});
			
			// 1 files updated, 0 files merged, 0 files removed, 0 files unresolved
			
			var matchUpdate = stdout.match(/(\d+) files updated, (\d+) files merged, (\d+) files removed, (\d+) files unresolved/);
			
			if(!matchUpdate) return callback(stdout);
			
			var resp = {
				updated: matchUpdate[1],
				merged: matchUpdate[2],
				removed: matchUpdate[3],
				unresolved: matchUpdate[4]
			};
			
			callback(null, resp);
			
		}
	});
}



MERCURIAL.push = function hgpush(user, json, callback) {
	// Update pulled changes
	
	var directory = json.directory;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	directory = UTIL.trailingSlash(directory);

	var localDirectory = user.translatePath(directory);
	if(localDirectory instanceof Error) return callback(localDirectory);
	
	localDirectory = UTIL.trailingSlash(localDirectory);

	var exec = require('child_process').exec;
	exec('hg push --noninteractive', { cwd: localDirectory }, function (err, stdout, stderr) {

		console.log("stderr=" + stderr);
		console.log("stdout=" + stdout);
		
		if(stdout) {

			var noChanges = stdout.match(/no changes found/);

			var matchPush = stdout.match(/pushing to (.*)/);

			var repoUrl = matchPush ? matchPush[1] : null;

		}

		console.log("repoUrl=" + repoUrl);

		if(err) callback(err);
		else if(stderr) callback(stderr);
		else {
			
			if(noChanges) {
				callback(null, {changesets: null, remote: repoUrl});
			}
			else {
				// added 2 changesets with 1 changes to 1 files
				
				var matchUpdate = stdout.match(/remote: added (\d+) changesets with (\d+) changes to (\d+) files/);
				
				if(!matchUpdate) return callback(stdout);
				else {
					var resp = {
						changesets: matchUpdate[1],
						changes: matchUpdate[2],
						files: matchUpdate[3],
						remote: repoUrl
					};
					
					callback(null, resp);
				}

			}
		}
	});
}


// Hg merge, 3 files updated, 0 files merged, 0 files removed, 0 files unresolved






function saveCredentialsInHgrc(user, directory, remote, hguser, pw, callback) {

	// directory does not have to be the root directory. It has to be a local/real (non virtual) directory.

	directory = UTIL.trailingSlash(directory);

	console.log("saveCredentialsInHgrc: user.name=" + user.name + " directory=" + directory + " remote=" + remote + " hguser=" + hguser + " pw.length=" + pw.length);

	var exec = require('child_process').exec;

	exec("hg root", { cwd: directory }, function (err, stdout, stderr) {
		console.log("stderr=" + stderr);
		console.log("stdout=" + stdout);
		
		if(err) callback(err);
		else if(stderr) callback(stderr);
		else {
			
			var mercurialRoot = UTIL.trailingSlash(stdout.trim());
			
			if(user.rootPath) {
				if(mercurialRoot.indexOf(user.rootPath) !== 0) {
					console.warn("user.rootPath=" + user.rootPath + " mercurialRoot=" + mercurialRoot);
					return callback("Unable to find a mercurial reposity from directory=" + directory);
				}
			}
			
			var rootDir = user.toVirtualPath(mercurialRoot);
			
			if(rootDir instanceof Error) callback("Unable to find a mercurial reposity from directory=" + directory);
			else {
	
				var hgrc = mercurialRoot + ".hg/hgrc";
				console.log("Saving credentials in hgrc: " + hgrc);
				var fs = require('fs')
				fs.readFile(hgrc, 'utf8', function (err,data) {
					if (err) throw err;
					
					var repoWithoutProtocol = remote.replace(/^.*:\/\//, "");
					
					data += "\n[auth]\nfoo.prefix = " + repoWithoutProtocol + "\nfoo.username = " + hguser + "\nfoo.password = " + pw + "\n";
					
					fs.writeFile(hgrc, data, 'utf8', function (err) {
						if (err) callback(err);
						else callback(null);
					});
				});
			}

		}

	});
}






module.exports = MERCURIAL;