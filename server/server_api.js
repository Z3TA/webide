
"use strict";

// Need to require non native modules here before we are chrooted

var iconv = require('iconv-lite');

var UTIL = require("../client/UTIL.js");

var FTP = require('ftp');
var SSH2 = require('ssh2');

var ftpQueue = []; // todo: Allow parrallel FTP commands (seems connection is dropped if you send a command while waiting for another)
var ftpBusy = false;

var API = {};

var DEFAULT_FILE_MODE = parseInt("0770", 8); // 1 = execute, 2 = write, 4 = read (note: umask is 0022)
var DEFAULT_FOLDER_MODE = parseInt("0770", 8); // 1 = execute, 2 = write, 4 = read (note: umask is 0022)
// Default is only the user are allowed to access files the user creates (umask 0022)

var FIND_FILES_ABORTED = false;
var FIND_FILES_IN_FLIGHT = 0;

var ECHO_COUNTER = 0;

API.countLines = function countLines(user, json, callback) {

	API.readLines(user, json, function linesRead(err, json) {
		if(err) return callback(err);
		
		callback(null, {path: json.path, totalLines: json.totalLines});
		
	});
	
}

API.extract = function extract(user, json, callback) {
	
	var supportedFileTypes = ["zip", "rar", "gz", "tar.gz", "tgz"];
	
	var source = json.source;
	var destination = json.destination;
	
	if(source == undefined) callback(new Error("source: " + source));
	if(destination == undefined) destination = UTIL.getDirectoryFromPath(source) + UTIL.getFileNameWithoutExtension(source) + "/";
	
	var localSource = user.translatePath(source);
	if(localSource instanceof Error) return callback(localSource);
	
	var localDestination = user.translatePath(destination);
	if(localDestination instanceof Error) return callback(localDestination);
	localDestination = UTIL.trailingSlash(localDestination);
	
	var runningDirectory = UTIL.getDirectoryFromPath(localSource);
	
	var fileType = UTIL.getFileExtension(localSource);
	
	if(supportedFileTypes.indexOf(fileType) == -1) callback( new Error("File type (" + fileType + ") not supported! Try " + JSON.stringify(supportedFileTypes)) );
	
	if(fileType == "zip") {
var exe = "/usr/bin/unzip";
		//var exe = "/bin/echo";
		var args = [localSource, "-d", localDestination];
	}
	else if(fileType == "rar") {
		var exe = "/usr/bin/unrar";
		var args = ["e", localSource, localDestination];
	}
	else if(fileType == "gz") {
		// A gz file is only one file! The .gz part will be removed, and the unpacked file will replace the packed file.
		var exe = "/bin/gunzip";
		//var exe = "gunzip";
		var args = [localSource];
		destination = source.slice(0, -3);
	}
	else if(fileType == "tar.gz" || fileType == "tgz") {
		// It's a tarball that has been gzip'ed
		var exe = "/bin/tar";
		var args = ["zxvf", localSource, "-C " + localDestination];
	}
	else throw new Error("Unknown fileType=" + fileType);

	var execFile = require('child_process').execFile;
	var execFileOptions = {cwd: runningDirectory, env: {HOME: "/", PATH:"/bin/:/usr/bin/"}};
	
	console.log("user.homeDir=" + user.homeDir);
	
	execFile(exe, args, execFileOptions, function (err, stdout, stderr) {
		
		console.log(exe + " args=" + JSON.stringify(args) + " stderr=" + stderr + " stdout=" + stdout + " ");
		
		if(err) return callback(err);
		else if(stderr) return callback(stderr);
		else {
			
			if(exe == "/bin/gunzip" && json.destination) {
				// Move the file after gunzip'ing
				API.move(user, {oldPath: destination, newPath: json.destination}, function fileMoved(err, movedto) {
					if(err) return callback(new Error("gunzip succeeded, but move failed: " + err.message));
					else callback(null, {source: source, destination: movedto.path});
				});
			}
			else return callback(null, {source: source, destination: destination});
			
		}
	});
}

API.hash = function hash(user, json, callback) {
	// Useful for example comparing files, so that files don't need to be uploaded to the client for comparison.
	
	var crypto = require('crypto');
	var hash = crypto.createHash('sha256');
	
	if(!json.path && json.text) {
		// Hash the text (not the file)
		hash.update(json.text);
		callback(null, hash.digest('hex'));
		callback = null;
		return;
}
	
	var path = user.translatePath(json.path);
	if(path instanceof Error) return callback(path);
	
	// Check path for protocol
	var url = require("url");
	var parse = url.parse(path);
	
	var input; // Read stream
	
	if(parse.protocol == "ftp:" || parse.protocol == "ftps:") {
		if(user.remoteConnections.hasOwnProperty(parse.hostname)) {
			var c = user.remoteConnections[parse.hostname].client;
			console.log("Getting file hash from FTP server: " + parse.pathname);
			c.get(parse.pathname, function getFtpFileStream(err, fileReadStream) {
				if(err) throw err;
				input = fileReadStream;
				input.on("readable", readStream);
				input.on('error', streamError);
});
}
else {
			callback(new Error("No connection open to FTP on " + parse.hostname + " !"));
		}
	}
else if(parse.protocol == "sftp:") {
		if(user.remoteConnections.hasOwnProperty(parse.hostname)) {
			var c = user.remoteConnections[parse.hostname].client;
			console.log("Getting file hash from SFTP server: " + parse.pathname);
			
			input = c.createReadStream(parse.pathname);
			input.on("readable", readStream);
			input.on('error', streamError);
			
		}
		else {
			callback(new Error("No connection open to SFTP on " + parse.hostname + " !"));
		}
	}
	else {
		// Asume local file system
		var fs = require('fs');
		
		input = fs.createReadStream(path);
		input.on('readable', readStream);
		input.on('error', streamError);
	}
	
	function readStream() {
		//console.log("Stream readable! path=" + path);
		var data = input.read();
		//console.log("Stream data: " + data);
		if (data)
			hash.update(data);
		else {
			if(callback) {
				callback(null, hash.digest('hex'));
				callback = null;
			}
		}
	}
	
	function streamError(err){ 
		//console.log("Stream error! path=" + path);
		var error = new Error("Unable to hash file: " + path + "\n " + err.message);
		error.code = err.code;
		callback(error);
		callback = null;
	}
}

