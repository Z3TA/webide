/*
	
	Mercurial Distributed SCM (version 3.7.3)
	(see https://mercurial-scm.org for more information)
	
	
	Get current revision:
	hg --debug id -i
	
	Get file changes from one revision to another revision
	hg log foo.txt -r 15:tip
	
	Get heads (multiple heads means a merge is needed)
	hg heads --topo
	
	List files that need to merge:
	hg resolve --list
	
	To detect possible merge conflicts:
	hg clone B C && cd C && hg merge
	
	When cloning a repo you do not get uncommited changes!!
	
	
	
*/

"use strict";

var UTIL = require("../../client/UTIL.js");
var CORE = require("../server_api.js");

var MERCURIAL = {};

var execFileOptions = {
	env: {
		HOME: "/",
		HGENCODING: "utf-8"
	}
}

MERCURIAL.clone = function hgclone(user, json, callback) {
	// Clone a remote repository
	
	var local = json.local;
	var remote = json.remote;
	var hguser = json.user;
	var pw = json.pw;
	var save = json.save;
	
	if(!local) return callback(new Error("A local directory need to be specified! local=" + local));
	if(!remote) return callback(new Error("A remote URL need to be specified! remote=" + remote));
	
	var localPath = user.translatePath(local);
	
	if(localPath instanceof Error) return callback(localPath);
	
	localPath = UTIL.trailingSlash(localPath);
	
	//if(localPath.split(/\/|\\/).length < 4) return callback(new Error("Can not clone into a root folder. Use an intermediary directly like /repo" + localPath + ""));
	
	// First make sure that a Mercurial repo does Not already exist at the target locatino
	CORE.listFiles(user, {pathToFolder: localPath}, function(err, fileList) {
		
		if(err) {
			if(err.code == "ENOENT") clone();
			else callback(err);
		}
		else {
			for (var i=0; i<fileList.length; i++) {
				if(fileList[i].name == ".hg") return callback( new Error(".hg folder already exist in " + localPath) );
			}
			clone();
		}
	}); 
	
	function clone() {
		var config = ["--config", "auth.x.prefix=*", "--config", "auth.x.username=" + hguser, "--config", "auth.x.password=" + pw];
		
		//console.log("process.env.PATH=" + process.env.PATH);
		
		/*
			Using cwd in Linux will result in Error: spawn /bin/sh ENOENT !
		*/
		
		//var execFile = require('child_process').execFile;
		var arg = ["clone"];
		
		//arg.push("--verbose");
		//arg.push("--debug");
		if(json.noCertCheck) arg.push("--insecure");
		
		arg.push(remote);
		arg.push(localPath);
		
		if(hguser) arg = arg.concat(config);
		
		var spawn = require('child_process').spawn;
		console.log("Spawning hg with arg=" + JSON.stringify(arg));
var clone = spawn("hg", arg, {env: execFileOptions.env, shell: false});
var stdout = "";
var stderr = "";

var progressCounter = 0;
var progressMax = 30;

user.send({mercurialProgress: {max: progressCounter,value: Math.max(progressCounter, progressMax)}});

var progressInterval = setInterval(function() {
progressCounter++;
progressMax++;
			user.send({mercurialProgress: {max: progressCounter,value: Math.max(progressCounter, progressMax)}});
}, 500); // Fake progress

clone.stdout.on('data', function cloneStdout(data) {
stdout += data;

console.log("clone stdout data=" + data);

/*
todo: Better estimation on progress!

Total 33 (delta 10), reused 19 (delta 0), pack-reused 4
importing git objects into hg
committing files:
LICENSE
README.md
committing manifest
committing changelog
committing files:
server.js
committing manifest
committing changelog

*/
progressCounter++;

			user.send({mercurialProgress: {max: progressCounter, value: Math.max(progressCounter, progressMax)}});
});

clone.stderr.on('data', function cloneStderr(data) {
stderr += data;
});

clone.on('error', function cloneError(err) {
console.log("clone error stdout=" + stdout);
console.log("clone error stderr=" + stderr);

			var destinationNotEmpty = stderr.match(/abort: destination '(.*)' is not empty/);
				
				if(destinationNotEmpty) {
				cloneDone(new Error("The destination folder is not empty: " + local + destinationNotEmpty[1]));
				}
			else if(stderr) cloneDone(err);
				
			user.send({mercurialProgress: {max: 1, value: 1}});

});

clone.on('close', function cloneClose(exitCode) {
if(stdout.length < 500) console.log("hg clone stdout=" + stdout);
else console.log("hg clone stdout=" + stdout.slice(0,500) + " ... (" + stdout.length + " characters)");

			//console.log("hg clone stdout=" + stdout);
			console.log("hg clone stderr=" + stderr + " stderr.length=" + (stderr.length));

			console.log("hg clone exitCode=" + exitCode);
			console.log("hg clone exitCode != 0 ? " + (exitCode != 0) + " stderr ? " + !!stderr);
			
		//execFile("hg", arg, execFileOptions, function (err, stdout, stderr) {
			//console.log("hg clone err=" + err + "stderr=" + stderr + " stdout=" + stdout + " arg=" + JSON.stringify(arg));
			
			if(arg.indexOf("--insecure") != -1) {
				// Ignore the warning
				stderr = stderr.replace(/warning: (.*) certificate with fingerprint (.*) not verified \(check hostfingerprints or web.cacerts config setting\)/g, "").trim();
			}
			
			if(stderr) {
				
				if(stderr.match(/: No such file or directory$/)) {
					cloneDone("Directory does not exist: " + local);
				}			
				else cloneDone(stderr);
			
			}
			else if(exitCode != 0) {
				cloneDone("Clone failed with exit code " + exitCode);
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
						else cloneDone();
					});
					
				} else cloneDone();
				
				
			}
		});
		
		function cloneDone(errorMessage) {
			if(callback === null) throw new Error("clone callback already called!");
			
			clearInterval(progressInterval);
			user.send({mercurialProgress: {max: progressCounter, value: progressCounter}});
			
			if(errorMessage) callback(new Error(errorMessage));
			else callback(errorMessage, {path: local});
				
			callback = null;
			}
	}
}


