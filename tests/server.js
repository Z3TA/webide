(function() {
	"use strict";
	
	
	EDITOR.addTest(function testReadFromDisk(callback) {
		
		var json = {path: "README.txt", returnBuffer: false, encoding: "utf8"};
		
		CLIENT.cmd("readFromDisk", json, function(err, json) {
			if(err) throw err
			else {
				if(json.path.indexOf("README.txt") == -1) throw new Error("path=" + path);
				if(json.data.length < 10) throw new Error("json.data.length=" + json.data.length);
				
				callback(true);
			}
		});
		
	});
	
	EDITOR.addTest(function testGetFileSizeOnDisk(callback) {
		
		var json = {path: "README.txt"};
		
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
		
		var json = {pathToFolder: "bin/"};
		
		CLIENT.cmd("listFiles", json, function(err, json) {
			if(err) throw err
			else {
				
				// Make sure jzedit is in the list
				var list = json.list;
				var hasFile = false;
				var lookForFileName = "jzedit";
				
				//console.log("list=" + JSON.stringify(list, null, 2));
				
				for(var i=0, file; i<list.length; i++) {
					file = list[i];
					if(file.name == lookForFileName) hasFile = true;
				}
				
				if(!hasFile) throw new Error("Did not find lookForFileName=" + lookForFileName + " in list: " + JSON.stringify(list, null, 2));

				callback(true);
			}
		});
		
	}, 1);
	
})();

