
"use strict";

var UTIL = require("../client/UTIL.js");


var ftpQueue = []; // todo: Allow parrallel FTP commands (seems connection is dropped if you send a command while waiting for another)
var ftpBusy = false;


var API = {};

API.readFromDisk = function readFromDisk(user, json, callback) {
	
	var path = user.translatePath(json.path);
	if(path instanceof Error) return callback(path);
	
	var returnBuffer = json.returnBuffer;
	var encoding = json.encoding;
	
	var fileContent = "";
	var stream;
	
	if(!callback) {
		throw new Error("No callback defined!");
	}

	
	
	var fs = require("fs");
		
		console.log("Reading file from disk: " + path + " returnBuffer=" + returnBuffer + " encoding=" + encoding);
		//console.log(UTIL.getStack("Read from disk"));
		
		// Check path for protocol
		var url = require("url");
		var parse = url.parse(path);
		
		if(parse.protocol == "ftp:" || parse.protocol == "ftps:") {
		
		if(user.remoteConnections.hasOwnProperty(parse.hostname)) {
				
			var c = user.remoteConnections[parse.hostname].client;
				
				console.log("Getting file from FTP server: " + parse.pathname);
				
				c.get(parse.pathname, function getFtpFileStream(err, fileReadStream) {
					
					if(err) throw err;
					
					console.log("Reading file from FTP ...");
					
					console.log(fileReadStream);
					
					stream = fileReadStream;
					
					stream.setEncoding('utf8');
					stream.on('readable', readStream);
					stream.on("end", streamEnded);
					stream.on("error", streamError);
					stream.on("close", streamClose);
					
					// Hmm it seems the FTP module uses "old" streams:
					var StringDecoder = require('string_decoder').StringDecoder;
					var decoder = new StringDecoder('utf8');
					var str;
					stream.on('data', function(data) {
						str = decoder.write(data);
						fileContent += str;
						console.log('loaded part of the file');
					});
					
				});
				
			}
			else {
				user.send({msg: "No connection open to FTP on " + parse.hostname + " !"});
			}
		}
		else if(parse.protocol == "sftp:") {
			
		if(user.remoteConnections.hasOwnProperty(parse.hostname)) {
				
			var c = user.remoteConnections[parse.hostname].client;
				
				console.log("Getting file from SFTP server: " + parse.pathname);
				
				var options = {
					encoding: "utf8"
				}
				// Could also use sftp.createReadStream
				c.readFile(parse.pathname, options, function getSftpFile(err, buffer) {
					
					if(err) console.warn(err.message);
					
				callback(err, {path: path, data: buffer.toString("utf8")});
				
					
				});
				
			}
			else {
				user.send({msg: "No connection open to SFTP on " + parse.hostname + " !"});
			}
		}
		
		else {
			
			// Asume local file system
			
			if(path.indexOf("file://") == 0) path = path.substr(7); // Remove file://
			
			if(returnBuffer) {
				// If no encoding is specified in fs.readFile, then the raw buffer is returned.
				
				fs.readFile(path, function(err, buffer) {
					if(err) console.warn(err.message);
					
				callback(err, {path: user.toVirtualPath(path), data: buffer});
				
				});
			}
			else {
				
				if(encoding == undefined) encoding = "utf8";
				fs.readFile(path, encoding, function(err, string) {
					if(err) console.warn(err.message);
					
				callback(err, {path: user.toVirtualPath(path), data: string});
				
				});
			}
		}
	
	
	// Functions to handle NodeJS ReadableStream's
	function streamClose() {
		console.log("Stream closed! path=" + path);
	}
	
	function streamError(err) {
		console.log("Stream error! path=" + path);
		throw err;
	}
	
	function streamEnded() {
		console.log("Stream ended! path=" + path);
		
		callback(null, {path: path, data: fileContent});
		
	}
	
	function readStream() {
		// Called each time there is something comming down the stream
		
		var chunk;
		var str = "";
		var StringDecoder = require('string_decoder').StringDecoder;
		var decoder = new StringDecoder('utf8');
		
		//var chunkSize = 512; // How many bytes to recive in each chunk
		
		console.log("Reading stream ... isPaused=" + stream.isPaused());
		
		while (null !== (chunk = stream.read()) && !stream.isPaused() ) {
			
			// chunk is Not a string! And it can cut utf8 characters in the middle, so use decoder
			str = decoder.write(chunk);
			
			fileContent += str;
			
			console.log("Got chunk! str.length=" + str.length + "");
			
		}
	}
}