MERCURIAL.status = function hgstatus(user, json, callback) {
	// show changed files in the working directory
	
	if(process.getuid) console.log("I am uid=" + process.getuid());
	
	var directory =json.directory;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	if(typeof directory != "string") throw new Error("directory=" + directory + " (" + typeof directory + ") needs to be a string!");
	directory = UTIL.trailingSlash(json.directory);
	
	var localDirectory = user.translatePath(directory);
	if(localDirectory instanceof Error) return callback(localDirectory);
	localDirectory = UTIL.trailingSlash(localDirectory);
	
	var execFile = require('child_process').execFile;
	
	console.log("hg.status checkDir: directory=" + directory);
	
	// Make sure we are not checking in a parent dir (that the user don't have acccess to)
	checkDir(user, directory, function gotRootDir(err, rootDir, localDirectory, virtualRootDir) {
		
		console.log("hg.status checkDir answer: rootDir=" + rootDir);
		
		if(err) return callback(err);
		
		var args = ["status"];
		
		if(json.rev) {
			//args.push("--rev " + json.rev);
			args.push("--rev");
			args.push(json.rev);
		}
		
		execFile("hg", args, { cwd: localDirectory, env: execFileOptions.env }, function (err, stdout, stderr) {
				
				console.log("hg status (err=" + err + ") localDirectory=" + localDirectory + " rootDir=" + rootDir + " stderr=" + stderr + " stdout=" + stdout + " ");
				
				if(err) return callback(err);
				else if(stderr) return callback(stderr);
				else {
					
					var modified = [];
					var added = [];
					var removed = [];
					var missing = [];
					var untracked = [];
					
					var files;
					
					if(stdout.indexOf("\r\n") != -1) files = stdout.split("\r\n");
					else files = stdout.split("\n");
					
					/*
						The codes used to show the status of files are:
						
						M = modified
						A = added
						R = removed
						C = clean
						! = missing (deleted by non-hg command, but still tracked)
						? = not tracked
						I = ignored
						= origin of the previous file (with --copies)
						
					*/
					
					for(var attr, path, i=0; i<files.length-1; i++) {
						attr = files[i].substring(0, files[i].indexOf(" "));
						path = files[i].substring(attr.length + 1);
						
						if(attr == "M") modified.push(path);
						else if(attr == "A") added.push(path);
						else if(attr == "R") removed.push(path);
						else if(attr == "!") missing.push(path);
						else if(attr == "?") untracked.push(path);
						else throw new Error("Unknown status attr=" + attr + " for path=" + path + "\nfile=" + files[i]);
					}
					
					var resp = {
						modified: modified,
						added: added,
						removed: removed,
						missing: missing,
						untracked: untracked, 
						rootDir: virtualRootDir
					}
					
					return callback(null, resp);
					
				}
			});
		});
}


MERCURIAL.add = function hgadd(user, json, callback) {
	// add the specified files on the next commit
	
	var directory = UTIL.trailingSlash(json.directory);
	var files = json.files;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	if(files == undefined) return callback(new Error("No files defined"));
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localDirectory) {
		if(err) return callback(err);
		
		files = checkPaths(user, files, directory, rootDir);
		if(files instanceof Error) return callback(files);
		
		var execFile = require('child_process').execFile;
		execFile("hg", ["add"].concat(files), { cwd: localDirectory, env: execFileOptions.env }, function (err, stdout, stderr) {
			if(err) callback(err);
			else if(stderr) callback(stderr);
			else {
				
				if(stdout != "") callback(stdout);
				else callback(null, {files: files});
				
			}
		});
	});
}

MERCURIAL.forget = function hgforget(user, json, callback) {
	// forget the specified files on the next commit
	
	var directory = UTIL.trailingSlash(json.directory);
	var files = json.files;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	if(files == undefined) return callback(new Error("No files defined"));
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localDirectory) {
		if(err) return callback(err);
		
		files = checkPaths(user, files, directory, rootDir);
		if(files instanceof Error) return callback(files);
		
		var execFile = require('child_process').execFile;
		execFile("hg", ["forget"].concat(files), { cwd: localDirectory, env: execFileOptions.env }, function (err, stdout, stderr) {
			if(err) callback(err);
			else if(stderr) callback(stderr);
			else {
				
				if(stdout != "") callback(stdout);
				else callback(null, {files: files});
				
			}
		});
	});
}

MERCURIAL.remove = function hgremove(user, json, callback) {
	// removes the specified files from working / disk
	
	var directory = UTIL.trailingSlash(json.directory);
	var files = json.files;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	if(files == undefined) return callback(new Error("No files defined"));
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localDirectory) {
		if(err) return callback(err);
		
		files = checkPaths(user, files, directory, rootDir);
		if(files instanceof Error) return callback(files);
		
		var execFile = require('child_process').execFile;
		execFile("hg", ["remove", "--force"].concat(files), { cwd: localDirectory, env: execFileOptions.env }, function (err, stdout, stderr) {
			
			console.log("hg remove stderr=" + stderr);
			console.log("hg remove stdout=" + stdout);
			
			if(err) callback(err);
			else if(stderr) callback(stderr);
			else {
				
				if(stdout != "") callback(stdout);
				else callback(null, {files: files});
				
			}
		});
	});
}

MERCURIAL.init = function hginit(user, json, callback) {
	// create a new repository in the given directory
	
	var directory = UTIL.trailingSlash(json.directory);
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	var localDirectory = user.translatePath(directory);
	if(localDirectory instanceof Error) return callback(localDirectory);
	
	localDirectory = UTIL.trailingSlash(localDirectory);
	
	var execFile = require('child_process').execFile;
	execFile("hg", ["init"], { cwd: localDirectory, env: execFileOptions.env }, function (err, stdout, stderr) {
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
	
	var directory = UTIL.trailingSlash(json.directory);
	var files = json.files;
	var message = json.message;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	if(directory.charAt(directory.length-1) != "/" && directory.charAt(directory.length-1) != "\\") return callback(new Error("directory=" + directory + " needs to end with a path delimter!"));
	if(files == undefined) return callback(new Error("No files defined"));
	if(message == undefined) return callback(new Error("No message defined"));
	
	if(Object.prototype.toString.call( files ) !== '[object Array]') return callback("Expected files to be an array of files");
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localDirectory) {
		if(err) return callback(err);
		
		files = checkPaths(user, files, directory, rootDir);
		if(files instanceof Error) return callback(files);
		
		var execFile = require('child_process').execFile;
		execFile('hg', ['commit', '-m "' + message + '"', "-u " + user.name].concat(files), { cwd: localDirectory, env: execFileOptions.env }, function (err, stdout, stderr) {
			
			console.log("hg commit uid=" + ((typeof process.getuid == "function") && process.getuid() ) + 
			" gid=" + ((typeof process.getgid == "function") && process.getgid()) + " files=" + JSON.stringify(files) + " localDirectory=" + localDirectory + " rootDir=" + rootDir + " error=" + !!err + " stderr=" + stderr + " stdout=" + stdout + " ");
			
			if(stdout.match(/nothing changed/) != null) return callback("Nothing has changed! Did you forget to add files ?");
			
			if(err) callback(err);
			else if(stderr) callback(stderr);
			else {
				
				if(stdout != "") callback(stdout);
				else callback(null, {directory: directory});
				
			}
		});
	});
}

