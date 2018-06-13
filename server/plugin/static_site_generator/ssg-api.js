"use strict";

var UTIL = require("../../../client/UTIL.js");
var CORE = require("../../server_api.js");

var REMOTE_PROTOCOLS = ["ftp", "ftps", "sftp"]; // Supported remote connections

var API = {};
	
var SSG_BUILD = require("./ssg-build.js");

var ABORT = false;

API.compile = function compile(user, json, callback) {
	
	var source = user.translatePath(json.source);
	var destination = user.translatePath(UTIL.trailingSlash(json.destination));
	var publish = json.publish;
	var pubUser = json.pubUser;
	var pubPw = json.pubPw;
	var pubKey = json.pubKey;
	
	ABORT = false;
	
	var url = require("url");
	var parse = url.parse(destination);
	var protocol = parse.protocol;
	
	var fsTotal = 0;
	var fsComplete = 0;
	
	if(protocol) protocol = protocol.replace(/:/g, "").toLowerCase();
	
	console.log("protocol: " + protocol);
	
	console.log("source=" + JSON.stringify(url.parse(source), null, 2));
	console.log("destination=" + JSON.stringify(url.parse(destination), null, 2));
	
	user.send({ssgProgressStatus: {value: 0, max: 1}});
	
	if(REMOTE_PROTOCOLS.indexOf(protocol) != -1) {
		// We will need to connect to the remote location before uploading files
		var serverAddress = parse.host;
		var auth = parse.auth;
		if(auth) {
			auth = auth.split(":");
			if(auth.length == 2) {
				pubUser = auth[0];
				pubPw = auth[1];
			}
		}
		var keyPath = pubKey;
		
		var workingDir = parse.path;
		
		// workingDir: workingDir
		CORE.connect(user, {protocol: protocol, serverAddress: serverAddress, user: pubUser, passw: pubPw, keyPath: keyPath}, fsReady);
		
	}
	else {
		// Asume local file-system
		fsReady(null, user.workingDirectory);
	}
	
	
	function fsReady(err, workingDir) {
		
		if(err) {
			return callback(err);
		}
		
		console.log("Compiling: " + source);
		
		
		var childProcess = require("child_process");
		var path = require('path');
		
		var buildScript = "/usr/bin/ssg-build.js";
		
		if(user.rootPath == null) {
			// We are inside a chroot
			}
		
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
		
		SSG_BUILD.basePath = source;
		SSG_BUILD.pubFolder = destination;
		SSG_BUILD.publish = publish;
		SSG_BUILD.onMessage = worker_message;
		SSG_BUILD.nodeModulesPath = node_modules;
		
		SSG_BUILD.compile(function done(err) {
			if(err) {
				var e = new Error("Problem generating static site:" + err.message)
				SSG_BUILD.abort(); // This is not enough, it will not abort requests already made to for example fs module.
				ABORT = true;
				callback(e);
				return;
				throw e; // Need to abort everything! (there will be request to save files, etc, in the event loop)
				}
			
			console.log("Done compiling source=" + source + " to destination=" + destination);
			
			doneCompiling = true;
			workerExitCode = 0;
			checkDone();
		});
		
		/*
		var args = [source, destination];
		
		if(publish) args.push( "-publish");
		
		var nodeScriptOptions = {
			execPath: "/usr/bin/nodejs",
			cwd: workingDir,
			env: {
			myName: user.name,
			NODE_PATH: node_modules // Tell node runtime to check for modules in this folder
			},
			silent: false // If set to true: Makes us able to capture stdout and stderr, If set to false: It will use *our* stdout and stderr
		};
		
		
		var worker = childProcess.fork(buildScript, args, nodeScriptOptions);
		
		// Using process.send() to send message back here:
		worker.on('message', worker_message);
		
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
		*/
		
		function createFile(filePath, text) {
			if(ABORT) return SSG_BUILD.abort();
			
			var folder = UTIL.getDirectoryFromPath(filePath);
			
			if(foldersExist.indexOf(folder) != -1) {
				//console.log("Saving to disk filePath=" + filePath + " because folder exist: folder=" + folder);
								
				CORE.saveToDisk(user, {path: filePath, text: text, public: publish}, fileCreated);
				
			}
			else {
				waitingList.push(function() { createFile(filePath, text) });
				
				if(folderAboutToBeCreated.indexOf(folder) == -1) createPath(folder);
			}
			
			function fileCreated(err, path) {
				if(ABORT) return;
				
				fsComplete++;
				user.send({ssgProgressStatus: {value: fsComplete, max: fsTotal}});
				
				if(err) {
					//throw err;
					ABORT = true;
					SSG_BUILD.abort();
					return callback(err);
				}
				else {
					fileSaved(filePath);
					runWaitingList();
				}
			}
		}
		
		function worker_message(data) {
			
			if(ABORT) {
				
			}
			
			//console.log("SSG data: " + JSON.stringify(data));
			if(data.type == "console" || data.type == "error") {
			user.send({ssgBuildMessage: data});
			}
			
			if(data.type == "file") {
				filesToSave++;
				user.send({ssgProgressStatus: {value: fsComplete, max: ++fsTotal}});
				createFile(user.toVirtualPath(data.path), data.text)
			}
			else if(data.type == "copy") {
				filesToSave++;
				user.send({ssgProgressStatus: {value: fsComplete, max: ++fsTotal}});
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
			else console.warn("Unknown message from build script: " + JSON.stringify(data));
			
		}
		
		function copyFile(from, to) {

			if(ABORT) return;
			
			var folder = UTIL.getDirectoryFromPath(to);
			
			if(foldersExist.indexOf(folder) != -1) {
				
				CORE.copyFile(user, {from: from, to: to, public: publish}, fileCopied);
				
			}
			else {
				waitingList.push(function() { copyFile(from, to) });
				
				if(folderAboutToBeCreated.indexOf(folder) == -1) createPath(folder);
			}
			
			function fileCopied(err, json) {
				
				//console.log("Copied file to=" + json.to);
				user.send({ssgProgressStatus: {value: ++fsComplete, max: fsTotal}});
				
				if(ABORT) return;
				
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
			
			if(ABORT) return;
			
			user.send({ssgProgressStatus: {value: fsComplete, max: ++fsTotal}});
			
			//console.log("Creating path=" + folder);
			folderAboutToBeCreated.push(folder);
			
			CORE.createPath(user, {pathToCreate: folder, public: publish}, function(err, json) {
				
				//console.log("Created path=" + folder);
				user.send({ssgProgressStatus: {value: ++fsComplete, max: fsTotal}});
				
				if(ABORT) return;
				
				if(err) {
					ABORT = true;
					SSG_BUILD.abort();
					return callback(err);
				}
					else {
					folderAboutToBeCreated.splice(folderAboutToBeCreated.indexOf(folder, 1));
					foldersExist.push(folder);
					
					//createPathCallback();
					
					runWaitingList();
				}
			});	
		}
		
		function runWaitingList() {
			if(ABORT) return;
			
			//console.log("Items in waiting list: waitingList.length=" + waitingList.length + " filesToSave=" + filesToSave + " doneCompiling=" + doneCompiling);
			if(waitingList.length > 0) waitingList.shift()();
		}
		
		function fileSaved(path) {
			//console.log("Saved file path=" + path);
			filesToSave--;
			
			//console.log("Files left to be saved: filesToSave=" + filesToSave);
			
			if(filesToSave == 0) checkDone();
		}
		
		function checkDone(exitCode) {
			if(ABORT) return;
			
			if(filesToSave == 0 && doneCompiling) {
				console.log("All files saved!");
				callback(null, {ssgWorkerExitCode: workerExitCode});
			}
			else console.log("filesToSave=" + filesToSave + " exitCode=" + exitCode);
		}
		
		
	}
}


module.exports = API;
