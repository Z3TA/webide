
"use strict";

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
		//console.log(getStack("Read from disk"));
		
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
	
	if(editor.connections.hasOwnProperty(hostname)) {
		
		var c = editor.connections[hostname].client;
		
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
		
		if(editor.connections.hasOwnProperty(hostname)) {
			
			var ftpClient = editor.connections[hostname].client;
			
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





module.exports = API;