API.copyFile = function copyFile(user, json, callback) {
	
	var source = user.translatePath(json.from);
	var target = user.translatePath(json.to);
	
	var cbCalled = false;
	
	var fs = require("fs");
	
	var rd = fs.createReadStream(source);
	rd.on("error", function(err) {
		done(err);
	});
	
	var wr = fs.createWriteStream(target);
	wr.on("error", function(err) {
		done(err);
	});
	wr.on("close", function(ex) {
		done();
	});
	rd.pipe(wr);

	function done(err) {
		if (!cbCalled) {
			callback(err, {to: target});
			cbCalled = true;
		}
	}
}



API.getFileSizeOnDisk = function getFileSizeOnDisk(user, json, callback) {
	
	var path = user.translatePath(json.path);
	if(path instanceof Error) return callback(path);
	
	// Check path for protocol
	var url = require("url");
	var parse = url.parse(path);
	
	if(parse.protocol == "ftp:" || parse.protocol == "ftps:") {
		
		if(user.remoteConnections.hasOwnProperty(parse.hostname)) {
			
			var c = user.remoteConnections[parse.hostname].client;
			
			console.log("Getting file size from FTP server: " + parse.protocol + parse.hostname + parse.pathname);
			
			// Asume the FTP server has support for RFC 3659 "size"
			c.size(parse.pathname, function gotFtpFileSize(err, size) {
				if(err) {
					console.warn(err.message);
					callback(err);
				}
				else {
					callback(null, {size: size});
				}
			});
		}
		else {
			// Should we give an ENOENT here ?
			callback(new Error("Failed to get file size for: " + path + "\nNo connection open to FTP on " + parse.hostname + " !"));
		}
	}
	else if(parse.protocol == "sftp:") {
		
		if(user.remoteConnections.hasOwnProperty(parse.hostname)) {
			
			var c = user.remoteConnections[parse.hostname].client;
			
			console.log("Getting file size from SFTP server: " + parse.pathname);
			
			c.stat(parse.pathname, function gotSftpFileSize(err, stat) {
				
				if(err) {
					callback(err);
				}
				else {
					callback(null, {size: stat.size});
				}
			});
		}
		else {
			callback(new Error("Failed to get file size for: " + path + "\nNo connection open to SFTP on " + parse.hostname + " !"));
		}
	}
	else {
		
		// It's a normal file path
		
		var fs = require("fs");
		
		fs.stat(path, checkSize);
		
	}

	function checkSize(err, stats) {
		
		if(err) callback(err);
		else callback(null, {size: stats["size"]});
		
	}
}



API.saveToDisk = function saveToDisk(user, json, saveToDiskCallback) {

	var path = user.translatePath(json.path);
	if(path instanceof Error) return saveToDiskCallback(path);
	
	var inputBuffer = json.inputBuffer;
	var encoding = json.encoding;
	var text = json.text;
	
if(encoding == undefined) encoding = "utf-8";

// Check path for protocol
var url = require("url");
var parse = url.parse(path);
var hostname = parse.hostname;
var protocol = parse.protocol;
var pathname = parse.pathname;

console.log("Saving to disk ... protocol: " + protocol + " hostname=" + hostname + " pathname=" + pathname);

if(protocol == "ftp:" || protocol == "ftps:") {
	
	if(ftpBusy) {
		console.log("FTP is busy. Queuing upload of pathname=" + pathname + " ...");
		ftpQueue.push(function() { uploadFTP(pathname, text); });
	}
	else {
		ftpBusy = true;
		console.log("FTP is ready. Uploading pathname=" + pathname + " ...");
		uploadFTP(pathname, text);
	}
}
else if(protocol == "sftp:") {
	
	if(user.remoteConnections.hasOwnProperty(hostname)) {
		
		var c = user.remoteConnections[hostname].client;
		
		var input = inputBuffer ? text : new Buffer(text, encoding);
		var destPath = pathname;
		var options = {encoding: encoding};
		// Could also use sftp.createWriteStream
		console.log("Waiting for SFTP ...");
		c.writeFile(destPath, input, options, function sftpWrite(err) {
			if(err) {
				console.warn("Failed to save to path= " + path + "\n" + err.message);
				saveToDiskCallback(err);
			}
			else {
				console.log("Saved " + destPath + " on SFTP " + hostname);
					saveToDiskCallback(null, {path: path});
				}
				
			});
			
		}
		else {
			saveToDiskCallback(new Error("Failed to save to path=" + path + "\nNo connection to SFTP on " + hostname + ""));
		}
	}
	else {
		
		// Asume local file-system
		
		var fs = require("fs");
		fs.writeFile(path, text, encoding, function(err) {
			console.log("Attempting saving to local file system: " + path + " ...");
			
			if(err) {
				console.warn("Unable to save " + path + "!");
				saveToDiskCallback(err);
			}
			else {
				console.log("The file was successfully saved: " + path + "");
				saveToDiskCallback(null, {path: user.toVirtualPath(path)});
			}
		});
	}
	
	
	function uploadFTP(pathname, text) {
		console.log("Uploading to FTP ... pathname=" + pathname);
		
		if(user.remoteConnections.hasOwnProperty(hostname)) {
			
			var ftpClient = user.remoteConnections[hostname].client;
			
			var input = inputBuffer ? text : new Buffer(text, encoding);
			var useCompression = false;
			
			ftpClient.put(input, pathname, useCompression, putFtpDone);
			
		}
		else {
			saveToDiskCallback(new Error("Failed to save to path=" + path + "\nNo connection to FTP on " + hostname + " !"));
			runFtpQueue();
		}
		
		function putFtpDone(err) {
			if(err) {
				console.warn("Failed to save pathname= " + pathname + "\n" + err);
				saveToDiskCallback(err);
				runFtpQueue();
			}
			else {
				
				console.log("Successfully saved pathname=" + pathname + "");
				
				saveToDiskCallback(null, {path: path});
				
				runFtpQueue();
			}
			
		}
		
	}
}