MERCURIAL.incoming = function hgincoming(user, json, callback) {
	/*
		
		hg incoming does the same thing as hg pull, but destoys the changes
		Consider doing a pull instead! Especially if you are likely to pull after running incoming!
		
	*/
	
	var directory = UTIL.trailingSlash(json.directory);
	var hguser = json.user;
	var pw = json.pw;
	var save = json.save;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localDirectory) {
		if(err) return callback(err);
		
		var execFile = require('child_process').execFile;
		
		var config = (hguser != undefined && pw != undefined) ? ["--config", "auth.x.prefix=*", "--config", "auth.x.username=" + hguser, "--config", "auth.x.password=" + pw] : [];
		
		var execOptions = {
			encoding: 'utf8',
			timeout: 3000,
			maxBuffer: 200*1024,
			killSignal: 'SIGTERM',
			cwd: localDirectory,
			env: execFileOptions.env,
		}
		
		execFile("hg", ["incoming", "--stat", "--noninteractive"].concat(config), execOptions, function (err, stdout, stderr) {
			
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
				// It seems Mercurial "sometimes" returns exit code 1 when there's nothing to pull !?!?
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
	});
}


MERCURIAL.pull = function hgpull(user, json, callback) {
	// pull changes from remote repo
	
	var directory = UTIL.trailingSlash(json.directory);
	var hguser = json.user;
	var pw = json.pw;
	var saveUserPw = json.save;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localDirectory) {
		if(err) return callback(err, {directory: user.toVirtualPath(rootDir)});
		
		localDirectory = UTIL.trailingSlash(localDirectory);
		
		var config = (hguser != undefined && pw != undefined) ? ["--config", "auth.x.prefix=*", "--config", "auth.x.username=" + hguser, "--config", "auth.x.password=" + pw] : [];
		
		var spawn = require('child_process').spawn;
		var pull = spawn("hg", ["pull", "--noninteractive", "--debug"].concat(config), {cwd: rootDir, env: execFileOptions.env, shell: false});
			var stdout = "";
			var stderr = "";
			
		var progressCounter = 0;
		
			pull.stdout.on('data', function pullStdout(data) {
				stdout += data;
			
			// todo: Better estimation on progress!
			progressCounter++;
			
			user.send({
				mercurialProgress: {
					max: Math.max(progressCounter,10),
					value: progressCounter
				}
			});
			
			});
			
			pull.stderr.on('data', function pullStderr(data) {
				stderr += data;
			});
			
			pull.on('error', function pullError(err) {
				console.log("stdout=" + stdout);
				console.log("stderr=" + stderr);
			
			pullDone(err);
			
			});
			
		/*
			
			bash-4.3$ hg pull --debug
			pulling from https://github.com/Z3TA/jsql.git
			Counting objects: 3, done.
			Total 3 (delta 1), reused 2 (delta 0), pack-reused 0
			importing git objects into hg
			importing: 2e27fbd459a45f6a7573c03a19275c3a014c1cf2
			committing files:
			README.md
			committing manifest
			committing changelog
			(run 'hg update' to get a working copy)
			
		*/
		
		pull.on('close', function pullClose(exitCode) {
				if(stdout.length < 500) console.log("hg pull stdout=" + stdout);
				else console.log("hg pull stdout=" + stdout.slice(0,500) + " ... (" + stdout.length + " characters)");
				
			//console.log("stdout=" + stdout);
			//console.log("stderr=" + stderr);
				
				console.log("exitCode=" + exitCode);
				
				if(exitCode || stderr) {
					var err = new Error(stderr);
					err.code = exitCode;
				return pullDone(err);
				}
				
				
				
				var matchRepoUrl = stdout.match(/pulling from (.*)/);
				
				if(!matchRepoUrl) throw new Error("Can not find repo url string (matchRepoUrl=" + matchRepoUrl + ") in stdout=" + stdout);
				
				var repoUrl = matchRepoUrl[1];
				
				console.log("repoUrl=" + repoUrl);
				
				var noChanges = stdout.match(/(\r\n|\n)no changes found/);
				
				console.log("noChanges=" + noChanges);
				
				
				
				// added 2 changesets with 1 changes to 1 files
				
				var matchPull = stdout.match(/added (\d+) changesets with (\d+) changes to (\d+) files/);
				var resp = {repo: repoUrl, directory: user.toVirtualPath(rootDir)};
				var fileCount = -1;
				var matchHgGit = stdout.match(/importing git objects into hg/);
				
				if(matchPull) {
					resp.changesets = parseInt(matchPull[1]);
					resp.changes = parseInt(matchPull[2]);
					fileCount = parseInt(matchPull[3]);
					resp.fileCount = fileCount;
				}
				else if(noChanges) {
					// for example when running hg pull again
				}
				else if(matchHgGit) {
					// hggit doesn't give any info
				}
				else throw new Error("Unexpected hg pull: stderr=" + stderr + " stdout=" + stdout);
				
				// Get list of changed files / Files that will be affected by a "hg update"
				var execFile = require('child_process').execFile;
				execFile('hg', ['status', '--rev', '.:tip'], { cwd: localDirectory, env: execFileOptions.env }, function (err, status_stdout, status_stderr) {
					
					console.log("hg status --rev .:tip stderr=" + status_stderr);
					console.log("hg status --rev .:tip stdout=" + status_stdout);
					
					if(err) throw err;
					else if(status_stderr) throw new Error("status_stderr=" + status_stderr);
					else {
						
						var affectedFilesString = status_stdout.trim();
						var pulledFiles = [];
						
						if(affectedFilesString != "") {
							console.log("affectedFilesString=" + affectedFilesString);
							
							var affectedFiles = affectedFilesString.split(/\n|\r\n/);
							
							for(var i=0, prefix; i<affectedFiles.length; i++) {
								prefix = affectedFiles[i].substr(0, affectedFiles[i].indexOf(" ")).trim();
								
								// Remove prefix (?, M, A, R, etc) and add directory
								affectedFiles[i] = directory + affectedFiles[i].substr(affectedFiles[i].indexOf(" ")).trim();
								
								if(prefix != "?") pulledFiles.push(affectedFiles[i]); 
							}
						}
						
						if(!matchHgGit && !noChanges) {
							// Sanity check
						if(fileCount != pulledFiles.length) throw new Error("fileCount=" + fileCount + " pulledFiles (" + pulledFiles.length + ") = " + JSON.stringify(pulledFiles) + " affectedFilesString=" + affectedFilesString + " stdout=" + stdout);
						}
						
						resp["files"] = pulledFiles;
						
					pullDone(null, resp);
					
					}
					
				});
				
				if(saveUserPw) {
					console.log("Saving mercurial credentials for user.name=" + user.name + " for repoUrl=" + repoUrl);
					saveCredentialsInHgrc(user, localDirectory, repoUrl, hguser, pw, function hgrcSaved(err) {
						if (err) throw err;
						console.log(user.name + " saved Mercurial credentials for repoUrl=" + repoUrl);
					});
				}
				
			function pullDone(err, resp) {
				
				if(resp == undefined || resp.directory == undefined) resp = {directory: user.toVirtualPath(rootDir)};
				
				if(callback) callback(err, resp);
				callback = null;
				
				// show full progress
				user.send({
					mercurialProgress: {
						max: progressCounter,
						value: progressCounter
					}
				});
			}
			});
		});
}


