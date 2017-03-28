(function() {
	"use strict";
	
	
	EDITOR.addTest(function testReadFromDisk(callback) {
		
		var json = {path: "test.txt", returnBuffer: false, encoding: "utf8"};
		
		CLIENT.cmd("readFromDisk", json, function(err, json) {
			if(err) throw err
			else {
				if(json.path.indexOf("test.txt") == -1) throw new Error("path=" + path);
				if(json.data.length < 10) throw new Error("json.data.length=" + json.data.length);
				
				callback(true);
			}
		});
		
	});
	
	EDITOR.addTest(function testGetFileSizeOnDisk(callback) {
		
		var json = {path: "test.txt"};
		
		CLIENT.cmd("getFileSizeOnDisk", json, function(err, json) {
			if(err) throw err
			else {
				if(json.size < 10) throw new Error("json.size=" + json.size);
				
				callback(true);
			}
		});
		
	});
	
	EDITOR.addTest(function testSaveToDisk(callback) {
		
		var randomName = "djdsalkjsdfjfdsj.txt";
		var randomContent = "98sfd9sdf978sa98dijslsdfjfsdjl";
		
		var json = {path: randomName, text: randomContent};
		
		CLIENT.cmd("saveToDisk", json, function(err, json) {
			if(err) throw err
			else {
				var path = json.path;
				
				// Open the file and check the content
				
				CLIENT.cmd("readFromDisk", json, function(err, json) {
					if(err) throw err
					else {
						if(json.path.indexOf(randomName) == -1) throw new Error("path=" + path);
						if(json.data != randomContent) throw new Error("json.data=" + json.data);
						
						callback(true);
					}
				});
				
			}
		});
		
	});
	
	
	
	EDITOR.addTest(function testListFiles(callback) {
		
		var json = {pathToFolder: "testfolder/"};
		
		CLIENT.cmd("listFiles", json, function(err, json) {
			if(err) throw err
			else {
				
				// Make sure testfile.txt is in the list
				var list = json.list;
				var hasFile = false;
				var lookForFileName = "testfile.txt";
				
				//console.log("list=" + JSON.stringify(list, null, 2));
				
				for(var i=0, file; i<list.length; i++) {
					file = list[i];
					if(file.name == lookForFileName) hasFile = true;
				}
				
				if(!hasFile) throw new Error("Did not find lookForFileName=" + lookForFileName + " in list: " + JSON.stringify(list, null, 2));

				callback(true);
			}
		});
		
	});
	
	EDITOR.addTest(function testCreatePath(callback) {
		
		//alertBox(EDITOR.workingDirectory);
		
		var json = {pathToCreate: UTIL.toSystemPathDelimiters(EDITOR.workingDirectory + "/temp/foo/bar")};
		
		CLIENT.cmd("createPath", json, function(err, json) {
			if(err) throw err
			else {
				
				var fullPath = json.path;
				
				if(fullPath.indexOf("foo") == -1) throw new Error("Full path does not include foo");
				
				callback(true);
			}
		});
		
	});
	
	EDITOR.addTest(function testConnect(callback) {
		
		var connJson = {protocol: "ftp", serverAddress: "192.168.1.77", user: "test", passw: "test123"};
		
		CLIENT.cmd("connect", connJson, function(err, json) {
			if(err) throw err;
			
			var url = connJson.protocol + "://" + connJson.serverAddress + "/";
			var workingDirectory = json.workingDirectory;
			
			if(workingDirectory != url) throw new Error("Expected workingDirectory=" + workingDirectory + " to be url=" + url);
			
			callback(true);
		});
		
	});
	
	
	EDITOR.addTest(function testServe(callback) {
		
		var json = {folder: "/testfolder/"};
		
		CLIENT.cmd("serve", json, function(err, json) {
			if(err) throw err
			else {
				
				var url = json.url;
				
				if(!url) throw new Error("url expected!");
				
				// Launch http request
				
				UTIL.httpGet(url, function(err, text) {
					
					if(err) throw err;
					
					callback(true);
					
				});
				
				
			}
		});
		
	}, 1);
	
	
	
})();