API.listFiles = function listFiles(user, json, listFilesCallback) {
	if(listFilesCallback == undefined) throw new Error("Need to specity a callback!");

	var pathToFolder = json.pathToFolder;
	
	if(!pathToFolder) return listFilesCallback(new Error("No pathToFolder defined!"));

	pathToFolder = UTIL.trailingSlash(pathToFolder);
	
	pathToFolder = user.translatePath(pathToFolder);
	if(pathToFolder instanceof Error) return listFilesCallback(pathToFolder);
	
	
	/*
		Try to get the file list in the same format regardless of protocol!
		
		type - string - A single character denoting the entry type: 'd' for directory, '-' for file (or 'l' for symlink on *NIX only).
		name - string - File or folder name
		path - string - Full path to file/folder
		size - float - The size of the entry in bytes.
		date - Date - The last modified date of the entry.
		
		
	*/
	
	var url = require('url');
	var parse = url.parse(pathToFolder);
	var protocol = parse.protocol;
	var hostname = parse.hostname;
	var pathname = parse.pathname;
	
	if(protocol == "ftp:" || protocol == "ftps:") {
		// ### List files using FTP protocol
		
		if(ftpBusy) {
			console.log("FTP is busy. Queuing file-list of pathname=" + pathname + " ...");
			ftpQueue.push(function() { listFilesFTP(pathname); });
		}
		else {
			ftpBusy = true;
			console.log("FTP is ready. Listing files in pathname=" + pathname + " ...");
			listFilesFTP(pathname);
		}
	}
	else if(protocol == "sftp:") {
		// ### List file using SFTP protocol
		if(user.remoteConnections.hasOwnProperty(hostname)) {
			
			var c = user.remoteConnections[hostname].client;
			
			console.log("Initiating folder read on SFTP " + hostname + ":" + pathname);
			
			// SFTP can list files in any folder. So we do not have to make sure the path is the same as the working directory (like with ftp)
			// hmm, it seems we can only do readdir once on each folder
			var b = c.readdir(pathname, function sftpReadDir(err, folderItems) {
				
				//UTIL.getStack("XXX");
				
				console.log("Reading folder: " + pathname + " ...");
				
				if(err) {
					listFilesCallback(err);
				}
				else {
					
					//console.log(JSON.stringify(folderItems, null, 2));
					
					var list = [];
					var path = "";
					var type = "";
					
					for(var i=0; i<folderItems.length; i++) {
						path = pathToFolder + folderItems[i].filename; // Asume pathToFolder has a trailing slash
						type = folderItems[i].longname.substr(0, 1);
						
						if(type == "d") path = UTIL.trailingSlash(path);
						
						//console.log("path=" + path);
						list.push({type: type, name: folderItems[i].filename, path: path, size: parseFloat(folderItems[i].attrs.size), date: new Date(folderItems[i].attrs.mtime*1000)});
					}
					
					listFilesCallback(null, {list: list});
					
				}
				
			});
			
			//console.log("b=" + b);
			
		}
		else {
			listFilesCallback(new Error("Unable to read " + pathname + " on " + hostname + "\nNot connected to SFTP on " + hostname + " !"));
		}
	}
	else {
		// ### List files using "normal" file system
		var fs = require("fs");
		//console.log("Reading directory=" + pathToFolder);
		fs.readdir(pathToFolder, function readdir(err, folderItems) {
			if(err) {
				listFilesCallback(err);
			}
			else {
				var filePath;
				var list = [];
				var statCounter = 0;
				if(folderItems.length == 0) {
					// It's an emty folder
					listFilesCallback(null, {list: list});
				}
				else {
					var path = require("path");
					
					for(var i=0; i<folderItems.length; i++) {
						
						// Check item name for encoding problems �
						
						stat(folderItems[i], path.join(pathToFolder, folderItems[i]));
						// We do not know if it's a folder or file yet, folderItems is just an array of strings, we have to wait for stat
					}
				}
			}
			
			function stat(fileName, filePath) {
				//console.log("Making stat: " + filePath + "");
				
				fs.stat(filePath, function stat(err, stats) {
					
					var type = "";
					var size;
					var mtime;
					var problem = "";
					
					if(stats) {
						size = stats.size;
						mtime = stats.mtime;
						
						if(stats.isFile()) {
							type = "-";
						}
						else if(stats.isDirectory()) {
							type = "d";
							filePath = UTIL.trailingSlash(filePath);
						}
					}
					
					if(err) {
						
						/*
							EPERM = operation not permitted
							EBUSY = resource busy or locked
						*/
						
						if(err.code == "EPERM" || err.code == "EBUSY") {
							problem = err.code;
							type = "*"
						}
						else return listFilesCallback(err);
					}
					
					//console.log("stat: " + stats);
					
					
					
					list.push({type: type, name: fileName, path: user.toVirtualPath(filePath), size: size, date: mtime, problem: problem});
					
					statCounter++;
					
					//console.log("Finished stat: " + filePath + " statCounter=" + statCounter + " folderItems.length=" + folderItems.length);
					
					if(statCounter==folderItems.length) listFilesCallback(null, {list: list});
					
					
				});
			}
			
			
		});
		
		
	}
	
	
	function listFilesFTP(pathname) {
		
		if(user.remoteConnections.hasOwnProperty(hostname)) {
			
			var ftpClient = user.remoteConnections[hostname].client;
			
			if(pathToFolder != user.workingDirectory) {
				// First change folder
				console.log("Sending cwd '" + pathname + "' to " + protocol + hostname);
				ftpClient.cwd(pathname, function changedDir(err) {
					
					if(err) {
						listFilesCallback(err);
						runFtpQueue();
					}
					else {
						ftpListFiles(ftpClient);
					}
					
				});
			}
			else {
				ftpListFiles(ftpClient);
			}
		}
		else {
			listFilesCallback(new Error("Unable to read " + pathname + " on " + hostname + "\nNot connected to FTP on " + hostname + " !"));
			runFtpQueue();
		}
		
		function ftpListFiles(ftpClient) {
			
			console.log("Listing files in '" + parse.pathname + "' on " + parse.protocol + parse.hostname);
			
			ftpClient.list(function readdirFtp(err, folderItems) {
				if (err) {
					console.warn(err.message);
					listFilesCallback(err);
					runFtpQueue();
				}
				else {
					
					var list = [];
					var path = "";
					var type = "";
					
					//console.log("folderItems=" + JSON.stringify(folderItems, null, 2));
					
					for(var i=0; i<folderItems.length; i++) {
						
						//console.log("name=" + folderItems[i].name);
						
						path = pathToFolder + folderItems[i].name;
						type = folderItems[i].type;
						
						if(type == "d") path = UTIL.trailingSlash(path);
						
						// todo: parse date ?
						list.push({type: type, name: folderItems[i].name, path: path, size: parseFloat(folderItems[i].size), date: folderItems[i].date});
					}
					
					listFilesCallback(null, {list: list});
					
					runFtpQueue();
					
				}
			});
		}
	}
}