MERCURIAL.update = function hgupdate(user, json, callback) {
	// Update pulled changes
	
	var directory = UTIL.trailingSlash(json.directory);
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localDirectory) {
		if(err) return callback(err);
		
		localDirectory = UTIL.trailingSlash(localDirectory);
		
		var execFile = require('child_process').execFile;
		execFile('hg', ['update'], { cwd: localDirectory, env: execFileOptions.env }, function (err, stdout, stderr) {
			
			console.log("update stderr=" + stderr);
			console.log("update stdout=" + stdout);
			
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
	});
}

MERCURIAL.merge = function hgmerge(user, json, callback) {
	/*
		Attempt to merge unresolved files ...
		
		$ hg merge
		merging baz.txt
		warning: conflicts while merging baz.txt! (edit, then use 'hg resolve --mark')
		1 files updated, 0 files merged, 0 files removed, 1 files unresolved
		use 'hg resolve' to retry unresolved file merges or 'hg update -C .' to abandon
		
	*/
	
	var directory = UTIL.trailingSlash(json.directory);
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localDirectory) {
		if(err) return callback(err);
		
		localDirectory = UTIL.trailingSlash(localDirectory);
		
		var execFile = require('child_process').execFile;
		execFile('hg', ['merge'], { cwd: localDirectory, env: execFileOptions.env }, function (err, stdout, stderr) {
			
			console.log("merge stderr=" + stderr);
			console.log("merge stdout=" + stdout);
			
			// abort: not a linear update
			
			if(err) callback(err);
			else if(stderr) callback(stderr);
			else {
				
				// 1 files updated, 0 files merged, 0 files removed, 0 files unresolved
				
				var matchMerge = stdout.match(/(\d+) files updated, (\d+) files merged, (\d+) files removed, (\d+) files unresolved/);
				
				if(!matchMerge) return callback(stdout);
				
				var resp = {
					updated: matchMerge[1],
					merged: matchMerge[2],
					removed: matchMerge[3],
					unresolved: matchMerge[4]
				};
				
				callback(null, resp);
				
			}
		});
	});
}

MERCURIAL.push = function hgpush(user, json, callback) {
	
	var directory = UTIL.trailingSlash(json.directory);
	var hguser = json.user;
	var pw = json.pw;
	var saveUserPw = json.save;
	
	if(directory == undefined) return callback(new Error("No directory defined"));
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localDirectory) {
		if(err) return callback(err);
		
		localDirectory = UTIL.trailingSlash(localDirectory);
		
		var config = (hguser != undefined && pw != undefined) ? ["--config", "auth.x.prefix=*", "--config", "auth.x.username=" + hguser, "--config", "auth.x.password=" + pw] : [];
		
		var execFile = require('child_process').execFile;
		//execFile('hg', ['push', '--noninteractive'].concat(config), { cwd: localDirectory, env: execFileOptions.env }, function (err, stdout, stderr) {
		
			// hg push seem to return errorcode (err) when no changes are found !
			
			var spawn = require('child_process').spawn;
		var push = spawn("hg", ["push", "--noninteractive", "--debug"].concat(config), {cwd: rootDir, env: execFileOptions.env, shell: false});
var stdout = "";
var stderr = "";

var progressCounter = 0;
		var progressMax = 100;

		user.send({mercurialProgress: {max: progressCounter, value: Math.max(progressCounter, progressMax)}});
		
		var progressInterval = setInterval(function() {
progressCounter++;
			user.send({mercurialProgress: {max: progressCounter, value: Math.max(progressCounter, progressMax)}});
}, 500); // Fake progress
		
		push.stdout.on('data', function pushStdout(data) {
stdout += data;

			console.log("push stdout data=" + data);
			
// todo: Better estimation on progress!
progressCounter++;
			user.send({mercurialProgress: {max: progressCounter, value: Math.max(progressCounter, progressMax)}});
});

		push.stderr.on('data', function pushStderr(data) {
stderr += data;
});

		push.on('error', function pushError(err) {
console.log("stdout=" + stdout);
console.log("stderr=" + stderr);

			pushDone(err);

});

/*
bash-4.3$ hg push --debug
			pushing to https://github.com/Z3TA/jsql.git
			finding hg commits to export
			using auth.foo.* for authentication
			http auth: user zeta@zetafiles.org, password ************
			searching for changes
			abort: branch 'refs/heads/master' changed on the server, please pull and merge before pushing
			
			
			finding hg commits to export
			exporting hg objects to git
			converting revision 0753c292adfe608c2de1fff3046ebe3562455467
			using auth.foo.* for authentication
			http auth: user zeta@zetafiles.org, password ************
			searching for changes
			1 commits found
			list of commits:
			d04b4e0650f9e0e8480653c7c2012b40fed24236
			adding objects
			using auth.foo.* for authentication
			http auth: user zeta@zetafiles.org, password ************
			added 1 commits with 1 trees and 1 blobs
			updating reference default::refs/heads/master => GIT:d04b4e06
			
*/

		push.on('close', function pushClose(exitCode) {
			if(stdout.length < 500) console.log("hg push stdout=" + stdout);
			else console.log("hg push stdout=" + stdout.slice(0,500) + " ... (" + stdout.length + " characters)");

//console.log("stdout=" + stdout);
//console.log("stderr=" + stderr);

console.log("exitCode=" + exitCode);

if(exitCode || stderr) {
				
				var errMessage = stderr || stdout;
				var noChanges = errMessage.match(/no changes found/);
				if(noChanges) return pushDone(null, {changesets: null, remote: repoUrl, directory: user.toVirtualPath(rootDir)});
				
				var err = new Error(errMessage);
err.code = exitCode;
				return pushDone(err);
}
			
			var noChanges = stdout.match(/no changes found/);
				var matchPush = stdout.match(/pushing to (.*)/);
				var repoUrl = matchPush ? matchPush[1] : null;
				
			console.log("repoUrl=" + repoUrl);
			
			if(noChanges) return pushDone(null, {changesets: null, remote: repoUrl, directory: user.toVirtualPath(rootDir)});
					
			
						// Different servers returns different text ...
						var resp = {
							remote: repoUrl,
							directory: user.toVirtualPath(rootDir)
						}
						
						// Mercurial:
						// added 2 changesets with 1 changes to 1 files
						var matchUpdate = stdout.match(/remote: added (\d+) changesets with (\d+) changes to (\d+) files/);
						if(matchUpdate) {
							resp.changesets = matchUpdate[1];
							resp.changes = matchUpdate[2];
							resp.files = matchUpdate[3];
						}
						
						// Git(hub)
						//added 1 commits with 1 trees and 1 blobs
						if(matchUpdate == null) matchUpdate = stdout.match(/added (\d+) commits with (\d+) trees and (\d+) blobs/);
						if(matchUpdate) {
							resp.changesets = matchUpdate[1];
							resp.changes = matchUpdate[2];
							resp.files = matchUpdate[3];
						}
						
			if(!matchUpdate) return pushDone(stdout, {directory: user.toVirtualPath(rootDir)});
			else pushDone(null, resp);
						
					
				
					if(saveUserPw) {
						console.log("Saving mercurial credentials for user.name=" + user.name + " for repoUrl=" + repoUrl);
						saveCredentialsInHgrc(user, localDirectory, repoUrl, hguser, pw, function hgrcSaved(err) {
							if (err) throw err;
							console.log(user.name + " saved Mercurial credentials for repoUrl=" + repoUrl);
						});
					}
					
			function pushDone(err, resp) {
					
					if(resp == undefined || resp.directory == undefined) resp = {directory: user.toVirtualPath(rootDir)};
					
				clearInterval(progressInterval);
				user.send({mercurialProgress: {max: progressCounter, value: progressCounter}}); // show full progress
				
					if(callback) callback(err, resp);
					callback = null;
					
			}
			
		});
		
	});
}