API.httpGet = function httpGet(user, options, callback) {
	var url = options.url;
	
	if(url == undefined) return callback(new Error("URL is needed!"));
	
	var loc = UTIL.getLocation(url);
	
	if(loc.protocol == "http") {
		var reqModule = require("http");
	}
	else if(loc.protocol == "https") {
		var reqModule = require("https");
	}
	else {
		return callback(new Error("Unsupported protocol: " + loc.protocol + " in url=" + url));
	}
	
	var req = reqModule.request(url, gotResp);
	var gotError = null;
	
	req.on("error", function(err) {
		callback(err);
		gotError = true;
	});
	
	req.end();
	
	function gotResp(resp) {
		//resp.setEncoding('utf8');
		
		var data = [];
		
		resp.on('data', respData);
		resp.on('end', respEnd);
		
		function respData(chunk) {
			data.push(chunk);
		}
		
		function respEnd() {
			if(gotError) return;
			
			
			var buffer = Buffer.concat(data);
			var body = buffer.toString('utf8');
			
			// Detect encoding
			console.log("Headers: " + JSON.stringify(resp.headers));
			
			if(resp.headers.hasOwnProperty("content-type")) {
				// Ex: Content-Type: text/html; charset=utf-8
				var matchCharset = resp.headers["content-type"].match(/charset=([^;]*)/i);
				if(matchCharset) {
					var charset = matchCharset[1].trim().toLowerCase();
				}
			}
			
			if(!charset) {
				var matchCharset = body.match(/charset\s*=\s*["']([^'"]*)["']/i); // ex:  <meta charset="UTF-8">
				if(matchCharset) {
					var charset = matchCharset[1].trim().toLowerCase();
				}
			}
			
			if(!charset) {
				var matchCharset = body.match(/charset=([^;'"]*)/i); // ex:  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
				if(matchCharset) {
					var charset = matchCharset[1].trim().toLowerCase();
				}
			}
			
			if(charset && !(charset == "utf-8" || charset == "utf8")) {
				console.log("Detected charset=" + charset);
				
				console.log("iconv.encodingExists('" + charset + "')=" + iconv.encodingExists(charset));
				
				if(!iconv.encodingExists(charset)) {
					gotError = true;
					return callback(new Error("Unable to decode charset=" + charset));
				}
				else {
					body = iconv.decode(buffer, charset);
				}
			}
			callback(null, body);
		}
	}
}

API.readLines = function readLines(user, json, callback) {
	
	console.log("readLines: json=" + JSON.stringify(json)); 
	
	var path = user.translatePath(json.path);
	if(path instanceof Error) return callback(path);
	
	var url = require("url");
	var parse = url.parse(path);
	
	var encoding = json.encoding || "utf8";
	var lineBreak = json.lineBreak || "\n";
	var startLine = json.start || 1;
	var MAX_LINES = json.max || 10000;
	var endLine = json.end || MAX_LINES;
	var lines = [];
	var stream;
	var text = "";
	var totalLines = 1; // The first line is line 1 (even if the file contains no line breaks)
	var flush = false;
	
	if(!callback) {
		throw new Error("No callback defined!");
	}
	
	if(startLine < 1) return callback("start line can not be below line 1 (line 1 is the first line)");
	if(startLine > endLine) return callback("start line can not be above end line!");
	
	// todo: Support ftp/ftps and ftps !!?
	
	if(parse.protocol == "ftp:" || parse.protocol == "ftps:") {
		
		return callback(new Error("readLines on ftp or ftps not yet supported!"));
		
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
			
		return callback(new Error("readLines on sftp not yet supported!"));
		
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
			
			// Assume local file system
			var fs = require("fs");
			if(path.indexOf("file://") == 0) path = path.substr(7); // Remove file://
			
			stream = fs.createReadStream(path);
			stream.on('readable', readStream);
			stream.on("end", streamEnded);
			stream.on("error", streamError);
			stream.on("close", streamClose);
			
		}
		
		
		// Functions to handle NodeJS ReadableStream's
		function streamClose() {
			console.log("Stream closed! path=" + path);
		}
		
		function streamError(err) {
			console.log("Stream error! path=" + path);
			if(callback) callback(err);
			callback = null;
		}
		
		function streamEnded() {
			console.log("Stream ended! path=" + path + "flush=" + flush + " lines.length=" + lines.length + " totalLines=" + totalLines + " startLine=" + startLine + " endLine=" + endLine);
			
			if(callback) callback(null, {path: path, lines: lines, end: Math.min(endLine, totalLines), totalLines: totalLines});
			callback = null;
		}
		
		function readStream() {
			// Called each time there is something comming down the stream
			
			var chunk;
			var StringDecoder = require('string_decoder').StringDecoder;
			var decoder = new StringDecoder('utf8');
		var tempLines = [];
		
			//var chunkSize = 512; // How many bytes to recive in each chunk
			
			console.log("Reading stream ... isPaused=" + stream.isPaused());
			
			while (null !== (chunk = stream.read()) && !stream.isPaused() ) {
				
				// chunk is Not a string! And it can cut utf8 characters in the middle, so use decoder
				
			text += decoder.write(chunk);
				
			// Todo: Handle different line break convenctions. For now asume Line-feeds (unix/Linux)
			
			tempLines = text.split(lineBreak);
			
			if(tempLines.length > 1) { // It contains at least one line break
				totalLines += tempLines.length-1;
				
				if(lines.length == 0 && startLine > 0 && totalLines > startLine) {
					console.log("First: tempLines.length=" + tempLines.length + " ");
					lines = tempLines.splice(startLine - totalLines + tempLines.length-1, (endLine-startLine) + 1);
					console.log("First: lines.length=" + lines.length);
				}
				else if(!flush && totalLines >= startLine) {
					console.log("Middle: lines.length=" + lines.length);
					lines = lines.concat(tempLines.splice(0, tempLines.length-1)); // Add lines up to the last line break
				}
				text = text.substr(text.lastIndexOf(lineBreak) + lineBreak.length); // text now contains the text after the last line break
				
				console.log("flush=" + flush + " tempLines.length=" + tempLines.length + " lines.length=" + lines.length + " totalLines=" + totalLines + " startLine=" + startLine + " endLine=" + endLine);
				
			}
			
			if(!flush && totalLines >= endLine) {
				
				console.log("All lines found! lines.length=" + lines.length + " totalLines=" + totalLines + " startLine=" + startLine + " endLine=" + endLine + "  ");
				
				if(lines.length > (endLine-startLine+1)) lines.splice((endLine-startLine), lines.length);
				
				// Continue, so that we know how many lines the file has
				flush = true;
			}
			
			}
		}
	}

API.writeLines = function writeLines(user, json, writeLinesCallback) {
	/*
		
		start: Start line
		end: End line
		content: The content to write
		overwrite: If the current text between start and end line should be overwritten with the new content
		If overwrite is set to false or undefined the content will be added at the start line
		
	*/
	
	var start = json.start;
	var end = json.end;
	var content = json.content;
	var overwrite = json.overwrite;
	var path = json.path;
var encoding = "utf8";
	var fs = require("fs");
	var tmpPath = path + ".tmp";
	var lb = UTIL.determineLineBreakCharacters(content);
	
	// Content must end with a line break!
	if(content.slice(content.length-lb.length) != lb) {
		console.warn("content.length=" + content.length + " does not end with a " + UTIL.lbChars(lb) + " line break - it will be added!");
		content += lb;
	}
	
	var contentRows = content.split(lb);
	var chunkSize = json.chunkSize; // Useful when testing
	
	console.log("writeLines: start=" + start + " end=" + end + " overwrite=" + overwrite + " path=" + path + " lb=" + UTIL.lbChars(lb) + " content.length=" + content.length + "  ");
	
	if(!UTIL.isLocalPath(path)) return writeLinesCallback(new Error("writeLines currently only supports local files!"));
	if(overwrite && !end) return writeLinesCallback(new Error("end line need to be specified if overwriting!"));
	
	var StringDecoder = require('string_decoder').StringDecoder;
	var decoder = new StringDecoder(encoding);
	var text = "";
	var doneReading = false;
	var line = 1;
	var isWriting = false;
	var contentWritten = false;
	var tmpClosed = false;
	var originalClosed = false;
	var finished = false;
	var hasStarted = false;
	var fileEndsWithLineBreak = false;
	var readWhenReady = false;

	var readOptions = {};
	if(chunkSize) readOptions.highWaterMark = chunkSize;
	var original = fs.createReadStream(path, readOptions);
	var originalReadable = false;
	original.on('readable', function() {
		// The 'readable' event is emitted when there is data available to be read from the stream
		// note: It will be called many times!
		console.log("Original stream now readable!");
		//if(originalReadable) console.warn("read stream readable called twice!");
		originalReadable = true;
		if(tmpReady && !hasStarted) begin();
		else if(!hasStarted) console.log("Waiting for write stream ready ...");
		else if(readWhenReady) read();
});
	original.on("end", function() {
		// The 'end' event is emitted when there is no more data to be consumed from the stream.
		console.log("Original stream ended!");
		doneReading = true;
		
		if(text.length > 0) {
			console.log("Writing remaining text ...");
			var rows = text.split(lb);
			write(rows, function() {
				console.log("Ending write stream because the last text was just written! doneReading=" + doneReading + " contentWritten=" + contentWritten + " isWriting=" + isWriting);
				tmp.end();
			});
		}
		else if(!contentWritten) {
			// The content has not been written. Most likely because the original file was empty
			write(contentRows, function() {
				contentWritten = true;
				console.log("Ending write after writing the content because there where nothing more to write! doneReading=" + doneReading + " contentWritten=" + contentWritten + " isWriting=" + isWriting);
				tmp.end();
			});
		}
		else {
			console.log("Ending write stream because there's nothing more to write! doneReading=" + doneReading + " contentWritten=" + contentWritten + " isWriting=" + isWriting);
			tmp.end();
		}
	});
	original.on("error", function(err) {
		console.log("Original stream error: " + err.message);
		finished = true;
		writeLinesCallback(new Error("Problem with read stream: " + err.message));
	});
	original.on("close", function() {
		// The 'close' event is emitted when the stream and any of its underlying resources (a file descriptor, for example) have been closed. The event indicates that no more events will be emitted, and no further computation will occur.
		console.log("Original stream closed! doneReading=" + doneReading + " contentWritten=" + contentWritten);
		if(originalClosed) console.warn("read stream close called twice!");
		originalClosed = true;
		if(tmpClosed && !finished) finish();
		else console.log("Waiting for write stream to close");
	});
	
	var writeOptions = {};
	if(chunkSize) writeOptions.highWaterMark = chunkSize;
	var tmp = fs.createWriteStream(tmpPath, writeOptions);
	var tmpReady = false;
	tmp.on('ready', function() {
		// Emitted when the fs.WriteStream is ready to be used.
		console.log("write stream ready!");
		if(tmpReady) console.warn("write stream ready called twice!");
		tmpReady = true;
		if(originalReadable && !hasStarted) begin();
		else if(!hasStarted) console.log("Waiting for read stream readable ...");
	});
	tmp.on("error", function(rtt) {
		console.log("tmp stream error: " + err.message);
		finished = true;
		writeLinesCallback(new Error("Problem with write stream: " + err.message));
	});
	tmp.on("close", function() {
		// Emitted when the WriteStream's underlying file descriptor has been closed.
		console.log("tmp stream closed! doneReading=" + doneReading + " contentWritten=" + contentWritten);
		if(tmpClosed) console.warn("write stream close called twice!");
		tmpClosed = true;
		if(originalClosed && !finished) finish();
		else console.log("Waiting for read stream to close");
	});
	
	function finish() {
		console.log("writeLines: finish!");
		if(finished) throw new Error("finished=" + finished + " tmpClosed=" + tmpClosed + " originalClosed=" + originalClosed + ". Close called twice !?");
		finished = true;
		
		// We should now have a .tmp file containing the original file with the inserted content
		fs.stat(tmpPath, function(err, stats) {
			if(err) return writeLinesCallback(new Error("Unable to stat tmpPath=" + tmpPath + " Error: " + err.message));
			
			if(stats.size == 0) return writeLinesCallback(new Error("tmpPath=" + tmpPath + " stats.size=" + stats.size));
			
			// Remove the original file
			fs.unlink(path, function(err) {
				if(err) return writeLinesCallback(new Error("Failed to remove original file: path=" + path + ""));
				
				// Rename the tmp file to the original
				fs.rename(tmpPath, path, function(err) {
					if(err) return writeLinesCallback(new Error("Failed to rename tmpPath=" + tmpPath + " to path=" + path));
					else writeLinesCallback(null);
				});
				
			});
			
		});
		}
	
function begin() {
		console.log("writeLines: begin!");
		if(hasStarted) throw new Error("begin() called twice!");
		hasStarted = true;
		read();
	}
	
	function read() {
		readWhenReady = false;
		
		var chunk = original.read();
		
		if(chunk == null) {
			console.log("chunk=" + chunk + " doneReading=" + doneReading + " contentWritten=" + contentWritten + " isWriting=" + isWriting);
			// This has a probability to happen *before* the read stream end event!
			
			if(!doneReading) {
//console.warn("chunk=" + chunk + " but doneReading=" + doneReading);
				readWhenReady = true;
				console.log("Waiting for readable ...");
				return;
			}
			
			if(!contentWritten) console.warn("Nothing more to read, but contentWritten=" + contentWritten + " ...");
			
			// There's nothing left to read, so I guess it's OK to end the write stream !?
			console.log("Ending write stream because read stream is done! doneReading=" + doneReading + " contentWritten=" + contentWritten + " isWriting=" + isWriting);
			tmp.end();
			
			return;
		}
		
		// chunk is Not a string! And it can cut utf8 characters in the middle, so use decoder
		text += decoder.write(chunk);
		
		console.log("text=" + UTIL.lbChars(text));
		
		// Don't remove any line breaks here! Doing so might concatenate two rows!
		
		var rows = text.split(lb);
		
		console.log("line=" + line + " doneReading=" + doneReading + " rows.length=" + rows.length + " Read " + chunk.length + " bytes from " + path);
		
		if(text.length == 0) {
			read();
			return;
		}
		else if(text.indexOf(lb) == -1) {
			// Continue reading until we find a line break!
			read();
			return;
		}
		
		if(line >= start && !end) {
			// We have reached the start. It's time to insert the content
			// Then write all row's except the last one
			console.log("line=" + line + " start=" + start + " reached! rows.length=" + rows.length + " text=" + UTIL.lbChars(text));
			text = rows.pop();
			if(text == "" && rows.length>1) text = lb;
			line += rows.length;
			
			if(!contentWritten) {
				console.log("Inserting content ...");
				write(contentRows, function() {
					if(rows.length == 1 && rows[0].length == 0) {
						// Do not write empty row, wait to see if there's more ...
						read();
					}
					else write(rows, read);
				});
				contentWritten = true;
			}
			// Or keep writing if the content has already been inserted
			else write(rows, read); 
		}
		else if( (line + rows.length < start) || (end && line > end) ) {
			// We have not, and will not reach start, or we are past end
			// Write all rows except the last one, then continue reading
			console.log("line=" + line + " + rows.length=" + rows.length + " is before start=" + start + " or end=" + end);
			text = rows.pop();
			if(text == "" && rows.length>1) text = lb;
			line += rows.length;
			write(rows, read);
		}
		else if( overwrite && line >= start && line+rows.length-1 <= end ) {
			// We have reached the start, but have not and will not reach the end
			// We are going to overwrite this part, so it can be discarded. Only count the lines!
			console.log("overwrite=" + overwrite + " line=" + line + " rows.length-1=" + (rows.length-1) + " we will be between start=" + start + " and end=" + end);
			text = rows.pop();
			if(text == "" && rows.length>1) text = lb;
			console.log("text.length=" + text.length + " rows.length=" + rows.length);
			line += rows.length;
			console.log("ignored " + rows.length + " lines. update to line=" + line);
			if(!contentWritten) {
				write(contentRows, read);
				contentWritten = true;
			}
			else read();
		}
		else if( overwrite && line >= start && line+rows.length-1 >= end ) {
			// We have reached the start. And will also reach the end
			// We are going to overwrite until the end, then write the rest
			console.log("overwrite=" + overwrite + " line=" + line + " rows.length=" + rows.length + " have reached start=" + start + " and will also reach end=" + end);
			
			var leftOverIndex = end-line + 1;
			if(leftOverIndex > 0) {
				console.log("leftOverIndex=" + leftOverIndex + " at rows[" + leftOverIndex + "]=" + rows[leftOverIndex]);
				text = rows.splice(leftOverIndex, rows.length-leftOverIndex+1).join(lb);
				console.log("Ignored " + leftOverIndex + " lines");
			}
			else {
				console.log("Ignoring all " + rows.length + " lines: " + JSON.stringify(rows));
				text = ""; // Overwrite all of it
			}
			
			console.log("text.length=" + text.length + "");
			
			line = end +1;
			
			console.log("updated to line=" + line);
			
			if(!contentWritten) {
				write(contentRows, read);
				contentWritten = true;
			}
			else read();
			
		}
		else if(line < start && line + rows.length-1 >= start) {
			// We have not reached the start, but will reach the start now!
			// Only write the part that is less then start
			console.log("line=" + line + " + rows.length-1=" + (rows.length-1) + " will reach start=" + start + " overwrite=" + overwrite + " end=" + end);
			
			var leftOverIndex = start-line;
			
			if(overwrite) {
				// Remve the rows to be overwritten, but not the last one
				var removed = rows.splice( leftOverIndex, Math.min(end-line, rows.length-leftOverIndex) );
				console.log("Removed " + JSON.stringify(removed) + " because overwrite=" + overwrite + " rows=" + JSON.stringify(rows) + " leftOverIndex=" + leftOverIndex + " rows.length=" + rows.length);
			}
			
			if(leftOverIndex < rows.length) {
				console.log("leftOverIndex=" + leftOverIndex + " rows=" + JSON.stringify(rows) + "");
				text = rows.splice(leftOverIndex, rows.length-leftOverIndex+1).join(lb); // Text *not* to be written right now
			}
			else if(leftOverIndex != rows.length) {
text = rows.pop(); // Always remove the last row because we might not yet have all of it!
				if(text == "" && rows.length>1) text = lb;
			}
			else {
				text = "";
				if(rows.length > 1) text = lb; // Remaining text is a line break because when multi rows are written, there are no line break appended to the last one
				console.log("Empty text because leftOverIndex=" + leftOverIndex + " rows.length=" + rows.length + "");
			}
			
			console.log("text.length=" + text.length + " rows.length=" + rows.length + " rows=" + JSON.stringify(rows) + " text=" + UTIL.lbChars(text));
			
			line += rows.length;
			if(rows.length == 0) read();
			else write(rows, function() {
				if(!contentWritten) {
					write(contentRows, read);
					contentWritten = true;
				}
				else read();
			});
		}
		else if(end && line + rows.length > start && line + rows.length < end) {
			// We have already reached start, and will now reach end
			// Ignore everything up intil end
			// Then write all rows except the last one
			console.log("line=" + line + " + rows.length=" + rows.length + " already reached start=" + start + " and end=" + end + " will now be reached");
			
			var untilIndex = end-line+1;
			rows = rows.splice(untilIndex, rows.length-untilIndex+1);
			text = rows.pop();
			if(text == "" && rows.length>1) text = lb;
			line += rows.length;
			write(rows, read);
		}
		else throw new Error("Not anticipated: line=" + line + " rows.length=" + rows.length + " start=" + start + " end=" + end + " doneReading=" + doneReading + " isWriting=" + isWriting + " contentWritten=" + contentWritten);
	}
	
	
	function write(rows, callback) {
		var row = 0;
		
		console.log("Writing rows.length=" + rows.length + " ...");
		console.log(JSON.stringify(rows));

		if(rows.length == 0) {
			console.warn("Zero rows!");
			callback();
			return;
		}
		
		var onlyOneRow = (rows.length == 1);
		
		writeRow();
		
		function writeRow() {
			isWriting = true;
			var ok = true;
			do {
				if (row == rows.length-1) {
					// last write and last row
					// Only write a line break if it was a single row
					tmp.write(rows[row] + (onlyOneRow ? lb : ""), encoding, function() {
						isWriting = false;
						callback();
					});
					}
				else {
					// see if we should continue, or wait
					// don't pass the callback, because we're not done yet.
					ok = tmp.write(rows[row] + lb, encoding);
				}
				row++;
			} while (row < rows.length && ok);
				
			
			if (row < rows.length) {
				// had to stop early!
				// write some more once it drains
				console.log("Waiting for drain ...");
				tmp.once('drain', writeRow);
			}
		}
	}
	
	
}




API.readFromDisk = function readFromDisk(user, json, callback) {
	
	var path = user.translatePath(json.path);
	if(path instanceof Error) return callback(path);
	
	var returnBuffer = json.returnBuffer;
	var encoding = json.encoding;
	
	var fileContent = "";
	var stream;
	var fileBuffer = [];
	
	if(!callback) {
		throw new Error("No callback defined!");
	}
	
	var fs = require("fs");
	var crypto = require('crypto');
	
	var shasum = crypto.createHash('sha256');
	
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
					if(returnBuffer) fileBuffer.push(data);
					else {
str = decoder.write(data);
						shasum.update(data);
						fileContent += str;
					}
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
					
				shasum.update(buffer);
				
					var resp = {path: path};
					
				resp.hash = shasum.digest('hex');
				
					if(returnBuffer) {
						resp.data = buffer;
						}
					else {
						resp.data = buffer.toString("utf8");
						}
					
					callback(err, resp);
					
					
				});
				
			}
			else {
				user.send({msg: "No connection open to SFTP on " + parse.hostname + " !"});
			}
		}
		
		else {
		
			// Asume local file system
			
			if(path.indexOf("file://") == 0) path = path.substr(7); // Remove file://
			
		// If no encoding is specified in fs.readFile, then the raw buffer is returned.
				
				fs.readFile(path, function(err, buffer) {
			if(err) return callback(err);
			else {
			//shasum.update(buffer.toString(encoding));
			shasum.update(buffer); // Doesn't seem to matter if you pass it buffer or utf8 string!
				
				if(encoding == undefined) encoding = "utf8";
			
			callback(err, {
				path: user.toVirtualPath(path), 
				data: returnBuffer ? buffer : buffer.toString(encoding), 
				hash: shasum.digest('hex')
			});
			}
				});
			
		/*
			if(encoding == undefined) encoding = "utf8";
				fs.readFile(path, encoding, function(err, string) {
					if(err) console.warn(err.message);
					callback(err, {path: user.toVirtualPath(path), data: string});
					});
		*/
		
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
			
		var resp = {path: path};

		resp.hash = shasum.digest('hex');
		
		if(returnBuffer) {
			resp.data = fileBuffer;
}
		else {
			resp.data = fileContent;
		}
		
		callback(null, resp);
			
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
				
			shasum.update(chunk);
			
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
	
	// Use buffers and Not text, or images will not work!
	API.readFromDisk(user, {path: source, returnBuffer: true}, function fileRead(err, read) {

		if(err) return callback(err);
		
		API.saveToDisk(user, {path: target, text: read.data, inputBuffer: true, public: json.public}, function fileWrite(err, write) {
			
			if(err) return callback(err);
			else callback(null, {to: write.path});
			
		});
		
	});
	
	/*
		var options = {
		mode:  DEFAULT_FILE_MODE
		};
		
		if(json.public) {
		// Make it so everyone can read it
		options.mode = parseInt("0777", 8);
		// note: The file permissions wont change if the file already exists!
		}
		
	var cbCalled = false;
	
	var fs = require("fs");
	
	var rd = fs.createReadStream(source);
	rd.on("error", function(err) {
		done(err);
	});
	
	var wr = fs.createWriteStream(target, options);
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
	*/
	
}

API.move = function move(user, json, callback) {
	/*
		
		Use EDITOR.move ! (don't call this directly)
		
		todo: Make it work with remote connections!
		
	*/
	
	var oldPath = json.oldPath;
	var newPath = json.newPath;
	
	if(oldPath == undefined) return callback(new Error("oldPath=" + oldPath + " can not be null or undefined!"));
	if(newPath == undefined) return callback(new Error("newPath=" + newPath + " can not be null or undefined!"));
	
	// First make a copy of the file, and then delete it !?
	
	var fs = require("fs");
	fs.rename(oldPath, newPath, function(err) {
		
		if(err) {
			if(err.code == "EISDIR") {
err = new Error("Make sure " + newPath + " is not already a directory! " + err.message);
				err.code = "EISDIR";
			}
			else if(err.code == "EXDEV") {
				console.log(err.message + " ... Trying copy ...");
				/*
					Most likely a gcsf error: EXDEV: cross-device link not permitted, rename '/googleDrive/hello.js' -> '/wwwpub/hello.js'
				*/ 
				return API.copyFile(user, {from: oldPath, to: newPath}, function afterCopy(err, copy) {
					if(err) {
						var error = new Error("Failed to move (EXDEV), and also failed to copy (" + err.code + "): " + err.message);
						error.code = err.code;
						return callback(error);
					}
					else callback(null, {oldPath: oldPath, newPath: copy.to});
				});
			}
		}
		
		callback(err, {oldPath: oldPath, newPath: newPath});
		
		// EDITOR.move fires move event
		
	});
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

	if(json.path == undefined) return saveToDiskCallback(new Error("json.path=" + json.path));
	
	var path = user.translatePath(json.path);
	if(path instanceof Error) return saveToDiskCallback(path);
	
	var inputBuffer = json.inputBuffer;
	var encoding = json.encoding;
	var text = json.text;
	
	var crypto = require('crypto');
	var shaSum = crypto.createHash('sha256');
	shaSum.update(text);
	var hash = shaSum.digest('hex')
	
if(encoding == undefined) encoding = "utf-8";

// Check path for protocol
var url = require("url");
var parse = url.parse(path);
var hostname = parse.hostname;
var protocol = parse.protocol;
var pathname = parse.pathname;

	if(!json.public && pathname && pathname.slice(1,7) == "wwwpub") json.public = true; 
	
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
					saveToDiskCallback(null, {path: path, hash: hash});
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
		
		var options = {
			encoding: encoding,
			mode: DEFAULT_FILE_MODE
		}
		
		if(json.public) {
			// Make it so everyone can read it
			options.mode = parseInt("0777", 8); // 1 = execute, 2 = write, 4 = read
			
			// note: The file permissions wont change if the file already exists!
		}
		
		console.log("saveToDisk: path=" + path + " options=" + JSON.stringify(options) + " json.public=" + json.public);
		
		fs.writeFile(path, text, options, function(err) {
			//console.log("Attempting saving to local file system: " + path + " ...");
			
			if(err) {
				console.warn("Unable to save " + path + "!");
				
				if(err.code == "EISDIR") saveToDiskCallback(new Error("Make sure " + path + " is not a directory! " + err.message));
				else saveToDiskCallback(err);
			}
			else {
				//console.log("The file was successfully saved: " + path + "");
				saveToDiskCallback(null, {path: user.toVirtualPath(path), hash: hash});
			}
		});
	}
	
	
	function uploadFTP(pathname, text) {
		console.log("Uploading to FTP ... pathname=" + pathname + " inputBuffer=" + inputBuffer);
		
		if(user.remoteConnections.hasOwnProperty(hostname)) {
			
			var ftpClient = user.remoteConnections[hostname].client;
			
			// ftp put wants a buffer. Convert to buffer if it's not a buffer!
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
				
				saveToDiskCallback(null, {path: path, hash: hash});
				
				runFtpQueue();
			}
			
		}
		
	}
}



