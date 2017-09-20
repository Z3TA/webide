
(function() {
	"use strict";
	
	EDITOR.addTest(function testReadLines1(callback) {
		
		var testFileLocation = "testfile.txt";
		
		EDITOR.readLines(testFileLocation, {start: 1, end: 10}, function(err, lines) {
			
			if(err) return callback(err);
			
			if(lines.length != 10) throw new Error("Expected 10 lines. Not " + lines.length + " ! lines=" + JSON.stringify(lines, null, 2));
			
			if(lines[0] != "L1_First_line") throw new Error("lines[0]=" + lines[0]);
			if(lines[9] != "L10_abcdefghijk") throw new Error("lines[9]=" + lines[9]);
			
			callback(true);
				
		});
		
	});
	
	
	EDITOR.addTest(function testReadLines2(callback) {
		
		var testFileLocation = "testfile.txt";
		
		EDITOR.readLines(testFileLocation, {start: 11, end: 20}, function(err, lines) {
			
			if(lines.length != 10) throw new Error("Expected 10 lines! Not " + lines.length + " lines=" + JSON.stringify(lines, null, 2));
			
			if(lines[0] != "L11_abcdefghijkl") throw new Error("lines[0]=" + lines[0]);
			if(lines[9] != "L20_abcdefghijklmnopqrstu") throw new Error("lines[9]=" + lines[9]);
			
			callback(true);
		
		});
		
	});
	
	EDITOR.addTest(function testReadLines3(callback) {
		
		var testFileLocation = "testfile.txt";
		
		EDITOR.readLines(testFileLocation, {start: 30001, end: 30010}, function(err, lines) {
			
			if(lines.length != 10) throw new Error("Expected 10 lines! Not " + lines.length + " lines=" + JSON.stringify(lines, null, 2));
			
			if(lines[0] != "L30001_abcdefghijklmnopqrstuvwxyzåäöABCDEFGHIJKLMNOPQRSTUVWXYZÅ") throw new Error("lines[0]=" + lines[0]);
			if(lines[9] != "L30010_abcdefghijklmnopqrstuvwxyzåäöABCDEFGHIJKLMNOPQR") throw new Error("lines[9]=" + lines[9]);
			
		callback(true);
			
		});
		
	});
	
	EDITOR.addTest(function testReadLines4(callback) {
		
		var testFileLocation = "testfile.txt";
		
		EDITOR.readLines(testFileLocation, {start: 33996, end: 34005}, function(err, lines) {
			
			if(lines.length != 5) throw new Error("Expected 5 lines! Not " + lines.length + " lines=" + JSON.stringify(lines, null, 2));
			
			if(lines[0] != "L33996_abcde") throw new Error("lines[0]=" + lines[0]);
			if(lines[4] != "L34000_Last_line!") throw new Error("lines[4]=" + lines[4]);
			
		callback(true);
		
		});
		
	});
	
	
})();

