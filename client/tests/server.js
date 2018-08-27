(function() {
	"use strict";
	
	EDITOR.addTest(function testReadFromDisk(callback) {
		
		var testFolder = "/testReadFromDiskUniqueName/";
		var testFile = "testReadFromDisk.txt";
		var testText = "abc123\n";
		
		EDITOR.createPath(testFolder, function folderCreated(err, path) {
			if(err) throw err;
			EDITOR.saveToDisk(testFolder + testFile, testText, fileCreated);
		});
		
		function fileCreated(err, path) {
			if(err) throw err;
			
			var json = {path: path, returnBuffer: false, encoding: "utf8"};
		
		CLIENT.cmd("readFromDisk", json, function(err, json) {
			if(err) throw err
			else {
					if(json.path.indexOf(testFile) == -1) throw new Error("path=" + path);
					if(json.data != testText) throw new Error("json.data=" + json.data + " is not testText=" + testText);
				
					// Cleanup
					CLIENT.cmd("deleteFile", {filePath: testFolder + testFile}, function(err, json) {
						if(err) throw err
						else {
							
							// Cleanup
							CLIENT.cmd("deleteDirectory", {directory: testFolder}, function(err, json) {
								if(err) throw err
								else {
									
									callback(true);
									
								}
							});
							
						}
					});
					
			}
		});
		}
	});
	
	EDITOR.addTest(function testGetFileSizeOnDisk(callback) {
		
		var testFolder = "/testGetFileSizeOnDiskUniqueName/";
		var testFile = "testGetFileSizeOnDisk.txt";
		var testText = "abc123\n";
		
		EDITOR.createPath(testFolder, function folderCreated(err, path) {
			if(err) throw err;
			EDITOR.saveToDisk(testFolder + testFile, testText, fileCreated);
		});
		
		function fileCreated(err, path) {
			if(err) throw err;
			
			var json = {path: path};
		
		CLIENT.cmd("getFileSizeOnDisk", json, function(err, json) {
			if(err) throw err
			else {
				console.log("size=" + json.size);
					if(json.size != testText.length) throw new Error("json.size=" + json.size + " testText=" + testText);
				
					// Cleanup
					CLIENT.cmd("deleteFile", {filePath: testFolder + testFile}, function(err, json) {
						if(err) throw err
						else {
							
							// Cleanup
							CLIENT.cmd("deleteDirectory", {directory: testFolder}, function(err, json) {
								if(err) throw err
								else {
									
									callback(true);
									
								}
							});
							
						}
					});
					
			}
		});
		}
		
	});
	
	
	EDITOR.addTest(function testListFiles(callback) {
		
		var testFolder = "/testListFilesUniqueName/";
		var testFile = "testListFiles.txt";
		var testText = "abc123\n";
		
		EDITOR.createPath(testFolder, function folderCreated(err, path) {
			if(err) throw err;
			EDITOR.saveToDisk(testFolder + testFile, testText, fileCreated);
		});
		
		function fileCreated(err, path) {
		
			var json = {pathToFolder: testFolder};
		
			CLIENT.cmd("listFiles", json, function(err, list) {
			if(err) throw err
			else {
				
				// Make sure testfile is in the list
				var hasFile = false;
					var lookForFileName = testFile;
				
				//console.log("list=" + JSON.stringify(list, null, 2));
				
				for(var i=0, file; i<list.length; i++) {
					file = list[i];
					if(file.name == lookForFileName) hasFile = true;
				}
				
				if(!hasFile) throw new Error("Did not find lookForFileName=" + lookForFileName + " in list: " + JSON.stringify(list, null, 2));

					// Cleanup
					CLIENT.cmd("deleteFile", {filePath: testFolder + testFile}, function(err, json) {
						if(err) throw err
						else {
							
							// Cleanup
							CLIENT.cmd("deleteDirectory", {directory: testFolder}, function(err, json) {
								if(err) throw err
								else {
									
									callback(true);
									
								}
							});
							
						}
					});
					
			}
		});
		}
		
	});
	
	EDITOR.addTest(function testCreatePath(callback) {
		
		//alertBox(EDITOR.workingDirectory);
		
		var tempPath = "/testCreatePathUniqueName/foo/bar/";
		var pathToCreate = UTIL.toSystemPathDelimiters(EDITOR.workingDirectory + tempPath);
		var json = {pathToCreate: pathToCreate};
		
		CLIENT.cmd("createPath", json, function(err, json) {
			if(err) throw err
			else {
				
				var fullPath = json.path;
				
				if(fullPath.indexOf("foo") == -1) throw new Error("Full path=" + fullPath + " does not include foo! pathToCreate=" + pathToCreate);
				
				// Cleanup
				CLIENT.cmd("deleteDirectory", {directory: "/testCreatePathUniqueName/foo/bar/"}, function(err, json) {
					if(err) throw err
					else {
						
						// Cleanup
						CLIENT.cmd("deleteDirectory", {directory: "/testCreatePathUniqueName/foo/"}, function(err, json) {
							if(err) throw err
							else {
								
								// Cleanup
								CLIENT.cmd("deleteDirectory", {directory: "/testCreatePathUniqueName/"}, function(err, json) {
									if(err) throw err
									else {
										
										callback(true);
										
									}
								});
								
							}
						});
						
					}
				});
				
			}
		});
		
	});
	
	EDITOR.addTest(function testConnect(callback) {
		
		var connJson = {protocol: "ftp", serverAddress: "ftp.sunet.se", user: "anonymous", passw: ""};
		
		CLIENT.cmd("connect", connJson, function(err, json) {
			if(err) throw err;
			
			var url = connJson.protocol + "://" + connJson.serverAddress + "/";
			var workingDirectory = json.workingDirectory;
			
			if(workingDirectory != url) throw new Error("Expected workingDirectory=" + workingDirectory + " to be url=" + url);
			
			CLIENT.cmd("disconnect", connJson, function(err, json) {
				if(err) throw new Error("Failed to disconnect from ftp! err=" + (err.msg ? err.msg : err) + " json=" + JSON.stringify(json));
				
				callback(true);
			});
			
		});
		
	});
	
	
	EDITOR.addTest(function testServe(callback) {
		
		var testFolder = "/testServeUniqueName/";
		var testFile = "testfile.txt";
		var testText = "Hello World!\n";
		

		EDITOR.createPath(testFolder, function folderCreated(err, path) {
			if(err) throw err;
			EDITOR.saveToDisk(testFolder + testFile, testText, fileCreated);
		});
		
		
		function fileCreated(err, path) {
			if(err) throw err;
			var json = {folder: testFolder};
			CLIENT.cmd("serve", json, function(err, json) {
				if(err) throw err
				
				var url = document.location.protocol + "//" + json.url;
				
				if(!url) throw new Error("url expected!");
				
				var fileUrl = url + testFile;
				
				
				// Launch http request
				
				UTIL.httpGet(fileUrl, function httpGetResult(err, text) {
					
					if(err) throw err;
					
					if(text.length == 0) throw new Error("No text retrieved");
					
					console.log("text=" + text);
					
					// Cleanup
					CLIENT.cmd("stop_serve", {folder: testFolder}, function(err, json) {
						if(err) throw err
						else {
					
					// Cleanup
					CLIENT.cmd("deleteFile", {filePath: testFolder + testFile}, function(err, json) {
						if(err) throw err
						else {
							
							// Cleanup
							CLIENT.cmd("deleteDirectory", {directory: testFolder}, function(err, json) {
								if(err) throw err
								else {
									
									callback(true);
									
										}
										
									});
								}
							});
							
						}
					});
					
				});
			});
		}
		
		
	});
	
	EDITOR.addTest(function testHash(callback) {
		
		var testFolder = "/testHash/";
		var testFile = "testHash.txt";
		var testText = "";
		var testRow = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖabcdefghijklmnopqrstuvwxyzåäö0123456789\n";
		
		
var didReadString = false;
		var didReadBuffer = false;
		var didHash = false;

		for (var i=0; i<1000; i++) testText = testText + i + ". " + testRow;
		var correctHash = "91f8cbc3be52354a9387d2e32348e529c71d2b8aa77656f63d7815d3959a9de0"; // sha256
		
		EDITOR.createPath(testFolder, function folderCreated(err, path) {
			if(err) throw err;
			EDITOR.saveToDisk(testFolder + testFile, testText, fileCreated);
		});
		
		function fileCreated(err, path) {
			if(err) throw err;
			
			CLIENT.cmd("readFromDisk", {path: path, returnBuffer: true}, readBuffer);
			CLIENT.cmd("readFromDisk", {path: path, returnBuffer: false, encoding: "utf8"}, readString);
			CLIENT.cmd("hash", {path: path}, readHash);
		}
		
		function readBuffer(err, json) {
			didReadBuffer = true;
			if(err) throw err
			
			console.log("readBuffer hash=" + json.hash);
			
			if(json.hash != correctHash) throw new Error("json.hash=" + json.hash + " correctHash=" + correctHash);
			
			checkDone();
		}
		
		function readString(err, json) {
			didReadString = true;
			if(err) throw err
			
			console.log("readString hash=" + json.hash);
			
			if(json.hash != correctHash) throw new Error("json.hash=" + json.hash + " correctHash=" + correctHash);
			
			checkDone();
			
		}
		
		function readHash(err, hash) {
			didHash = true;
			if(err) throw err
			
			console.log("readHash hash=" + hash);
			
			if(hash != correctHash) throw new Error("hash=" + hash + " correctHash=" + correctHash);
			
			checkDone();
		}
		
		function checkDone() {
			if(didReadBuffer && didReadString && didHash) cleanup();
			else console.log("didReadBuffer=" + didReadBuffer + " didReadString=" + didReadString + " didHash=" + didHash);
		}
		
		function cleanup() {
			// Cleanup
			CLIENT.cmd("deleteFile", {filePath: testFolder + testFile}, function(err, json) {
				if(err) throw err
				else {
					
					// Cleanup
					CLIENT.cmd("deleteDirectory", {directory: testFolder}, function(err, json) {
						if(err) throw err
						else {
							
							callback(true);
							callback = null;
							
						}
					});
					
				}
			});
		}
		
	});
	
	EDITOR.addTest(function testHashOnSftp(callback) {
		
		// Todo: Also test on FTP!
		
		var protocol = "sftp";
		var serverAddress = "ben.100m.se";
		var testFolder = protocol + "://" + serverAddress + "/uploads/testHashOnSftp/";
		var testFile = "testHash.txt";
		var testText = "";
		var testRow = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖabcdefghijklmnopqrstuvwxyzåäö0123456789\n";
		var connJson = {protocol: protocol, serverAddress: serverAddress,  user: "sftptest", passw: "12345"};

		var didReadString = false;
		var didHash = false;

for (var i=0; i<1000; i++) testText = testText + i + ". " + testRow;
		var correctHash = "91f8cbc3be52354a9387d2e32348e529c71d2b8aa77656f63d7815d3959a9de0"; // sha256

		CLIENT.cmd("connect", connJson, function(err, json) {
			if(err) throw err;
			
			EDITOR.createPath(testFolder, function folderCreated(err, path) {
				if(err) throw err;
				EDITOR.saveToDisk(testFolder + testFile, testText, fileCreated);
			});

		});
		
		function fileCreated(err, path) {
			if(err) throw err;
			
			CLIENT.cmd("readFromDisk", {path: path, returnBuffer: false, encoding: "utf8"}, readString);
			CLIENT.cmd("hash", {path: path}, readHash);
		}
		
		function readString(err, json) {
			didReadString = true;
			if(err) throw err
			
			console.log("readString hash=" + json.hash);
			
			if(json.hash != correctHash) throw new Error("json.hash=" + json.hash + " correctHash=" + correctHash);
			
			checkDone();
			
		}
		
		function readHash(err, hash) {
			didHash = true;
			if(err) throw err
			
			console.log("readHash hash=" + hash);
			
			if(hash != correctHash) throw new Error("hash=" + hash + " correctHash=" + correctHash);
			
			checkDone();
		}
		
		function checkDone() {
			if(didReadString && didHash) cleanup();
			else console.log("didReadString=" + didReadString + " didHash=" + didHash);
		}
		
		function cleanup() {
			// Cleanup
			CLIENT.cmd("deleteFile", {filePath: testFolder + testFile}, function(err, json) {
				if(err) throw err
				else {
					
					// Cleanup
					CLIENT.cmd("deleteDirectory", {directory: testFolder}, function(err, json) {
						if(err) throw err
						else {
							
							// Don't disconnect right away because other tests might depend on the connection
							callback(true);
							callback = null;
							
							setTimeout(function disconnectFromSftp() {
CLIENT.cmd("disconnect", connJson, function(err, json) {
								if(err) throw new Error("Failed to disconnect from " + protocol + "! err=" + (err.msg ? err.msg : err) + " json=" + JSON.stringify(json));
								});
							}, 10000);
							
						}
					});
					
				}
			});
		}
		
	});
	
	
})();