MERCURIAL.annotate = function hgannotate(user, json, callback) {
	// Get all changesets for a file
	
	var virtualFilePath = json.file;
	
	checkDir(user, virtualFilePath, function gotRootDir(err, rootDir, localPath) {
		if(err) return callback(err);
		
		var execFile = require('child_process').execFile;
		var spawn = require('child_process').spawn;
		
		//execFile('hg', ['annotate', localPath], { cwd: rootDir, env: execFileOptions.env, maxBuffer: 1024 * 1024 * 10 }, function (err, stdout, stderr) {
		
		var annotate = spawn("hg", ['annotate', localPath, "--ignore-space-change"], {cwd: rootDir, env: execFileOptions.env, shell: false});
		var stdout = "";
		var stderr = "";
		
		annotate.stdout.on('data', function annotateStdout(data) {
			stdout += data;
		});
		
		annotate.stderr.on('data', function annotateStderr(data) {
			stderr += data;
		});
		
		annotate.on('error', function annotateError(err) {
			console.log("stdout=" + stdout);
			console.log("stderr=" + stderr);
			if(callback) callback(err);
			callback = null;
		});
		
		annotate.on('close', function annotateDone(exitCode) {
			//if(stdout.length < 500) console.log("hg annotate stdout=" + stdout);
			//else console.log("hg annotate stdout=" + stdout.slice(0,500) + " ... (" + stdout.length + " characters)");
			console.log("stdout=" + stdout);
			console.log("stderr=" + stderr);
			
			console.log("exitCode=" + exitCode);
			
			if(exitCode || stderr) {
				var err = new Error(stderr);
				err.code = exitCode;
				if(callback) callback(err);
				callback = null;
				return;
			}
			
			/*
				20:1: foo dog
				17:2: line 2
				16:3: line 3
				12:4: line 4
				20:5:
				
				changeset:line-content
			*/
			
			var lines = stdout.trim().split(/\n|\r\n/);
			var changesetId = [];
			var changesets = {};
			var logCounter = 0;
			
			for(var i=0, changeId; i<lines.length; i++) {
				lines[i] = lines[i].split(":");
				changeId = parseInt(lines[i][0]);
				
				if(changesetId.indexOf(changeId) == -1) {
					changesetId.push(changeId);
					
					execFile('hg', ["-v", "log", "--rev", changeId], { cwd: rootDir, env: execFileOptions.env, maxBuffer: 1024 * 1024 * 10 }, hglog);
					}
				lines[i] = changeId; // Map line to changeset
			}
			
			function hglog(err, stdout, stderr) {
				console.log("hg log stderr=" + stderr);
				console.log("hg log stdout=" + stdout);
				
				if(err) throw err;
				if(stderr) throw stderr;
				
				/*
					changeset:   19:e2a067f84a62
					user:        Johan Zetterberg <zeta@zetafiles.org>
					date:        Thu Apr 20 17:06:17 2017 +0200
					summary:     line9
					
					(when using -v flag) 
					changeset:   1482:0db0022ed845
					user:        zeta@zetafiles.org
					date:        Tue May 30 16:58:40 2017 +0200
					files:       client/gfx/style.css client/plugin/mercurial.js server/plugin/mercurial.js todo.md
					description:
					More work on the Mercurial plugin
					
					
				*/
				
				var pair = stdout.trim().split(/\n|\r\n/);
				var obj;
				for(var i=0, name, value, changeId, arrChangeset; i<pair.length; i++) {
					name = pair[i].substr(0, pair[i].indexOf(":"));
					value = pair[i].substr(pair[i].indexOf(":")+1).trim();
					
					if(name == "changeset") {
						arrChangeset = value.split(":")
						changeId = parseInt(arrChangeset[0]);
						if(isNaN(changeId)) throw new Error("changeId=" + changeId + " arrChangeset=" + JSON.stringify(arrChangeset) + " pair=" + JSON.stringify(pair) + " stdout=" + stdout);
						obj = changesets[changeId] = {hash: arrChangeset[1]};
					}
					else if(name == "description") {
						// it can be several lines
						obj[name] = stdout.slice(stdout.indexOf(name+":") + name.length+1).trim();
						console.log(name + " = " + obj[name]);
						break;
					}
					else obj[name] = value;
					
					console.log("name=" + name);
					console.log("value=" + value);
				}
				
				if(++logCounter == changesetId.length) done();
				
			}
			
			function done() {
				callback(null, {changesets: changesets, lines: lines});
			}
			
			
		});
		
	});
}

MERCURIAL.resolvelist = function hgresolvelist(user, json, callback) {
	// Get all list of resolved and unresolved files
	
	var directory = UTIL.trailingSlash(json.directory);
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localPath) {
		if(err) return callback(err);
		
		var execFile = require('child_process').execFile;
		execFile("hg", ["resolve", "--list"], { cwd: rootDir, env: execFileOptions.env }, function (err, stdout, stderr) {
			
			console.log("hg resolve --list stderr=" + stderr);
			console.log("hg resolve --list stdout=" + stdout);
			
			if(err) return callback(err);
			if(stderr) return callback(stderr);
			
			var resolved = [];
			var unresolved = [];
			
			stdout = stdout.trim();
			
			if(stdout != "") {
				
				/*
					U baz.txt
					R foo.txt
				*/
				
				var files = stdout.trim().split(/\n|\r\n/);
				
				for (var i=0, status, filePath; i<files.length; i++) {
					status = files[i].substr(0,2).trim();
					filePath = files[i].substring(2, files[i].length).trim();
					
					filePath = user.toVirtualPath(rootDir + filePath);
					
					if(status == "R") resolved.push(filePath);
					else if(status == "U") unresolved.push(filePath);
				}
			}
			
			callback(null, {resolved: resolved, unresolved: unresolved});
			
		});
	});
}

