(function() {
	"use strict";
	
	
	editor.addTest(function testReadFromDisk(callback) {
		
		var json = {path: "README.txt", returnBuffer: false, encoding: "utf8"};
		
		client.cmd("readFromDisk", json, function(err, json) {
			if(err) throw err
			else {
				if(json.path.indexOf("README.txt") == -1) throw new Error("path=" + path);
				if(json.data.length < 10) throw new Error("json.data.length=" + json.data.length);
				
				callback(true);
			}
		});
		
	});
	
	editor.addTest(function testGetFileSizeOnDisk(callback) {
		
		var json = {path: "README.txt"};
		
		client.cmd("getFileSizeOnDisk", json, function(err, json) {
			if(err) throw err
			else {
				if(json.size < 10) throw new Error("json.size=" + json.size);
				
				callback(true);
			}
		});
		
	});
	
	editor.addTest(function testSaveToDisk(callback) {
		
		var randomName = "djdsalkjsdfjfdsj.txt";
		var randomContent = "98sfd9sdf978sa98dijslsdfjfsdjl";
		
		var json = {path: randomName, text: randomContent};
		
		client.cmd("saveToDisk", json, function(err, json) {
			if(err) throw err
			else {
				var path = json.path;
				
				// Open the file and check the content
				
				client.cmd("readFromDisk", json, function(err, json) {
					if(err) throw err
					else {
						if(json.path.indexOf(randomName) == -1) throw new Error("path=" + path);
						if(json.data != randomContent) throw new Error("json.data=" + json.data);
						
						callback(true);
					}
				});
				
				
				callback(true);
			}
		});
		
	}, 1);
	
})();