// todo: Some sort of suecurity where a working "jail" can be issued to each user
API.workingDirectory = function workingDirectory(user, json, callback) {
	callback(null, {path: user.workingDirectory});
}



API.createPath = function createPath(user, json, createPathCallback) {
	/*
		Traverse the path and try to creates the directories, then check if the full path exists
		
	*/
	
	var pathToCreate = user.translatePath(json.pathToCreate);
	if(pathToCreate instanceof Error) return createPathCallback(pathToCreate);
	
	pathToCreate = UTIL.trailingSlash(pathToCreate);
	
	var url = require('url');
	var parse = url.parse(pathToCreate);
	var protocol = parse.protocol;
	var delimiter = UTIL.getPathDelimiter(pathToCreate);
	var lastChar = pathToCreate.substring(pathToCreate.length-1);
	var hostname = parse.hostname;
	var create = UTIL.getFolders(pathToCreate);
	var errors = [];
	var fullPath = create[create.length-1];
	
	if(protocol) protocol = protocol.replace(/:/g, "").toLowerCase();
	
	console.log("hostname=" + hostname + " pathToCreate=" + pathToCreate + " parse=" + JSON.stringify(parse));
	
	create.shift(); // Don't bother with the root
	
	// Execute mkdir in order !
	if(create.length == 0) {
		console.warn("No path to create! fullPath=" + fullPath);
		createPathCallback(null, {path: fullPath});
	}
	else executeMkdir(create.shift());
	
	function executeMkdir(folder) {
		// This is a recursive function!
		createPathSomewhere(folder, function(err, path) {
			if(err) errors.push(err.message + " path=" + path);
			
			if(create.length > 0) executeMkdir(create.shift());
			else done();
			
		});
	}
	
	function done() {
		// Check if the full path exists
		
		pathToCreate = user.toVirtualPath(pathToCreate); // API.listFiles wants a virtual path!
		
		API.listFiles(user, {pathToFolder: pathToCreate}, listFileResult);
		
		function listFileResult(err, json) {
			
			if(err) {
				console.warn("List failed! " + err.message + " pathToCreate=" + pathToCreate);
				var errorMsg = "Failed to create path=" + pathToCreate + "\n" + err.message;
				for(var i=0; i<errors.length; i++) {
					errorMsg += "\n" + errors[i];
				}
				
				createPathCallback(new Error(errorMsg));
			}
			else {
				createPathCallback(null, {path: fullPath})
			}
		}
	}
	
	function createPathSomewhere(path, createPathSomewhereCallback) {
		
		// ## mkdir ...
		
		console.log("mkdir " + path);
		
		if(path.indexOf("//") != -1) {
			path = path.replace(/\/\/+/g, "/"); // Remove double slashes
			console.warn("Sanitizing path=" + path + " pathToCreate=" + pathToCreate);
		}
		
		if(protocol == "ftp" || protocol == "ftps") {
			// ### Create a directory using FTP protocol
			
			if(ftpBusy) {
				console.log("FTP is busy. Queuing mkdir of path=" + path + " ...");
				ftpQueue.push(function() { createPathFTP(path); });
			}
			else {
				ftpBusy = true;
				console.log("FTP is ready. Creating path=" + path + " ...");
				createPathFTP(path);
			}
			
			
		}
		else if(parse.protocol == "sftp:") {
			// ### Create a directory using SFTP protocol
			if(user.remoteConnections.hasOwnProperty(parse.hostname)) {
				
				var c = user.remoteConnections[parse.hostname].client;
				
				var b = c.mkdir(path, function (err, folderItems) {
					
					//UTIL.getStack("XXX");
					
					if(err) createPathSomewhereCallback(err, path);
					else createPathSomewhereCallback(null, path);
					
					
				});
				
				// b = false : If you should wait for the continue event before sending any more traffic.
				
				//console.log("b=" + b);
				
			}
			else {
				createPathCallback(new Error("Unable to create " + path + " on " + hostname + "\nNot connected to SFTP on " + hostname + " !"));
			}
		}
		else {
			// ### Create a directory using "normal" file system
			var fs = require("fs");
			
			fs.mkdir(path, function(err) {
				if(err) createPathSomewhereCallback(err, path);
				else createPathSomewhereCallback(null, path);
			});
		}
		
		
		function createPathFTP(path) {
			
			console.log("Creating FTP path=" + path)
			
			if(user.remoteConnections.hasOwnProperty(hostname)) {
				
				var c = user.remoteConnections[hostname].client;
				
				// ftp mkdir
				c.mkdir(path, function(err) {
					
					console.log("Done creating FTP path=" + path);
					
					if(err) createPathSomewhereCallback(err, path);
					else createPathSomewhereCallback(null, path);
					
					runFtpQueue();
					
				});
				
			}
			else {
				createPathCallback(new Error("Unable to create path=" + path + " on " + hostname + "\nNot connected to FTP on " + hostname + " !"));
				runFtpQueue();
			}
		}
		
	}
}