MERCURIAL.resolvemark = function hgresolvemark(user, json, callback) {
	// Mark an unresolved file as resolved
	
	var directory = UTIL.trailingSlash(json.directory);
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localPath) {
		if(err) return callback(err);
		
		var files = json.files;
		if(files == undefined) {
			if(json.file == undefined) return callback("Expected a file or files array");
			files = [json.file];
		}
		
		files = checkPaths(user, files, directory, rootDir);
		if(files instanceof Error) return callback(files);
		
		var execFile = require('child_process').execFile;
		execFile("hg", ["resolve", "--mark"].concat(files), { cwd: rootDir, env: execFileOptions.env }, function (err, stdout, stderr) {
			
			console.log("hg resolve --mark stderr=" + stderr);
			console.log("hg resolve --mark stdout=" + stdout);
			
			if(err) return callback(err);
			if(stderr) return callback(stderr);
			
			// What does Mercurial return !?
			
			var abort = stdout.match(/abort: resolve command not applicable when not merging/);
			var noMore = stdout.match(/\(no more unresolved files\)/);
			var resolveList = stdout.match(/^(U|R)\s/);
			
			var resp = {
				allResolved: !!noMore
			}
			
			if(noMore || resolveList) return callback(null, resp);
			else return callback(stdout);
			
		});
	});
}

MERCURIAL.resolveunmark = function hgresolveunmark(user, json, callback) {
	// Mark an resolved file as Not resolved
	
	var directory = UTIL.trailingSlash(json.directory);
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localPath) {
		if(err) return callback(err);
		
		var files = json.files;
		if(files == undefined) {
			if(json.file == undefined) return callback("Expected a file or files array");
			files = [json.file];
		}
		
		files = checkPaths(user, files, directory, rootDir);
		if(files instanceof Error) return callback(files);
		
		var execFile = require('child_process').execFile;
		execFile("hg", ["resolve", "--unmark"].concat(files), { cwd: rootDir, env: execFileOptions.env }, function (err, stdout, stderr) {
			
			console.log("hg resolve --unmark stderr=" + stderr);
			console.log("hg resolve --unmark stdout=" + stdout);
			
			if(err) return callback(err);
			if(stderr) return callback(stderr);
			
			// What does Mercurial return !?
			
			var abort = stdout.match(/abort: resolve command not applicable when not merging/);
			var noMore = stdout.match(/\(no more unresolved files\)/);
			var resolveList = stdout.match(/^(U|R)\s/);
			
			if(noMore || resolveList) return callback(null);
			else return callback(stdout);
			
		});
	});
}

MERCURIAL.heads = function hgheads(user, json, callback) {
	// Cheks for multiple heads
	
	var directory = UTIL.trailingSlash(json.directory);
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localPath) {
		if(err) return callback(err);
		
		var execFile = require('child_process').execFile;
		execFile("hg", ["heads", "--topo"], { cwd: rootDir, env: execFileOptions.env }, function (err, stdout, stderr) {
			
			console.log("hg heads --topo stderr=" + stderr);
			console.log("hg heads --topo stdout=" + stdout);
			
			if(err) return callback(err);
			if(stderr) return callback(stderr);
			
			var heads = objectionize(stdout);
			
			callback(null, {heads: heads});
			
		});
	});
}

MERCURIAL.head = function hghead(user, json, callback) {
	// Get the current head(s) (latest revision)
	
	var directory = UTIL.trailingSlash(json.directory);
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localPath) {
		if(err) return callback(err);
		
		var execFile = require('child_process').execFile;
		execFile("hg", ["head", "--Tjson"], { cwd: rootDir, env: execFileOptions.env }, function (err, stdout, stderr) {
			
			console.log("hg head stderr=" + stderr);
			console.log("hg head stdout=" + stdout);
			
			if(err) return callback(err);
			if(stderr) return callback(stderr);
			
			try {
				var heads = JSON.parse(stdout);
			}
			catch(err) {
				return callback(new Error("Unable to parse heads: " + stdout));
			}
			
			callback(null, {heads: heads});
			
		});
	});
}

MERCURIAL.reponame = function reponame(user, json, callback) {
	
	var directory = UTIL.trailingSlash(json.directory);
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localPath) {
		if(err) return callback(err);
		
		var execFile = require('child_process').execFile;
		execFile("hg", ["path", "default"], { cwd: rootDir, env: execFileOptions.env }, function (err, stdout, stderr) {
			
			console.log("hg path default stderr=" + stderr);
			console.log("hg path default stdout=" + stdout);
			
			if(err) return callback(err);
			if(stderr) return callback(stderr);
			
			if(stdout.length > 0) directory = UTIL.trailingSlash(stdout);
			
			var folderName = UTIL.getFolderName(directory);
			
			callback(null, {name: folderName});
			
		});
	});
}

MERCURIAL.hasRepo = function reponame(user, json, callback) {
	
	var directory = UTIL.trailingSlash(json.directory);
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localPath) {
		
		if(err) return callback(err);
		
		var resp = {directory: null};
		
		resp.directory = user.toVirtualPath(rootDir);
		
		return callback(null, resp);
		
	});
}

MERCURIAL.log = function hglog(user, json, callback) {
	// Get a list of all changesets in a local repository
	
var directory = json.directory;

	if(directory == undefined) return callback(new Error("No directory defined"));

	checkDir(user, directory, function gotRootDir(err, rootDir, localPath) {
		if(err) return callback(err);
		
		var args = ['log', "-v", "-Tjson"];
		
		if(json.rev != undefined) args.push("--rev " + json.rev);
		
			var spawn = require('child_process').spawn;
		var log = spawn("hg", args, {cwd: rootDir, env: execFileOptions.env, shell: false});
			var stdout = "";
			var stderr = "";
			
			log.stdout.on('data', function logStdout(data) {
				stdout += data;
			});
			
			log.stderr.on('data', function logStderr(data) {
				stderr += data;
			});
			
			log.on('error', function logError(err) {
				//console.log("stdout=" + stdout);
				//console.log("stderr=" + stderr);
				if(callback) callback(err);
				callback = null;
			});
			
			log.on('close', function logDataRecived(exitCode) {
				//console.log("stdout=" + stdout);
				//console.log("stderr=" + stderr);
				//console.log("exitCode=" + exitCode);
				
				if(exitCode || stderr) {
					var err = new Error(stderr);
					err.code = exitCode;
					if(callback) callback(err);
					callback = null;
					return;
				}
				
				try {
					var revisions = JSON.parse(stdout);
				}
				catch(err) {
					return callback(new Error("Unable to parse (" + err.message + ") hg.log stdout=" + stdout));
				}
				
				callback(null, revisions);
				
			});
		});
}


