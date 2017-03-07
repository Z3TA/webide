
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



module.exports = API;