API.listFiles = function listFiles(user, json, listFilesCallback) {
	if(listFilesCallback == undefined) throw new Error("Need to specify a callback!");

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
	
	console.log("listFiles: protocol=" + protocol + " pathToFolder=" + pathToFolder);
	
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
					listFilesCallback = null;
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
						list.push({
						type: type, 
						name: folderItems[i].filename, 
						path: path, 
						size: parseFloat(folderItems[i].attrs.size), 
						date: new Date(folderItems[i].attrs.mtime*1000)
						});
					}
					
					listFilesCallback(null, list);
					listFilesCallback = null;
					
				}
				
			});
			
			//console.log("b=" + b);
			
		}
		else {
			listFilesCallback(new Error("Unable to read " + pathname + " on " + hostname + "\nNot connected to SFTP on " + hostname + " !"));
			listFilesCallback = null;
		}
	}
	else {
		// ### List files using "normal" file system
		var fs = require("fs");
		//console.log("Reading directory=" + pathToFolder);
		fs.readdir(pathToFolder, function readdir(err, folderItems) {
			if(err) {
				listFilesCallback(err);
				listFilesCallback = null;
			}
			else {
				var filePath;
				var list = [];
				var statCounter = 0;
				if(folderItems.length == 0) {
					// It's an emty folder
					listFilesCallback(null, list);
					listFilesCallback = null;
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
							ENOENT = no such file or directory
							ENOTCONN = socket is not connected, stat '/googleDrive'
						*/
						
						if(err.code == "EPERM" || err.code == "EBUSY" || err.code == "ENOENT" || err.code == "ENOTCONN" || err.code == "EACCES") {
							problem = err.code;
							type = "*"
						}
						else {
listFilesCallback(err);
							listFilesCallback = null;
							return;
						}
					}
					
					//console.log("stat: " + stats);
					
					var systemFolders = [
						"/dev/", 
						"/usr/", 
						"/lib/", 
						"/lib64/", 
						"/bin/", 
						"/etc/", 
						"/proc/", 
						"/run/", 
						//"/sock/", 
						"/.jzeditStorage/", 
						"/.config/", 
						"/.npm/", 
						"/.ssh/",
						"/.bash_history",
						"/.jzeditpw",
						"/.node_repl_history",
						"/.npm-packages/"
					]; // Ignore mounted files and folders
					if(!user.chrooted || systemFolders.indexOf(filePath) == -1) {
						list.push({type: type, name: fileName, path: user.toVirtualPath(filePath), size: size, date: mtime, problem: problem});
					}
					
					statCounter++;
					
					//console.log("Finished stat: " + filePath + " statCounter=" + statCounter + " folderItems.length=" + folderItems.length);
					
					if(statCounter==folderItems.length) {
listFilesCallback(null, list);
						listFilesCallback = null;
					}
					
				});
			}
			
			
		});
		
		
	}
	
	
	function listFilesFTP(pathname) {
		
		if(user.remoteConnections.hasOwnProperty(hostname)) {
			
			var ftpClient = user.remoteConnections[hostname].client;
			
			ftpListFiles(ftpClient);
			
		}
		else {
			listFilesCallback(new Error("Unable to read " + pathname + " on " + hostname + "\nNot connected to FTP on " + hostname + " !"));
			runFtpQueue();
		}
		
		function ftpListFiles(ftpClient) {
			
			console.log("Listing files in '" + parse.pathname + "' on " + parse.protocol + parse.hostname);
			
			ftpClient.list(parse.pathname, function readdirFtp(err, folderItems) {
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
					
					listFilesCallback(null, list);
					
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
	
	var lastCharOfPath = json.pathToCreate.substr(json.pathToCreate.length-1);
	
	if(lastCharOfPath != "/" && lastCharOfPath != "\\") return createPathCallback("Last character is not a file path delimiter: " + json.pathToCreate);
	
	var pathToCreate = user.translatePath(json.pathToCreate);
	if(pathToCreate instanceof Error) return createPathCallback(pathToCreate);
	
	console.log("json.pathToCreate=" + json.pathToCreate + " pathToCreate=" + pathToCreate);
	
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
	
	console.log("create=" + JSON.stringify(create) + " hostname=" + hostname + " pathToCreate=" + pathToCreate + " parse=" + JSON.stringify(parse));
	
	create.shift(); // Don't bother with the root
	
	// Execute mkdir in order !
	if(create.length == 0) {
		console.warn("No path to create! fullPath=" + fullPath);
		createPathCallback(null, {path: fullPath});
	}
	else executeMkdir(create.shift());
	
	function executeMkdir(folder) {
		// This is a recursive function!
		createPathSomewhere(folder, json.public, function(err, path) {
			if(err) {
errors.push(err.message + " path=" + path);
				//console.warn("Failed to create path=" + path + "\n" + err.message);
			}
			else {
				//console.log("Successfully created path=" + path);
			}
			
			if(create.length > 0) executeMkdir(create.shift());
			else done();
			
			});
	}
	
	function done() {
		// Check if the full path exists
		
		pathToCreate = user.toVirtualPath(pathToCreate); // API.listFiles wants a virtual path!
		
		API.listFiles(user, {pathToFolder: pathToCreate}, listFileResult);
		
		function listFileResult(err, files) {
			
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
	
	function createPathSomewhere(path, publicFolder, createPathSomewhereCallback) {
		
		// ## mkdir ...
		
		console.log("Creating path=" + path);
		
		if(path.indexOf("//") > 6) {
			path = path.replace(/\/\/+/g, "/"); // Remove double slashes
			
			if(protocol) {
				// Re-add the slash after the protocol
				path = path.replace(protocol + ":/", protocol + "://");
			}
			
			console.warn("Sanitized path=" + path + " pathToCreate=" + pathToCreate);
		}
		
		if(protocol) {
			// We only want the path!
			path = url.parse(path).pathname;
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
			
			
			var folderMode = DEFAULT_FOLDER_MODE;
			
			if(publicFolder) {
				// Make it so everyone can read it
				folderMode = parseInt("0777", 8);
				
				// note: The file permissions wont change if the file already exists!
				}
			
			
			fs.mkdir(path, folderMode, function(err) {
				
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
	
	if(protocol == undefined) return callback("No protocol defined! protocol=" + protocol);
	if(serverAddress == undefined) return callback("No serverAddress defined! serverAddress=" + serverAddress);
	if(username == undefined) return callback("No user defined! username=" + username);
	if(workingDir !== undefined) return callback("workingDir parameter not yet implemented! workingDir=" + workingDir);
	
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
		
		var Client = FTP;
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
			else user.send(err.message + " (serverAddress=" + serverAddress + ")");
			callback = null;
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
			var Client = SSH2.Client;
			
			var c = new Client();
			c.on('ready', function() {
				console.log('Client :: ready');
				
				c.exec('pwd', function(err, stream) {
					if (err) throw err;
					var dir = "";
					stream.on('close', function(code, signal) {
						//console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
						
						console.log("SFTP pwd result: dir=" + dir);
						
						// Problem: "This service allows sftp connections only"
						var workingDir = UTIL.trailingSlash(protocol + "://" + serverAddress);
						if(dir.charAt(0) == "/") {
						
						// Chop off the newline character
						dir = dir.substring(0, dir.length-1);
						
							var workingDir = workingDir + dir.replace("\\", "/");
						}
						
						cb(null, c, workingDir);
						
						//c.end();
					}).on('data', function(data) {
						console.log('SFTP pwd stdout: ' + data);
						dir += data;
					}).stderr.on('data', function(data) {
						cb(new Error("Error executing pwd on SSH:" +  serverAddress + "\n" + data));
						//user.send("Error executing pwd on SSH:" +  serverAddress + "\n" + data);
						console.warn('SFTP pwd stderr: ' + data);
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
			
			/*
			for (var m in c) {
				console.log(m + ": " + typeof c[m]);
			}
			*/
			
			c.unlink(parse.pathname, function sftpFileDeleted(err) {
				
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


API.deleteDirectory = function deleteDirectory(user, json, callback) {
	
	var directory = user.translatePath(json.directory);
	if(directory instanceof Error) return callback(directory);
	
	var recursive = json.recursive || false;
	
	// Check path for protocol
	var url = require("url");
	var parse = url.parse(directory);
	
	if(parse.protocol == "ftp:" || parse.protocol == "ftps:") {
		
		if(user.remoteConnections.hasOwnProperty(parse.hostname)) {
			
			var c = user.remoteConnections[parse.hostname].client;
			
			console.log("Deleting directory from FTP server: " + parse.protocol + parse.hostname + parse.pathname);
			
			c.rmdir(parse.pathname, recursive, function ftpDirDeleted(err) {
				if(err) {
					console.warn(err.message);
					callback(err);
				}
				else {
					callback(null, {directory: json.directory});
				}
			});
		}
		else {
			// Should we give an ENOENT here ?
			callback(new Error("Failed to delete directory: " + directory + "\nNo connection open to FTP on " + parse.hostname + " !"));
		}
	}
	else if(parse.protocol == "sftp:") {
		
		if(user.remoteConnections.hasOwnProperty(parse.hostname)) {
			
			var c = user.remoteConnections[parse.hostname].client;
			
			console.log("Deleting directory from SFTP server: " + parse.pathname);
			
			if(recursive) {
				recursiveDeleteSftpDir(c, parse.pathname, function dirDeletedRecursive(err) {
					if(err) callback(err);
					else callback(null, {directory: json.directory});
				});
			}
			else {
				
			c.rmdir(parse.pathname, function sftpDirDeleted(err) {
				
				if(err) callback(err);
				else callback(null, {directory: json.directory});
				
			});
			}
			
		}
		else {
			callback(new Error("Failed to delete directory: " + directory + "\nNo connection open to SFTP on " + parse.hostname + " !"));
		}
	}
	else {
		
		// It's a normal file path
		
		var fs = require("fs");
		
		if(recursive) {
			recursiveDeleteLocalDir(directory, function dirDeletedRecursive(err) {
				if(err) callback(err);
				else callback(null, {directory: json.directory});
			});
		}
		else {
		fs.rmdir(directory, function localFileDeleted(err) {
			if(err) callback(err);
			else callback(null, {directory: json.directory});
		});
		}
	}
	
	function recursiveDeleteSftpDir(sftpClient, pathToFolder, recursiveDeleteSftpDirCallback) {
		
			if(pathToFolder.substr(pathToFolder.length-1) != "/" && pathToFolder.substr(pathToFolder.length-1) != "\\") {
			return recursiveDeleteSftpDirCallback("pathToFolder=" + pathToFolder + " does not end with a trailing slash!");
			}
			
			var gotError = false;
		var filesToBeDeleted = 0;
		var foldersToBeDeleted = 0;
		
			console.log("SFTP recursive delete: pathToFolder=" + pathToFolder);
			var b = sftpClient.readdir(pathToFolder, function sftpReadDir(err, folderItems) {
				
				if(gotError) return; // If we have already got an error while deleting the content of this directory
				
				if(!err) {
				//console.log(JSON.stringify(folderItems, null, 2));
					for(var i=0, path = "", type = ""; i<folderItems.length; i++) {
					path = pathToFolder + folderItems[i].filename; // Asume pathToFolder has a trailing slash
					type = folderItems[i].longname.substr(0, 1);
					check(type, path);
					}
					}
				
				allFilesAndFoldersDeletedMaybe(err);
			
		});
		
		function check(type, path) {
			if(type == "d") {
				foldersToBeDeleted++;
				path = UTIL.trailingSlash(path);
				recursiveDeleteDir(path, function (err) {
					foldersToBeDeleted--;
					allFilesAndFoldersDeletedMaybe(err);
				});
			}
			else {
				filesToBeDeleted++;
				sftpClient.unlink(path, function sftpFileDeleted(err) {
					filesToBeDeleted--;
					allFilesAndFoldersDeletedMaybe(err);
				});
			}
		}
		
			function allFilesAndFoldersDeletedMaybe(err) {
				if(gotError) return; // If we have got an error, it means we have already called the callback
				
				if(err) {
					// Got an error when deleting a file or folder in the directory
					gotError = err;
				recursiveDeleteSftpDirCallback(err);
				}
				else {
				// Make sure the directory is emty before deleting it 
				if(filesToBeDeleted === 0 && foldersToBeDeleted === 0) {
					sftpClient.rmdir(pathToFolder, function sftpDirDeleted(err) {
						recursiveDeleteSftpDirCallback(err);
						});
				}
			}
			}
	}
	
	function recursiveDeleteLocalDir(pathToFolder, recursiveDeleteLocalDirCallback) {
		var fs = require("fs");
		
		if(pathToFolder.substr(pathToFolder.length-1) != "/" && pathToFolder.substr(pathToFolder.length-1) != "\\") {
			return recursiveDeleteLocalDirCallback("pathToFolder=" + pathToFolder + " does not end with a trailing slash!");
		}
		
		var gotError = false;
		var filesToBeDeleted = 0;
		var foldersToBeDeleted = 0;
		var pathsToStat = 0;
		
		console.log("Local file-system recursive delete: pathToFolder=" + pathToFolder);
		
		fs.readdir(pathToFolder, function readdir(err, folderItems) {
			
			if(err) allFilesAndFoldersDeletedMaybe(err);
			else {
				for(var i=0, path=""; i<folderItems.length; i++) {
				// We do not know if it's a folder or file yet, folderItems is just an array of strings, we have to wait for stat
					path = pathToFolder + folderItems[i];
					stat(path);
					}
				allFilesAndFoldersDeletedMaybe(null);
			}
			
		});
		
		function stat(path) {
			pathsToStat++;
			fs.stat(path, function (err, stats) {
				pathsToStat--;
				
				if(gotError) return; // If we have already got an error while deleting the content of this directory
				
				if(stats) {
					
					if(stats.isFile()) {
						console.log("It's a file! path=" + path);
						filesToBeDeleted++;
						fs.unlink(path, function localFileDeleted(err) {
							filesToBeDeleted--;
							allFilesAndFoldersDeletedMaybe(err);
						});
					}
					else if(stats.isDirectory()) {
						console.log("It's a folder! path=" + path);
						foldersToBeDeleted++;
						path = UTIL.trailingSlash(path);
						recursiveDeleteLocalDir(path, function (err) {
							foldersToBeDeleted--;
							allFilesAndFoldersDeletedMaybe(err);
						});
					}
				}
				
				allFilesAndFoldersDeletedMaybe(err);
				
			});
		}
		
	
		function allFilesAndFoldersDeletedMaybe(err) {
			
			console.log("allFilesAndFoldersDeletedMaybe? gotError=" + gotError + " err=" + err + " pathsToStat=" + pathsToStat + " filesToBeDeleted=" + filesToBeDeleted + " foldersToBeDeleted=" + foldersToBeDeleted);
			
			if(gotError) return; // If we have got an error, it means we have already called the callback
			
			if(err) {
				// Got an error when deleting a file or folder in the directory
				gotError = err;
				recursiveDeleteLocalDirCallback(err);
			}
			else {
				// Make sure the directory is emty before deleting it
				if(filesToBeDeleted === 0 && foldersToBeDeleted === 0 && pathsToStat === 0) {
					fs.rmdir(pathToFolder, function localFileDeleted(err) {
					recursiveDeleteLocalDirCallback(err);
					});
					}
			}
		}
	}
	
}



API.findReplaceInFiles = function findReplaceInFiles(user, json, findReplaceInFilesCallback) {
	/*
		Finds or replaces inside files
		Can be run on remote file systems (ftp,sftp,ftps)
		
		Streams vs non streams: Streams use less memory but is harder to search with multi-line regexp
		Hopefully each file will not be that big and we'll be able to load each file into memory.
		
		Performance optimization:
		maxFilesToSearchAtTheSameTime = 5; Found 3 match(es) in 2655/10365 file(s) searched in 186s.
		maxFilesToSearchAtTheSameTime = 50; Found 3 match(es) in 2655/10365 file(s) searched in 41.66s.
		
	*/
	
	var searchPath = json.searchPath;
	if(searchPath == undefined) return callback(new Error("searchPath=" + searchPath + " is not defined!"));
	
	var searchString = json.searchString;
	if(searchString == undefined) return callback(new Error("searchString=" + searchString + " is not defined!"));
	
	try {
		var testSearchString = new RegExp(fileFilter);
	}
	catch(err) {
		return callback(new Error("Bad RegExp: searchString=" + searchString + ": " + err.message));
	}
	
	var fileFilter = json.fileFilter;
	if(fileFilter == undefined) return callback(new Error("fileFilter=" + fileFilter + " is not defined!"));
	
	try {
	var fileFilterRegExp = new RegExp(fileFilter);
	}
	catch(err) {
		return callback(new Error("Bad RegExp: fileFilter=" + fileFilter + ": " + err.message));
	}
	
	var searchSubfolders = json.searchSubfolders || false;
	var maxFolderDepth = json.maxFolderDepth || 10;
	var searchMaxFiles = json.searchMaxFiles || 100000;
	var maxTotalMatches = json.maxTotalMatches || 500;
	var caseSensitive = json.caseSensitive || false;
	var searchSessionId = json.id || 0;
	var showSurroundingLines = json.showSurroundingLines || 2;
	var replaceWith = json.replaceWith;
	
	var totalFiles = 0;
	var filesSearched = 0;
	
	var fileQueue = []; // Files to be searched
	var foldersToRead = 0;
	var totalMatches = 0;
	var totalFilesFound = 0;
	var matches = [];
	var flags = "g"; // Always make a global search!
	var filesBeingSearched = 0;
	var abort = false;
	var done = false;
	var searchSymLinks = true;
	var maxFilesToSearchAtTheSameTime = 50; // Hard drivers are really bad at multi tasking
	var totalFoldersSearched = 0;
	var totalFoldersToSearch = 0;
	var progressInterval = 350;
	var lastProgress = new Date();
	var searchBegin = new Date();
	var totalFilesSearched = 0;
	
	if(!caseSensitive) flags += "i";
	
	searchDir(searchPath, 0);
	
	function searchDir(folderPath, folderDepth) {
		
		console.log("Searching: " + folderPath);
		
		if(folderDepth > maxFolderDepth) return console.log("Max folder depth reached! maxFolderDepth=" + maxFolderDepth + " folderDepth=" + folderDepth + " folderPath=" + folderPath);
		
		foldersToRead++;
		folderDepth++;
		totalFoldersToSearch++;
		
		API.listFiles(user, {pathToFolder: folderPath}, function gotFileList(err, fileList) {
			
			if(abort) return console.log("Aborting file search/replace");
			
			if(err) return abortError(err);
			
			/*
				type - string - A single character denoting the entry type: 'd' for directory, '-' for file (or 'l' for symlink on *NIX only).
				name - string - File or folder name
				path - string - Full path to file/folder
				size - float - The size of the entry in bytes.
				date - Date - The last modified date of the entry.
			*/
			for (var i=0; i<fileList.length; i++) {
				if(fileList[i].type == "d" && searchSubfolders) {
searchDir(fileList[i].path, folderDepth);
				}
				else if(fileList[i].type == "-" || (fileList[i].type == "l" && searchSymLinks)) {
					totalFilesFound++;
					if(fileFilterRegExp.test(fileList[i].path)) fileQueue.push(fileList[i].path);
				}
			}
			
			foldersToRead--;
			totalFoldersSearched++;
			
			doWeHaveAllFiles();
			
		});
		
	}
	
	function doWeHaveAllFiles() {
		if(foldersToRead == 0) {
			// All folders have now been searched!
			totalFiles = fileQueue.length;
			if(fileQueue.length == 0) {
				doneFinish("Found " + totalFilesFound + " files. But none of them math the file filter!");
			}
			else {
				continueSearchFiles();
				}
			}
	}
	
	function continueSearchFiles() {
		
		console.log("continueSearchFiles: fileQueue.length=" + fileQueue.length + " filesBeingSearched=" + filesBeingSearched);
		
		if(abort) return console.log("Aborting from continueSearchFiles()");
		if(done) return console.log("Already done! from continueSearchFiles()");
		
		if(totalFiles >= searchMaxFiles) {
			doneFinish("Aborted the search because we reached searchMaxFiles=" + searchMaxFiles + " limit!");
			abort = true;
			return;
		}
		else if(totalMatches >= maxTotalMatches) {
			doneFinish("Aborted the search because we reached maxTotalMatches=" + maxTotalMatches + " limit!");
			abort = true;
			return;
		}
		else while(fileQueue.length > 0 && filesBeingSearched < maxFilesToSearchAtTheSameTime) searchNextFileInQueue();
		
		doneMaybe();
		
	}
	
	function doneMaybe() {
		
		console.log("doneMaybe: fileQueue.length=" + fileQueue.length + " filesBeingSearched=" + filesBeingSearched);
		
		if(abort) return console.log("Aborting from doneMaybe()");
		if(done) throw new Error("We should not be calling doneMaybe() if done!");
		
		sendProgress();
		
		if(fileQueue.length == 0 && filesBeingSearched == 0) doneFinish();
		else {
			//continueSearchFiles(); // RangeError: Maximum call stack size exceeded
			setTimeout(continueSearchFiles, 500); // Give a few milliseconds of rest
	}
	}
	
	function searchNextFileInQueue() {
	
		console.log("searchNextFileInQueue: fileQueue.length=" + fileQueue.length + " filesBeingSearched=" + filesBeingSearched);
		
		if(abort) return console.log("Aborting from searchNextFileInQueue()");
		if(done) throw new Error("We should not be calling searchNextFileInQueue() if !");
		
		var filePath = fileQueue.pop(); // Last in, first out
		
		if(filePath == undefined) {
			if(fileQueue.length == 0) doneFinish();
			else throw new Error("filePath=" + filePath + " fileQueue.length=" + fileQueue.length);
		}
		else searchFile(filePath);
		
	}
	
	function searchFile(filePath) {
		filesBeingSearched++;
		API.readFromDisk(user, {path: filePath}, function readFile(err, json) {
			
			if(err) return abortError(err);
			
			var filePath = json.path;
			var fileContent = json.data;
		
			var myRe = new RegExp(searchString, flags); // Create a new RegExp for each file!
			
			console.log("Searching file: " + filePath);
				
				var result;
				var lastIndex = 0;
			var lastLine = 1;
			var rowsAbove = [];
			var rowsBeneath = [];
			
			while ((result = myRe.exec(fileContent)) !== null) {
					
					totalMatches++;
					
					// Figure out what the line number is
					// Select all text up until the first line break after the search match index
					var firstLineBreakAfterResult = fileContent.indexOf("\n", result.index + result[0].length);
					var textAboveInludingResult = fileContent.slice(  result.lastIndex, firstLineBreakAfterResult  );
					if(textAboveInludingResult.charAt(textAboveInludingResult.length-1) == "\r") textAboveInludingResult = textAboveInludingResult.slice(0, -1);
					var resultRows =  result[0].split(/\r\n|\n/);
					var textAboveInludingResultRows = textAboveInludingResult.split(/\r\n|\n/);
					var lineNr = textAboveInludingResultRows.length - resultRows.length + 1;
					
					lastLine = lineNr;
					
					var lineText = "";
					// Line text can be many lines!
					for (var i=0; i<resultRows.length; i++) {
						lineText = textAboveInludingResultRows.pop() + "\n" + lineText;
					}
					lineText = lineText.trim();
					
					if(matches.indexOf(result[0]) == -1) matches.push(result[0]); // Highlight these later
					
					if(showSurroundingLines) {
						rowsAbove = textAboveInludingResultRows.slice( -showSurroundingLines );
						var index = firstLineBreakAfterResult;
						if(fileContent.charAt(index) == "\r") index++;
						if(fileContent.charAt(index) == "\n") index++;
						rowsBeneath = [];
						for (var i=index; i<fileContent.length; i++) {
							if(fileContent.charAt(i) == "\n") {
								rowsBeneath.push(fileContent.slice(index, i).trim());
								index = i+1;
								if(rowsBeneath.length >= showSurroundingLines) break;
							}
						}
						
					}
					
					//console.log("textAboveInludingResultRows=" + JSON.stringify(textAboveInludingResultRows));
					//console.log("rowsAbove=" + JSON.stringify(rowsAbove));
					
					console.log("Found " + result[0] + " on index=" + result.index + " lastIndex=" + result.lastIndex + " showSurroundingLines=" + showSurroundingLines + " lineNr=" + lineNr + " in file=" + filePath);
					
					var foundInFile = {
						id: searchSessionId,
						text: result[0],
						lineText: lineText,
						index: result.index,
						lineNr: lineNr,
						file: filePath,
						rowsAbove: rowsAbove,
						rowsBeneath: rowsBeneath,
						regExp: myRe.toString()
					};
					
					if(replaceWith) {
					foundInFile.replaceWith = replaceWith;
					// Run replace op on client side, not twice here.
					//foundInFile.replacedWith = result[0].replace(myRe, replaceWith);
				}
				
				user.send({foundInFile: foundInFile});
				
			}
			
			if(replaceWith) {
				
				console.log("Replacing in file: " + filePath);
				
				fileContent = fileContent.replace(myRe, replaceWith);
				
				API.saveToDisk(user, {path: filePath, text: fileContent}, function readFile(err, json) {
					if(err) return abortError(err);
						
					filesBeingSearched--;
					totalFilesSearched++;
					doneMaybe();
					
				});
				
			}
			else {
				filesBeingSearched--;
				totalFilesSearched++;
				doneMaybe();
			}
			
			
		});
	}
	
	function doneFinish(msg) {
		if(abort) throw new Error("Called done while aborting!");
		if(done) throw new Error("Already done!");
		
		done = true;
		
		if(msg == undefined) {
			var totalTime = Math.round(((new Date()) - searchBegin) / 10) / 100;
			msg = "Found " + totalMatches + " match(es) in " + totalFiles + "/" + totalFilesFound + " file(s) searched in " + totalTime + "s.\n";
			}
		
		findReplaceInFilesCallback(null, {msg: msg, matches: matches});
		
	}
	
	function abortError(err) {
		if(!abort) findReplaceInFilesCallback(err);
		abort = true;
	}
	
	function sendProgress() {
		var now = new Date();
		if(now - lastProgress > progressInterval) {
			user.send({
				findInFilesStatus: {
					totalFoldersToSearch: totalFoldersToSearch,
					totalFoldersSearched: totalFoldersSearched,
					foldersBeingSearched: foldersToRead,
					fileQueue: fileQueue.length,
					totalFiles: totalFiles,
					totalFilesSearched: totalFilesSearched,
					filesBeingSearched: filesBeingSearched,
					totalMatches: totalMatches,
					maxTotalMatches: maxTotalMatches,
					searchString: searchString,
					folder: searchPath
				}
			});
			lastProgress = now;
		}
	}
	
}

API.findFiles = function findFiles(user, json, findFilesCallback) {
	/*
		Finds all files recursively in a folder.
		Keep searching, in parent folder, until maxResults have been found!
		Notify the client when switching folder
		*/
	
	if(FIND_FILES_ABORTED && FIND_FILES_IN_FLIGHT > 0) return finish(null, {buzy: true});
	
	FIND_FILES_ABORTED = false;
	
	var startFolder = json.folder;
	var findFile = json.name;
	var useRegexp = json.useRegexp || false;
	var ignore = json.ignore || [];
	
		if(startFolder == undefined) return finish(new Error("startFolder=" + startFolder));
		if(findFile == undefined) return finish(new Error("findFile=" + findFile));
		
		if(!useRegexp) findFile = UTIL.escapeRegExp(findFile);
		
		var reName = new RegExp(findFile, "ig");
		
		var maxResults = json.maxResults || 20;
		var maxConcurrency = 200;
		var filesFound = 0;
		var foldersToSearch = [];
		var searchQueue = [];
		var lastProgress = new Date();
		var progressInterval = 350; // Prevent spamming the client when searching thousands of folders
		startFolder = UTIL.trailingSlash(startFolder);
		
		var folders = UTIL.getFolders(startFolder, true);
		var totalFoldersToSearch = 0;
		var totalFoldersSearched = 0;
		var callbackCalled = false;
	var foldersIgnored = 0;
	var filesIgnored = 0;
		var currentFolder = folders.pop();
		
		searchFolder(currentFolder);
		
		function searchFolder(folder) {
			if(folder == undefined) throw new Error("folder=" + folder);
			//console.log("FIND_FILES_IN_FLIGHT=" + FIND_FILES_IN_FLIGHT + " searchQueue.length=" + searchQueue.length + " folder=" + folder);
			if(FIND_FILES_ABORTED) return finish(null);
			if(foldersToSearch.indexOf(folder) != -1) return; // Folder already searched
			totalFoldersToSearch++;
			if(FIND_FILES_IN_FLIGHT >= maxConcurrency) {
				if(searchQueue.indexOf(folder) == -1) searchQueue.push(folder);
				sendProgress();
				return;
			}
			foldersToSearch.push(folder);
			FIND_FILES_IN_FLIGHT++;
			sendProgress();
		API.listFiles(user, {pathToFolder: folder}, function listFilesCallback(err, fileList) {
				FIND_FILES_IN_FLIGHT--;
				totalFoldersSearched++;
				
				if(FIND_FILES_ABORTED) return finish(null);
				
				if(err) {
					console.warn(err.message);
					return;
				}
				
				for (var i=0, path, matchArr; i<fileList.length; i++) {
					path = user.toVirtualPath(fileList[i].path);
					
				if(ignore.indexOf(path) != -1) {
					if(fileList[i].type=="d") foldersIgnored++;
					else filesIgnored++;
					continue;
				}
				
				if(fileList[i].type=="d") {
					// Do not search in dot files or temp/tmp folders
					if(fileList[i].name != "temp" && fileList[i].name != "tmp" && fileList[i].name.substr(0,1) != ".") {
						searchFolder(path);
						}
					}
					else {
						matchArr = path.match(reName);
						if(matchArr) {
							user.send({
								fileFound: {
									path: path, 
									match: matchArr,
									totalFoldersToSearch: totalFoldersToSearch,
									totalFoldersSearched: totalFoldersSearched,
									foldersBeingSearched: FIND_FILES_IN_FLIGHT,
									found: filesFound,
									maxResults: maxResults,
								}
							});
							filesFound++;
							if(filesFound >= maxResults) break;
						}
					}
				}
				
				sendProgress();
				
				/*
					console.log("filesFound=" + filesFound + " maxResults=" + maxResults + " FIND_FILES_IN_FLIGHT=" + FIND_FILES_IN_FLIGHT + 
					" searchQueue.length=" + searchQueue.length + " folders.length=" + folders.length + " folders=" + JSON.stringify(folders));
				*/
				
				if(filesFound >= maxResults) {
					finish(null);
				}
			else if(FIND_FILES_IN_FLIGHT < maxConcurrency && searchQueue.length > 0) {
				for (var i=FIND_FILES_IN_FLIGHT; i<maxConcurrency && searchQueue.length > 0; i++) searchFolder(searchQueue.pop());
			}
				else if(FIND_FILES_IN_FLIGHT == 0 && searchQueue.length == 0 && folders.length > 0) {
					currentFolder = folders.pop();
					user.send({pathGlob: currentFolder});
					searchFolder(currentFolder);
				}
				else if(FIND_FILES_IN_FLIGHT == 0 && searchQueue.length == 0 && folders.length == 0) {
					finish(null);
				}
				else if(FIND_FILES_IN_FLIGHT == 0) throw new Error("Unexpected: FIND_FILES_IN_FLIGHT=" + FIND_FILES_IN_FLIGHT + " folders=" + JSON.stringify(folders) +
				" filesFound=" + filesFound + " maxResults=" + maxResults);
				
			});
		}
		
		function sendProgress() {
			var now = new Date();
			if(now - lastProgress > progressInterval) {
				user.send({
					findFilesStatus: {
						totalFoldersToSearch: totalFoldersToSearch,
						totalFoldersSearched: totalFoldersSearched,
						foldersBeingSearched: FIND_FILES_IN_FLIGHT,
						found: filesFound,
						maxResults: maxResults,
						name: findFile,
						folder: currentFolder
					}
				});
				lastProgress = now;
			}
		}
		
		function finish(err, resp) {
		if( (FIND_FILES_IN_FLIGHT != 0 || searchQueue.length > 0) && (!FIND_FILES_ABORTED && filesFound < maxResults && folders.length > 0) ) {
			throw new Error("FIND_FILES_IN_FLIGHT=" + FIND_FILES_IN_FLIGHT + " filesFound=" + filesFound + 
			" maxResults=" + maxResults + " folders.length=" + folders.length + " searchQueue.length=" + searchQueue.length + 
			"FIND_FILES_ABORTED=" + FIND_FILES_ABORTED);
		}
		
		FIND_FILES_ABORTED = true;
			if(!callbackCalled) {
				callbackCalled = true;
				if(!resp) resp = {};
				
				if(!resp.buzy) resp.buzy = false;
				if(!resp.found) resp.found = filesFound;
				if(!resp.foldersBeingSearched) resp.foldersBeingSearched = FIND_FILES_IN_FLIGHT;
				if(!resp.maxResults) resp.maxResults = maxResults;
				if(!resp.totalFoldersToSearch) resp.totalFoldersToSearch = totalFoldersToSearch;
				if(!resp.totalFoldersSearched) resp.totalFoldersSearched = totalFoldersSearched;
				if(!resp.name) resp.name = findFile;
			if(!resp.foldersIgnored) resp.foldersIgnored = foldersIgnored;
			if(!resp.filesIgnored) resp.filesIgnored = filesIgnored;
			
				findFilesCallback(err, resp);
			}
		}
		
	}

API.abortFindFiles = function abortFindFiles(user, json, abortFindFilesCallback) {
	FIND_FILES_ABORTED = true;
abortFindFilesCallback(null, {foldersBeingSearched: FIND_FILES_IN_FLIGHT});
	}

API.run = function run(user, json, callback) {
	// Runs a shell command
	
	// Use exec instead of execFile because it's too hard to know how the arguments should be passed.
	var exec = require('child_process').exec;
	
	var options = {
		encoding: 'utf8',
		maxBuffer: 200*1024,
		env: process.env
	};
	
	/*
		env: {
		HOME: "/",
		PATH:"/bin/:/usr/bin/",
		USER: user.name,
		LOGNAME: user.name,
		uid:
		gid:
		}
	*/
	
	if(json.cwd) options.cwd = json.cwd;
	if(json.env) {
		for(var prop in json.env) {
			options.env[prop] = json.env[prop];
		}
	}
	
	var command = json.command;
	
	console.log("Running command=" + command + " ...");
	console.log("env=" + JSON.stringify(options.env, null, 2));
	exec(command, options, function (err, stdout, stderr) {
		
		console.log(command + " => err=" + (err ? err.message : null) + " stdout=" + stdout + " stderr=" + stderr);
		
		
		
		if(err) {
			console.log("err.code=" + err.code);
			return callback(err);
		}
		else return callback(null, {stdout: stdout, stderr: stderr});
		
	});
}


/*
	
	API.shell = function shellCommand(user, json, shellCommandCallback) {
	// Deprecated! Use virtual terminal instead!
	var exec = require('child_process').exec;
	
	var commandToRun = json.command;
	
	var execOptions = {
		encoding: 'utf8',
		timeout: 2000,
		maxBuffer: 200*1024,
		killSignal: 'SIGTERM',
		cwd: null,
		env: null
	}
	
	exec(commandToRun, execOptions, function(err, stdout, stderr) {
		var output = stdout + stderr;
		
		if(typeof output == "string") output = output.replace(/\r/g, "");
		
		shellCommandCallback(err, {output: output});
		
	});
	}
*/

API.ping = function ping(user, json, callback) {
	callback(null, json);
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