MERCURIAL.diff = function hgdiff(user, json, callback) {

var directory = json.directory;

	if(directory == undefined) return callback(new Error("No directory specified!"));
	
checkDir(user, directory, function gotRootDir(err, rootDir, localPath) {
if(err) return callback(err);

var spawn = require('child_process').spawn;
		
		var args = ["diff"];
		if(json.changes != undefined) {
args.push("-c " + json.changes);
			//args.push("-c ");
			//args.push(json.changes);
		}
		if(json.files != undefined) args = args.concat(json.files);
		
		console.log("hg diff args=" + JSON.stringify(args) + " json=" + JSON.stringify(json));
		
		var diff = spawn("hg", args, {cwd: rootDir, env: execFileOptions.env, shell: false});
			var stdout = "";
			var stderr = "";
			
			diff.stdout.on('data', function diffStdout(data) {
				stdout += data;
			});
			
			diff.stderr.on('data', function diffStderr(data) {
				stderr += data;
			});
			
			diff.on('error', function diffError(err) {
				console.log("stdout=" + stdout);
				console.log("stderr=" + stderr);
				if(callback) callback(err);
				callback = null;
			});
			
			diff.on('close', function diffDone(exitCode) {
				//if(stdout.length < 500) console.log("hg diff stdout=" + stdout);
				//else console.log("hg diff stdout=" + stdout.slice(0,500) + " ... (" + stdout.length + " characters)");
				console.log("diff stdout=" + stdout);
				console.log("diff stderr=" + stderr);
				
				console.log("diff exitCode=" + exitCode);
				
				if(exitCode || stderr) {
					var err = new Error(stderr);
					err.code = exitCode;
					if(callback) callback(err);
					callback = null;
					return;
				}
				
				var resp = {
					text: stdout
				}
				
				callback(null, resp);
				
			});
		});
}

MERCURIAL.cat = function hgcat(user, json, callback) {
	
	// Shows the state of a file at a given revision
	
	var directory = json.directory;
	var revision = json.rev;
	var filePath = json.file;
	
	if(directory == undefined) return callback(new Error("No directory specified!"));
	if(revision == undefined) return callback(new Error("No rev specified!"));
	if(filePath == undefined) return callback(new Error("No file specified!"));
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localPath) {
		if(err) return callback(err);
		
		var spawn = require('child_process').spawn;
		
		var args = ["cat", "-r " + json.rev, filePath];
		
	//console.log("hg cat args=" + JSON.stringify(args) + " json=" + JSON.stringify(json));
	
	var cat = spawn("hg", args, {cwd: rootDir, env: execFileOptions.env, shell: false});
	var stdout = "";
	var stderr = "";
	
	cat.stdout.on('data', function catStdout(data) {
		stdout += data;
		});
		
		cat.stderr.on('data', function catStderr(data) {
			stderr += data;
		});
		
		cat.on('error', function catError(err) {
			console.log("stdout=" + stdout);
			console.log("stderr=" + stderr);
			if(callback) callback(err);
			callback = null;
		});
		
		cat.on('close', function catDone(exitCode) {
			if(stdout.length < 500) console.log("hg cat stdout=" + stdout);
			else console.log("hg cat stdout=" + stdout.slice(0,500) + " ... (" + stdout.length + " characters)");
			//console.log("cat stdout=" + stdout);
			console.log("cat stderr=" + stderr);
			
			console.log("cat exitCode=" + exitCode);
			
			if(exitCode || stderr) {
				var err = new Error(stderr);
				err.code = exitCode;
				if(callback) callback(err);
				callback = null;
				return;
			}
			
			var resp = {
				path: filePath,
				text: stdout
			}
			
			callback(null, resp);
			
		});
	});
}

MERCURIAL.summary = function hgsummary(user, json, callback) {
	
	var directory = UTIL.trailingSlash(json.directory);
	
	checkDir(user, directory, function gotRootDir(err, rootDir, localPath) {
		if(err) return callback(err);
		
		var execFile = require('child_process').execFile;
		execFile("hg", ["summary"], { cwd: rootDir, env: execFileOptions.env }, function (err, stdout, stderr) {
			
			console.log("hg summary stderr=" + stderr);
			console.log("hg summary stdout=" + stdout);
			
			if(err) return callback(err);
			if(stderr) return callback(stderr);
			
			var summary = objectionize(stdout);
			
			callback(null, summary[0]);
			
			});
	});
}

MERCURIAL.revert = function hgrevert(user, json, callback) {
	
	var directory = UTIL.trailingSlash(json.directory);
	
	var files = json.files;
	if(files == undefined) return callback(new Error("No files defined"));

	checkDir(user, directory, function gotRootDir(err, rootDir, localPath) {
		if(err) return callback(err);
		
		files = checkPaths(user, files, directory, rootDir);
		if(files instanceof Error) return callback(files);
		
		var execFile = require('child_process').execFile;
		execFile("hg", ["revert"].concat(files), { cwd: rootDir, env: execFileOptions.env }, function (err, stdout, stderr) {
			
			console.log("hg revert stderr=" + stderr);
			console.log("hg revert stdout=" + stdout);
			
			if(err) return callback(err);
			if(stderr) return callback(stderr);
			
			callback(null, files);
			
		});
	});
}

function makeFileString(user, files, directory, rootDir) {
	/*
		NOT USED because execFile needs to pass each file as it's own argument, not a string of all files
	*/
	
	console.log("makeFileString: files=" + JSON.stringify(files) + " directory=" + directory + " rootDir=" + rootDir + " user.rootPath=" + user.rootPath);
	
	if(arguments.length != 4) throw new Error("Only got " + arguments.length + "/4 arguments! user=" + user + " files=" + files + " directory=" + directory + " rootDir=" + rootDir);
	if(files == undefined) throw new Error("files=" + files);
	if(Object.prototype.toString.call( files ) != "[object Array]") throw new Error("Should be an array: files=" + files);
	if(directory == undefined) throw new Error("directory=" + directory);
	if(rootDir == undefined) throw new Error("rootDir=" + rootDir);
	
	var fileString = "";
	for(var i=0, localPath; i<files.length; i++) {
		localPath = user.translatePath(directory + files[i]);
		if(localPath instanceof Error) return localPath;
		if(localPath.indexOf(rootDir) == -1) return new Error("File not in local repository!\nFile:" + files[i] + "Not in: " + rootDir);
		fileString += ' "' + localPath + '"';
	}
	
	return fileString.trim();
}

