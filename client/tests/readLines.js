
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
			
			if(err) return callback(err);
			
			if(lines.length != 10) throw new Error("Expected 10 lines! Not " + lines.length + " lines=" + JSON.stringify(lines, null, 2));
			
			if(lines[0] != "L11_abcdefghijkl") throw new Error("lines[0]=" + lines[0]);
			if(lines[9] != "L20_abcdefghijklmnopqrstu") throw new Error("lines[9]=" + lines[9]);
			
			callback(true);
		
		});
		
	});
	
	EDITOR.addTest(function testReadLines3(callback) {
		
		var testFileLocation = "testfile.txt";
		
		EDITOR.readLines(testFileLocation, {start: 30001, end: 30010}, function(err, lines) {
			
			if(err) return callback(err);
			
			if(lines.length != 10) throw new Error("Expected 10 lines! Not " + lines.length + " lines=" + JSON.stringify(lines, null, 2));
			
			if(lines[0] != "L30001_abcdefghijklmnopqrstuvwxyzåäöABCDEFGHIJKLMNOPQRSTUVWXYZÅ") throw new Error("lines[0]=" + lines[0]);
			if(lines[9] != "L30010_abcdefghijklmnopqrstuvwxyzåäöABCDEFGHIJKLMNOPQR") throw new Error("lines[9]=" + lines[9]);
			
		callback(true);
			
		});
		
	});
	
	EDITOR.addTest(function testReadLines4(callback) {
		
		var testFileLocation = "testfile.txt";
		
		// Trying to read more lines then what exist
		
		EDITOR.readLines(testFileLocation, {start: 33996, end: 34005}, function(err, lines) {
			
			if(err) return callback(err);
			
			if(lines.length != 5) throw new Error("Expected 5 lines! Not " + lines.length + " lines=" + JSON.stringify(lines, null, 2));
			
			if(lines[0] != "L33996_abcde") throw new Error("lines[0]=" + lines[0]);
			if(lines[4] != "L34000_Last_line!") throw new Error("lines[4]=" + lines[4]);
			
		callback(true);
		
		});
		
	});
	
	
	EDITOR.addTest(function testReadLines5(callback) {
		var filePath = "/tmp/readLinesTest.txt";
		
		var tests = [
			{
				txt: "Hello world",
				start: 1,
				end: 1,
				result: ["Hello world"]
			},
			{
				txt: "foo\nbar",
				start: 1,
				end: 2,
				result: ["foo", "bar"]
			},
			{
				txt: "foo\nbar\nbaz",
				start: 1,
				end: 3,
				result: ["foo", "bar", "baz"]
			},
			{
				txt: "LineA\nLineB\nLineC\nLineD\nLineE\n",
				start: 3,
				end: 4,
				result: ["LineC", "LineD"]
			},
			{
				txt: "Line1\nLine2\nLine3\nLine4\nLine5\n",
				start: 5,
				end: 5,
				result: ["Line5"]
			}
		];
		
		// First make sure the /tmp/ folder exist
		EDITOR.createPath("/tmp/", function(err, path) {
			if(err) throw err;
			
		// Run the tests with different chunk sizes
		run(tests, 1, function(err) {
			if(err) throw err;
			run(tests, 8, function(err) {
				if(err) throw err;
				run(tests, 12, function(err) {
					if(err) throw err;
					run(tests, 1024, function(err) {
						if(err) throw err;
						callback(true);
					});
				});
			});
		});
		});
		
		function run(originalTests, chunkSize, callback) {
			
			console.log("Testing readLines with chunkSize=" + chunkSize);
			
			var tests = originalTests.slice(); // Copy array to not change the original when it get shifted
			
			test();
			
			function test() {
				var item = tests.shift();
				
				if(tests.length == 0) {
					CLIENT.cmd("deleteFile", {filePath: filePath}, function(err) {
						if(err && err.code != "ENOENT") throw err;
						callback(null);
					});
					return;
				}
				
				EDITOR.saveToDisk(filePath, item.txt, function(err) {
					if(err) throw err;
					
					var options = {path: filePath, chunkSize: chunkSize, start: item.start, end: item.end};
					CLIENT.cmd("readLines", options, function(err, json) {
						if(err) throw err;
						
						for (var i=0; i<item.result.length; i++) {
							if(item.result[i] != json.lines[i]) {
								return error(i+item.start, "Expected item.result[" + i + "]=" + item.result[i] + " but got json.lines[" + i + "]=" + json.lines[i]);
							}
						}
						
						function error(line, msg) {
							// Show the file to see what's going on
							EDITOR.openFile(filePath, function(err, file) {
								if(err) throw err;
								
								file.gotoLine(line, function(err) {
									if(err) throw err;
									
									throw new Error("Unexpected file content on line " + line + "! " + msg + " chunkSize=" + chunkSize);
								});
								
							});
						}
						
						test(); // Run next test
						
					});
				});
			}
		}
	});
	
	
	EDITOR.addTest(function testReadLines6(callback) {
		// Tests both readLine and writeLine!
		var filePath = "/testfile.txt";
		var testFile = "/testReadLines6.txt";
		var lb = "\n";
		
		CLIENT.cmd("copyFile", {from: filePath, to: testFile}, function(err) {
			if(err) throw err;

			CLIENT.cmd("readLines", {start: 1, end: 4001, path: testFile}, function(err, json) {
				if(err) throw err;
				
				var lines = json.lines;
				
				if(lines[0] != "L1_First_line") throw new Error("lines[0]=" + lines[0]);
				if(lines[1999] != "L2000_abcdefghijklmnopqrstuvwxyzåäöABCDEFGHIJKL") throw new Error("lines[1999]=" + lines[1999]);
				if(lines[3999] != "L4000_abcdefghijklmnopqrstuvwxyzåäöABCDEFGHIJKLMNOPQRSTUVWXYZÅÄ") throw new Error("lines[3999]=" + lines[3999]);
				
				CLIENT.cmd("writeLines", {start: 1, end: 4001, overwrite: true, path: testFile, content: lines.join(lb)}, function(err, json) {
					if(err) throw err;
					
					if(json.contentRows != 4001) throw new Error("Expected 4001 contentRows: " + JSON.stringify(json));
					if(json.totalRowsRead != 34000) throw new Error("Expected 34000 totalRowsRead: " + JSON.stringify(json));
					if(json.totalRowsWritten != 34000) throw new Error("Expected 34000 totalRowsWritten: " + JSON.stringify(json));
					
					CLIENT.cmd("readLines", {start: 2000, end: 6000, path: testFile}, function(err, json) {
						if(err) throw err;
						
						var lines = json.lines;
						
						if(lines[0] != "L2000_abcdefghijklmnopqrstuvwxyzåäöABCDEFGHIJKL") throw new Error("lines[0]=" + lines[0]);
						
						// row0 = Line 2000
						// row 3000 = Line 5000
						if(lines[3000] != "L5000_abcdefghijklmnopqrstuvwxyzåäöABCD") throw new Error("lines[3000]=" + lines[3000] + " (Expected line 5000)");
						
						CLIENT.cmd("deleteFile", {filePath: testFile}, function(err) {
							if(err) throw err;
							
							callback(true);
						});
						
					});
				});
			});
		});
	});
	
	
	
})();

