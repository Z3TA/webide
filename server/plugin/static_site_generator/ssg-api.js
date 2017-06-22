"use strict";

var UTIL = require("../../../client/UTIL.js");
var CORE = require("../../server_api.js");

var REMOTE_PROTOCOLS = ["ftp", "ftps", "sftp"]; // Supported remote connections

var API = {};
	
API.compile = function compile(user, json, callback) {
	
	var source = user.translatePath(json.source);
	var destination = user.translatePath(json.destination);
	var publish = json.publish;
	var pubUser = json.pubUser;
	var pubPw = json.pubPw;
	var pubKey = json.pubKey;
	
	var url = require("url");
	var parse = url.parse(destination);
	var protocol = parse.protocol;
	
	if(protocol) protocol = protocol.replace(/:/g, "").toLowerCase();
	
	console.log("protocol: " + protocol);
	
	console.log("source=" + JSON.stringify(url.parse(source), null, 2));
	console.log("destination=" + JSON.stringify(url.parse(destination), null, 2));
	
	if(REMOTE_PROTOCOLS.indexOf(protocol) != -1) {
		// We will need to connect to the remote location before uploading files
		var serverAddress = parse.host;
		var auth = parse.auth, user, passw;
		if(auth) {
			auth = auth.split(":");
			if(auth.length == 2) {
				user = auth[0];
				passw = auth[1];
			}
		}
		else if(selectedSite.pubUser.length > 0) {
			user = pubUser;
			passw = pubPw;
		}
		var keyPath = pubKey;
		
		var workingDir = parse.path;
		
		CORE.connect(user, {protocol: protocol, serverAddress: serverAddress, user: user, passw: passw, keyPath: keyPath, workingDir: workingDir}, fsReady);
		
	}
	else {
		// Asume local file-system
		fsReady(null, user.workingDirectory);
	}
	
	function fsReady(err, workingDir) {
		
		if(err) return callback(err);

		
		console.log("Compiling: " + source);
		
		
		var childProcess = require("child_process");
		var path = require('path');
		
		var buildScript = path.join(__dirname, "build.js");
		
		console.log("buildScript=" + buildScript);
		console.log("source=" + source);
		
		var workingDir = path.join(source, "../");
		console.log("workingDir=" + workingDir);
		
		var node_modules = path.join(source, "../node_modules/"); // Node runtime wont check node_modules folder, so we'll have to explicity set it in NODE_PATH enviroment variable
		//console.log("node_modules=" + node_modules);
		
		var fs = require("fs");
		
		var filesToSave = 0;
		var doneCompiling = false;
		var workerExitCode = -1;
		
		var foldersExist = [];
		var folderAboutToBeCreated = [];
		var waitingList = [];
		
		var args = [source, destination];
		
		if(publish) args.push( "-publish");
		
		var worker = childProcess.fork(buildScript, args, {
			cwd: workingDir,
			env: {"NODE_PATH": node_modules}, // Tell node runtime to check for modules in this folder
		});
		
		// PS. It's impossible to caputre stdout and stderr from the fork. You'll have to use process.send() to send message back here
		
		worker.on('message', function worker_message(data) {
			
			console.log("SSG data: " + JSON.stringify(data));
			
			if(data.type == "file") {
				filesToSave++;
				createFile(user.toVirtualPath(data.path), data.text)
			}
			else if(data.type == "copy") {
				filesToSave++;

				copyFile(user.toVirtualPath(data.from), user.toVirtualPath(data.to))
			}
			else if(data.type == "debug") {
				console.log("SSG: " + data.msg);
			}
			else if(data.type == "error") {
				//console.log(data);
				if(data.code == "ENOENT" && data.stack.indexOf("�") != -1) console.warn("File name encoding problem when opening file (try renaming it) ...\n" + data.stack);
				else if(data.code == "ENOENT") console.warn("Problem occured when opening file...\n" + data.stack);
				else console.log(data.stack);
			}
			else throw new Error("Unknown message from worker: " + JSON.stringify(data));
			
		});
		worker.on('error', function worker_error(code) {
			console.warn("SSG: Error code=" + code);
		});
		worker.on('exit', function worker_exit(code) {
			console.log("SSG: Exit! code=" + code);
			if(code != 0) throw new Error("The process exited with code=" + code + "! (It means something went wrong)");
			else {
				doneCompiling = true;
				workerExitCode= code;
				checkDone();
			}
		});
		
		function createFile(filePath, text) {

			var folder = UTIL.getDirectoryFromPath(filePath);
			
			if(foldersExist.indexOf(folder) != -1) {
				console.log("Saving to disk filePath=" + filePath + " because folder exist: folder=" + folder);
								
				CORE.saveToDisk(user, {path: filePath, text: text}, fileCreated);
				
			}
			else {
				waitingList.push(function() { createFile(filePath, text) });
				
				if(folderAboutToBeCreated.indexOf(folder) == -1) createPath(folder);
			}
			
			function fileCreated(err, path) {
				if(err) {
					//throw err;
					return callback(err);
				}
				else {
					fileSaved(filePath);
					runWaitingList();
				}
			}
		}
		
		function copyFile(from, to) {

			
			var folder = UTIL.getDirectoryFromPath(to);
			
			if(foldersExist.indexOf(folder) != -1) {
				
				CORE.copyFile(user, {from: from, to: to}, fileCopied);
				
			}
			else {
				waitingList.push(function() { copyFile(from, to) });
				
				if(folderAboutToBeCreated.indexOf(folder) == -1) createPath(folder);
			}
			
			function fileCopied(err, json) {
				if(err) {
					console.warn("Unable to copy file (" + err.message + ")\n" + json.to);
				}
				else {
					fileSaved(to);
					runWaitingList();
				}
			}
		}
		
		function createPath(folder, createPathCallback) {
			
			console.log("Creating path=" + folder);
			folderAboutToBeCreated.push(folder);
			
			CORE.createPath(user, {pathToCreate: folder}, function(err, json) {
				if(err) return callback(err);
				else {
					folderAboutToBeCreated.splice(folderAboutToBeCreated.indexOf(folder, 1));
					foldersExist.push(folder);
					
					//createPathCallback();
					
					runWaitingList();
				}
			});	
		}
		
		function runWaitingList() {
			console.log("Items in waiting list: waitingList.length=" + waitingList.length);
			if(waitingList.length > 0) waitingList.shift()();
		}
		
		function fileSaved(path) {
			console.log("Saved file path=" + path);
			filesToSave--;
			
			console.log("Files left to be saved: filesToSave=" + filesToSave);
			
			if(filesToSave == 0) checkDone();
		}
		
		function checkDone(exitCode) {
			if(filesToSave == 0 && doneCompiling) {
				
				callback(null, {ssgWorkerExitCode: workerExitCode});
			}
			else console.log("filesToSave=" + filesToSave + " exitCode=" + exitCode);
		}
		
		
	}
}


module.exports = API;
