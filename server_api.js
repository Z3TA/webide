
"use strict";

var UTIL = require("./UTIL.js")

var API = {};


API.readFromDisk = function readFromDisk(user, json, callback) {
	
	var path = json.path;
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
			
		if(user.connections.hasOwnProperty(parse.hostname)) {
				
			var c = user.connections[parse.hostname].client;
				
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
				alertBox("No connection open to FTP on " + parse.hostname + " !");
			}
		}
		else if(parse.protocol == "sftp:") {
			
		if(user.connections.hasOwnProperty(parse.hostname)) {
				
			var c = user.connections[parse.hostname].client;
				
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
				alertBox("No connection open to SFTP on " + parse.hostname + " !");
			}
		}
		
		else {
			
			// Asume local file system
			
			if(path.indexOf("file://") == 0) path = path.substr(7); // Remove file://
			
			if(returnBuffer) {
				// If no encoding is specified in fs.readFile, then the raw buffer is returned.
				
				fs.readFile(path, function(err, buffer) {
					if(err) console.warn(err.message);
					
				callback(err, {path: path, data: buffer});
				
				});
			}
			else {
				
				if(encoding == undefined) encoding = "utf8";
				fs.readFile(path, encoding, function(err, string) {
					if(err) console.warn(err.message);
					
				callback(err, {path: path, data: string});
				
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



API.getFileSizeOnDisk = function getFileSizeOnDisk(user, json, callback) {
	
	var path = json.path;
	
	// Check path for protocol
	var url = require("url");
	var parse = url.parse(path);
	
	if(parse.protocol == "ftp:" || parse.protocol == "ftps:") {
		
		if(user.connections.hasOwnProperty(parse.hostname)) {
			
			var c = user.connections[parse.hostname].client;
			
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
		
		if(user.connections.hasOwnProperty(parse.hostname)) {
			
			var c = user.connections[parse.hostname].client;
			
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
		
		function checkSize(err, stats) {
			
			if(err) callback(err)
			else callback(null, {size: stats["size"]});
			
		}
		
	}
}



API.saveToDisk = function saveToDisk(user, json, saveToDiskCallback) {

	var path = json.path;
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
	
	if(user.connections.hasOwnProperty(hostname)) {
		
		var c = user.connections[hostname].client;
		
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
				//alertBox("Unable to save file! " + err.message + "\n" + path);
				console.warn("Unable to save " + path + "!");
				saveToDiskCallback(err);
			}
			else {
				console.log("The file was successfully saved: " + path + "");
				saveToDiskCallback(null, {path: path});
			}
		});
	}
	
	
	function uploadFTP(pathname, text) {
		console.log("Uploading to FTP ... pathname=" + pathname);
		
		if(user.connections.hasOwnProperty(hostname)) {
			
			var ftpClient = user.connections[hostname].client;
			
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

	var pathToFolder = json.pathToFolder;

	if(pathToFolder == undefined) throw new Error("Need to specity a pathToFolder!");
	if(listFilesCallback == undefined) throw new Error("Need to specity a callback!");

	//pathToFolder = UTIL.trailingSlash(json.pathToFolder);
	
	
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
		if(user.connections.hasOwnProperty(hostname)) {
			
			var c = user.connections[hostname].client;
			
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
		console.log("Reading directory=" + pathToFolder);
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
				console.log("Making stat: " + filePath + "");
				
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
					
					
					
					list.push({type: type, name: fileName, path: filePath, size: size, date: mtime, problem: problem});
					
					statCounter++;
					
					console.log("Finished stat: " + filePath + " statCounter=" + statCounter + " folderItems.length=" + folderItems.length);
					
					if(statCounter==folderItems.length) listFilesCallback(null, {list: list});
					
					
				});
			}
			
			
		});
		
		
	}
	
	
	function listFilesFTP(pathname) {
		
		if(user.connections.hasOwnProperty(hostname)) {
			
			var ftpClient = user.connections[hostname].client;
			
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
	callback(null, {path: process.cwd()});
}

module.exports = API;