API.connect = function connect(user, json, callback) {
	
	var protocol = json.protocol;
	var serverAddress = json.serverAddress;
	var username = json.user;
	var passw = json.passw;
	var keyPath = json.keyPath;
	var workingDir = json.workingDir;
	
	if(protocol == undefined) throw new Error("No protocol defined!");
	
	if(protocol.indexOf(":") != -1) {
		console.warn("Removing : (colon) from protocol=" + protocol);
		protocol = protocol.replace(/:/g, "");
	}
	
	protocol = protocol.toLowerCase();
	
	console.log("protocol=" + protocol);
	
	var supportedRemoteProtocols = ["ftp", "ftps", "sftp"];
	
	if(supportedRemoteProtocols.indexOf(protocol) == -1) throw new Error("Protocol=" + protocol + " not supported! supportedRemoteProtocols=" + JSON.stringify(supportedRemoteProtocols)); 
	
	if(protocol == "ftp" || protocol == "ftps") {
		
		if(ftpQueue.length > 0) {
			console.warn("Removing " + ftpQueue.length + " items from the FTP queue");
			ftpQueue.length = 0;
		}
		
		var Client = require('ftp');
		user.remoteConnections[serverAddress] = {client: new Client(), protocol: protocol};
		var ftpClient = user.remoteConnections[serverAddress].client;
		ftpClient.on('ready', function() {
			console.log("Connected to FTP server on " + serverAddress + " !");
			ftpClient.pwd(function(err, dir) {
				if(err) throw err;
				user.changeWorkingDir(protocol + "://" + serverAddress + dir.replace("\\", "/"));
				
				// Create disconnect function
				user.remoteConnections[serverAddress].close = function disconnectFTP() {
					ftpClient.end();
					delete user.remoteConnections[serverAddress];
					
					console.log("Dissconnected from FTP on " + serverAddress + "");
				};
				
				callback(null, {workingDirectory: user.workingDirectory});
				callback = null; // Don't callback again when the connection timeouts
				
			});
			
		});
		
		ftpClient.on('error', function(err) {
			
			if(callback) callback(err);
			
			user.send(err.message);
			
			user.remoteConnectionClosed("ftp", serverAddress);
			
		});
		
		ftpClient.on('close', function(hadErr) {
			user.send("Connection to FTP on " + serverAddress + " closed.");
			
			user.remoteConnectionClosed("ftp", serverAddress);
			
		});
		
		var options = {host: serverAddress, user: username, password: passw};
		
		if(protocol == "ftps") {
			options.secure = true;
			
			// Some times the cert is lost!? So we need to override checkServerIdentity to return undefined instead of throwing an error: Cannot read property 'CN' of undefined
			// https://nodejs.org/api/tls.html#tls_tls_connect_options_callback
			
			options.secureOptions = {
				checkServerIdentity: function(servername, cert) {
					console.log("Checking server identity for servername=" + servername);
					
					if(Object.keys(cert).length == 0) console.warn("No cert attached!");
					else {
						// Do some checking?
						//console.log(JSON.stringify(cert));
					}
					
					return undefined;
					
				}
			}
		}
		console.log("Connecting to " + options.host + " ...");
		ftpClient.connect(options);
	}
	
	// note: SSH (shell) not yet supported. Use SFTP instead!
	else if(protocol == "ssh") {
		
		sshConnect(function sshConnected(err, sshClient, workingDir) {
			if(err) callback(err);
			else {
				
				user.remoteConnections[serverAddress] = {client: sshClient, protocol: protocol};
				
				// Create disconnect function
				user.remoteConnections[serverAddress].close = function disconnectSSH() {
					sshClient.end();
					delete user.remoteConnections[serverAddress];
					
					console.log("Dissconnected from SSH on " + serverAddress + "");
				};
				
				user.changeWorkingDir(workingDir);
				
				callback(null, {workingDirectory: user.workingDirectory});
				callback = null; // Don't callback again when the connection timeouts
			}
		});
		
	}
	else if(protocol == "sftp") {
		
		sshConnect(function sshConnected(err, sshClient, workingDir) {
			if(err) callback(err);
			else {
				// Initiate "SFTP mode"
				sshClient.sftp(function(err, sftpClient) {
					if (err) {
						sshClient.end();
						callback(err);

					}
					else {
						user.remoteConnections[serverAddress] = {client: sftpClient, protocol: protocol};
						user.changeWorkingDir(workingDir);
						
						console.log("Connected to SFTP on " + serverAddress + " . Working directory is: " + user.workingDirectory);
						
						// Create disconnect function
						user.remoteConnections[serverAddress].close = function disconnectSFTP() {
							sshClient.end();
							delete user.remoteConnections[serverAddress];
							
							console.log("Dissconnected from SFTP on " + serverAddress + "");
						};
						
						callback(null, {workingDirectory: user.workingDirectory});
						callback = null; // Don't callback again when the connection timeouts
					}
				});
			}
		});
	}
	else {
		throw new Error("Protocol not supported: " + protocol);
	}
	
	
	function sshConnect(cb) {
		// Connects to a SSH server and sets the working directory, returns the "connection" in the cb callback
		
		var auth = {
			host: serverAddress,
			port: 22,
			username: username,
		}
		
		if(keyPath) {
			// Connect using key
			API.readFromDisk(user, {path: keyPath}, function readKey(err, json) { // Read key
				var path = json.path
				var keyStr = json.data;
				
				auth.passphrase = passw;
				auth.privateKey = keyStr;
				try {
					connect();
				}
				catch(err) {
					cb(err);
					//user.send("Problem connecting to SSH on " + serverAddress + ".\n" + err.message + "\nProbably wrong key passphrase");
				}
			});
		}
		else {
			// Connect using password
			auth.password = passw;
			connect();
		}
		
		function connect() {
			var Client = require('ssh2').Client;
			
			var c = new Client();
			c.on('ready', function() {
				console.log('Client :: ready');
				
				c.exec('pwd', function(err, stream) {
					if (err) throw err;
					var dir = "";
					stream.on('close', function(code, signal) {
						//console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						
						// Chop off the newline character
						dir = dir.substring(0, dir.length-1);
						
						var workingDir = UTIL.trailingSlash(protocol + "://" + serverAddress + dir.replace("\\", "/"));
						
						cb(null, c, workingDir);
						
						//c.end();
					}).on('data', function(data) {
						//console.log('STDOUT: ' + data);
						dir += data;
					}).stderr.on('data', function(data) {
						cb(new Error("Error executing pwd on SSH:" +  serverAddress + "\n" + data));
						//user.send("Error executing pwd on SSH:" +  serverAddress + "\n" + data);
						console.warn('STDERR: ' + data);
					});
				});
				
			}).on('error', function(err) {
				cb(err);
				if(err.message == "All configured authentication methods failed") {
					user.send("Problem connecting to SSH on " + serverAddress + "\n" + err.message + "\nYou might need a key!");
				}
				else {
					user.send("Problem connecting to SSH on " + serverAddress + "\n" + err.message);
				}
				user.remoteConnectionClosed("ssh", serverAddress);
				
			}).on('end', function(msg) {
				user.send("Disconnected from SSH on " + serverAddress + "\nMessage: " + msg);
				
				user.remoteConnectionClosed("ssh", serverAddress);
				
			}).connect(auth);
		}
	}
}

