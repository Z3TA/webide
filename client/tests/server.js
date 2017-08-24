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
		
		CLIENT.cmd("listFiles", json, function(err, json) {
			if(err) throw err
			else {
				
				// Make sure testfile is in the list
				var list = json.list;
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
				
				var url = "http://" + json.url;
				
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
	
	
	
	
})();
