(function() {
	"use strict";
	
	EDITOR.addTest(function sftpConnection(callback) {
		
		var protocol = "sftp";
		var serverAddress = "ben.100m.se";
		var testFolder = protocol + "://" + serverAddress + "/uploads/deletemeuniquefolder/";
		var testFile = "testReadWrite.txt";
		var testText = "abc123\n";
		
		CLIENT.cmd("connect", {protocol: protocol, serverAddress: serverAddress, user: "sftptest", passw: "12345"}, function(err, json) {
			if(err) throw err
			else {
				
				//var workingDirectory = json.workingDirectory;
				
				EDITOR.createPath(testFolder, function folderCreated(err, path) {
					if(err) throw err;
					EDITOR.saveToDisk(testFolder + testFile, testText, fileCreated);
				});
				
				function fileCreated(err, path) {
					if(err) throw err;
					
					
					CLIENT.cmd("readFromDisk", {path: path, returnBuffer: false, encoding: "utf8"}, function(err, json) {
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
											
											// Cleanup
											CLIENT.cmd("disconnect", {protocol: protocol, serverAddress: serverAddress}, function(err, json) {
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
				}
				
			}
		});
		
	});
	
	
	EDITOR.addTest(function ftpFindInFiles(callback) {
		// todo!
		
		callback(true);
		
	});
	
	
})();