API.disconnect = function disconnect(user, json, callback) {
	// Disconnect remove connection
	
	var protocol = json.protocol;
	var serverAddress = json.serverAddress;
	
	if(!user.remoteConnections.hasOwnProperty(serverAddress)) return callback(new Error("Unknown connection: serverAddress=" + serverAddress));
	
	user.changeWorkingDir(user.defaultWorkingDirectory);
	
	user.remoteConnections[serverAddress].close();
	
	callback(null, {workingDirectory: user.workingDirectory});
	
}

API.setWorkingDirectory = function setWorkingDirectory(user, json, callback) {
	
	/*
		Working directory can be on a remote file-system!
	  
	*/
	
	
	var path = user.translatePath(json.path);
	if(path instanceof Error) return callback(path);
	
	callback(null, {workingDirectory:path});
	
	/*
	var fs = require("fs");
	fs.stat(path, function (err, stats){
		if (err) {
			console.log("Error when running stat on path=" + path);
			return callback(err);
		}
		if (!stats.isDirectory()) callback(new Error('Not a directory: path=' + path));
		else {
			path = user.changeWorkingDir(path);
			
			callback(null, {workingDirectory:path});
		}
	});
	*/
}




API.storageGetAll = function storageGetAll(user, json, callback) {
	
	if(user.storage) {
		callback(null, {storage: user.storage});		
	}
	else {
		
		user.loadStorage(function(err, data) {
			if(err) callback(err);
			else callback(null, {storage: data});
		});

	}

}