function checkPaths(user, files, directory, rootDir) {
	
	console.log("checkPaths: files=" + JSON.stringify(files) + " directory=" + directory + " rootDir=" + rootDir + " user.rootPath=" + user.rootPath);
	
	if(arguments.length != 4) throw new Error("Only got " + arguments.length + "/4 arguments! user=" + user + " files=" + files + " directory=" + directory + " rootDir=" + rootDir);
	if(files == undefined) throw new Error("files=" + files);
	if(Object.prototype.toString.call( files ) != "[object Array]") throw new Error("Should be an array: files=" + files);
	if(directory == undefined) throw new Error("directory=" + directory);
	if(rootDir == undefined) throw new Error("rootDir=" + rootDir);
	
	for (var i=0, localPath; i<files.length; i++) {
		localPath = user.translatePath(directory + files[i]);
		if(localPath instanceof Error) return localPath;
		if(localPath.indexOf(rootDir) == -1) return new Error("File not in local repository!\nFile:" + files[i] + "Not in: " + rootDir);
		files[i] = localPath;
	}
	
	return files;
	
}

function saveCredentialsInHgrc(user, directory, remote, hguser, pw, callback) {
	
	// directory does not have to be the root directory. It has to be a local/real (non virtual) directory.
	
	directory = UTIL.trailingSlash(directory);
	
	console.log("saveCredentialsInHgrc: user.name=" + user.name + " directory=" + directory + " remote=" + remote + " hguser=" + hguser + " pw.length=" + pw.length);
	
	var execFile = require('child_process').execFile;
	
	execFile("hg", ["root"], { cwd: directory, env: execFileOptions.env }, function (err, stdout, stderr) {
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


function checkDir(user, virtualPath, callback) {
	
	/*
		Makes sure the user has access to the Mercurial repository.
		Returns the mercurial root directory, and the translated local path for virtualPath.
		
		virtualPath can be a file path or a directory path
	*/
	
	if(virtualPath == undefined) return callback(new Error("No path defined! path=" + virtualPath));
	
	var localPath = user.translatePath(virtualPath);
	if(localPath instanceof Error) return callback(localPath);
	
	var localDirectory = UTIL.getDirectoryFromPath(localPath);
	
	findDotHg(localDirectory, function(err, mercurialRoot) {
		if(err) return callback(err);
		else {
			mercurialRoot = UTIL.trailingSlash(mercurialRoot);
			
			if(user.rootPath) {
				if(mercurialRoot.indexOf(user.rootPath) !== 0) {
					console.warn("user.rootPath=" + user.rootPath + " mercurialRoot=" + mercurialRoot);
					return callback("Unable to find a mercurial reposity from path=" + virtualPath);
				}
			}
			
			var virtualRootDir = user.toVirtualPath(mercurialRoot);
			
			if(virtualRootDir instanceof Error) {
				return callback("Unable to find a mercurial reposity from path=" + virtualPath);
			}
			else {
				return callback(null, mercurialRoot, localPath, virtualRootDir);
				}
		}
	});
	
	function findDotHg(dir, findDotHgCallback) {
		// Recursively dig down the path to find a .hg folder
		var dirList = UTIL.getFolders(dir);
		dir = dirList.pop();
		CORE.listFiles(user, {pathToFolder: dir}, function(err, fileList) {
			
			if(err) {
return findDotHgCallback(err);
			}
			else {
				for (var i=0; i<fileList.length; i++) {
					if(fileList[i].name == ".hg") return findDotHgCallback(null, dir);
				}
			}
			
			if(dirList.length > 0) {
				dir = dirList.pop();
				findDotHg(dir, findDotHgCallback)
			}
			else {
				// No .hg folder found!
				var err = new Error("No .hg folder found!");
				err.code = "NO_HG_FOLDER";
				return findDotHgCallback(err);
			}
			
		});
	}
	
	
	
	function hgRoot() {
		var execFile = require('child_process').execFile;
		execFile("hg", ["root"], { cwd: localDirectory, env: execFileOptions.env }, function hgroot(err, stdout, stderr) {
			console.log("hg root (error=" + (!!err) + ") localDirectory=" + localDirectory + " stderr=" + stderr + " stdout=" + stdout);
			
			if(err) {
				console.log("hg root failed! " + err.message);
				callback(err);
			}
			else if(stderr) callback(stderr);
			else {
				
				var mercurialRoot = stdout.trim();
				
				console.log("mercurialRoot=" + UTIL.lbChars(mercurialRoot));
				
				if(mercurialRoot == "") throw new Error("mercurialRoot=" + mercurialRoot + " virtualPath=" + virtualPath + " localDirectory=" + localDirectory + "  ");
				
				mercurialRoot = UTIL.trailingSlash(mercurialRoot);
				
				if(user.rootPath) {
					if(mercurialRoot.indexOf(user.rootPath) !== 0) {
						console.warn("user.rootPath=" + user.rootPath + " mercurialRoot=" + mercurialRoot);
						return callback("Unable to find a mercurial reposity from path=" + virtualPath);
					}
				}
				
				var virtualRootDir = user.toVirtualPath(mercurialRoot);
				
				if(virtualRootDir instanceof Error) callback("Unable to find a mercurial reposity from path=" + virtualPath);
				else {
					
					callback(null, mercurialRoot, localPath, virtualRootDir);
					
				}
			}
		});
	}
}

function objectionize(str, changesets) {
	/*
		Turns a formatted string into an object
		
		if changesets is true, it returns an object where each changeset is the key,
		otherwise it returns an array of objects
		
	*/
	
	str = str.trim();
	
	var arrObjects = str.split(/(\r\n|\n)\s*(\r\n|\n)/); // Two line breaks (can have spaces between)
	
	if(changesets) var objChanges = {};
	
	for(var i=0; i<arrObjects.length; i++) {
		console.log("arrObjects[" + i + "]=" + arrObjects[i]);
		while(arrObjects[i].match(/^(\r\n|\n)$/)) arrObjects.splice(i, 1); // Remove emty sets
	}
	console.log("arrObjects=" + JSON.stringify(arrObjects, null, 2));
	
	
	for(var i=0, obj; i<arrObjects.length; i++) {
		arrObjects[i] = arrObjects[i].split(/\r\n|\n/);
		
		obj = {};
		
		for (var j=0, name, value; j<arrObjects[i].length; j++) {
			
			name = arrObjects[i][j].substr(0, arrObjects[i][j].indexOf(":"));
			value = arrObjects[i][j].substr(arrObjects[i][j].indexOf(":")+1).trim();
			
			console.log("name=" + name);
			console.log("value=" + value);
			
			if(changesets && name == "changeset") obj = objChanges[value] = {};
			else obj[name] = value;
		}
		
		if(!changesets) arrObjects[i] = obj;
		
	}
	
	if(changesets) return objChanges;
	else return arrObjects;
	
}



module.exports = MERCURIAL;