API.storageSet = function storageSet(user, json, callback) {
	
	var itemName = json.item;
	var value = json.value;
	
	if(itemName == undefined) return callback(new Error("item=" + itemName + " can not be null or undefined!"));
	if(value === undefined) return callback(new Error("value must be defined!"));
	
	if(!user.storage) {
		user.loadStorage(function(err, data) {
			if(err) callback(err);
			else save();
		});
	}
	else save();
	
	function save() {
		user.storage[itemName] = value;
		user.saveStorageItem(itemName, function(err) {
			if(err) callback(err);
			else callback(null, {saved: itemName});
		});
	}
	
}

API.storageRemove = function storageRemove(user, json, callback) {
	
	var itemName = json.item;
	
	if(itemName == undefined) return callback(new Error("item=" + itemName + " can not be null or undefined!"));
	
	if(!user.storage.hasOwnProperty(itemName)) {
		return callback(new Error("Item=" + itemName + " is already gone from the storage!"));
	}
	
	delete user.storage[itemName];
	
	user.removeStorageItem(itemName, function(err) {
		if(err) callback(err);
		else callback(null, {removed: itemName});
	});
	
}


API.mirror = function mirror(user, json, callback) {
	
	if(json.object == undefined) return callback(new Error("object=" + object + " can not be null or undefined!"));
	if(json.method == undefined) return callback(new Error("method=" + method + " can not be null or undefined!"));
	if(json.cId == undefined) return callback(new Error("cId=" + cId + " can not be null or undefined!"));
	
	user.send({mirror: json});
	
	//callback(null, json);
	
}


API.deleteFile = function deleteFile(user, json, callback) {
	
	var filePath = user.translatePath(json.filePath);
	if(filePath instanceof Error) return callback(filePath);
	
	// Check path for protocol
	var url = require("url");
	var parse = url.parse(filePath);
	
	if(parse.protocol == "ftp:" || parse.protocol == "ftps:") {
		
		if(user.remoteConnections.hasOwnProperty(parse.hostname)) {
			
			var c = user.remoteConnections[parse.hostname].client;
			
			console.log("Deleting file from FTP server: " + parse.protocol + parse.hostname + parse.pathname);
			
			// Asume the FTP server has support for RFC 3659 "size"
			c.delete(parse.pathname, function ftpFileDeleted(err) {
				if(err) {
					console.warn(err.message);
					callback(err);
				}
				else {
					callback(null, {filePath: json.filePath});
				}
			});
		}
		else {
			// Should we give an ENOENT here ?
			callback(new Error("Failed to delete file: " + filePath + "\nNo connection open to FTP on " + parse.hostname + " !"));
		}
	}
	else if(parse.protocol == "sftp:") {
		
		if(user.remoteConnections.hasOwnProperty(parse.hostname)) {
			
			var c = user.remoteConnections[parse.hostname].client;
			
			console.log("Deleting file from SFTP server: " + parse.pathname);
			
			c.remove(parse.pathname, function sftpFileDeleted(err) {
				
				if(err) callback(err);
				else callback(null, {filePath: json.filePath});
				
			});
		}
		else {
			callback(new Error("Failed to delete file: " + filePath + "\nNo connection open to SFTP on " + parse.hostname + " !"));
		}
	}
	else {
		
		// It's a normal file path
		
		var fs = require("fs");
		
		fs.unlink(filePath, function localFileDeleted(err) {
			if(err) callback(err);
			else callback(null, {filePath: json.filePath});
		});
		
	}
	}



function runFtpQueue() {
	
	console.log(ftpQueue.length + " items left in the FTP queue");
	
	if(ftpQueue.length > 0) {
		console.log("Executing next item in the ftp queue ...");
		ftpQueue.shift()();
	}
	else ftpBusy = false;
	
}




module.exports = API;
