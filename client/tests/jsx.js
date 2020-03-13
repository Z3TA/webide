(function() {
	
	"use strict";

	//if(!EDITOR.settings.jsx) return;

	EDITOR.bindKey({desc: "Run JSX tests", key: "j", combo: CTRL+ALT, fun: runAllJsxTests});
	
	
	
	var tests = [
		function JSX8(callback) {
			EDITOR.openFile("jsx8.js", 'if( a < b) console.log(">");\n', function(err, file) {
				if(err) throw err;
				
				UTIL.assert(file.parsed.xmlTags.length, 0);
				UTIL.assert(file.grid[1].indentation, 0);
				
				EDITOR.closeFile(file.path);
				callback(true);
			});
		},
		function JSX7(callback) {
			EDITOR.openFile("jsx7.js", '(\n<foo\nprop="1"\n>\n<bar />\n</foo>\n);\n', function(err, file) {
				
				UTIL.assert(file.grid[5].indentation, 0);
				
				UTIL.assert(file.parsed.xmlTags[0].wordLength, 4);
				
				EDITOR.closeFile(file.path);
				callback(true);
			});
		},
		
		function JSX6(callback) {
			EDITOR.openFile("jsx6.js", '(\' <   \'>\')\n(\' <b   "> \')\n(\' <\/script>\')\n', function(err, file) {
				
				UTIL.assert(file.grid[0].indentation, 0);
				UTIL.assert(file.grid[1].indentation, 0);
				UTIL.assert(file.grid[2].indentation, 0);
				UTIL.assert(file.grid[3].indentation, 0);
				
				EDITOR.closeFile(file.path);
				callback(true);
			});
		},
		
		function JSX5(callback) {
			EDITOR.openFile("jsx5.js", 'var reScripts = /<script.*src="(.*)"><\/script>/g;\n// meh\n', function(err, file) {
				
				UTIL.assert(file.parsed.xmlTags.length, 0);
				
				UTIL.assert(file.grid[0].indentation, 0);
				
				EDITOR.closeFile(file.path);
				callback(true);
			});
		},
		
		function JSX4(callback) {
			EDITOR.openFile("jsx3.js", '{\nwhile(a <b) {\n}\nvar n = [ ".", "<", ">", ";"];\n// hmm\n}\n', function(err, file) {
				
				UTIL.assert(file.parsed.xmlTags.length, 0);
				
				UTIL.assert(file.grid[4].indentation, 1);
				UTIL.assert(file.grid[5].indentation, 0);
				
				EDITOR.closeFile(file.path);
				callback(true);
			});
		},
		
		function JSX3(callback) {
			EDITOR.openFile("jsx3.js", '{\nif(a.order < b.order) {\nreturn -1;\n}\nelse if(a.order > b.order) {\nreturn 1;\n}\nvar data = \'<svg xmlns="http://www.w3.org/2000/svg" width="\' + width + \'" height="\' + height + \'">\';\n//foo\n}\n', function(err, file) {
				
				UTIL.assert(file.parsed.xmlTags.length, 1); // Should be an xml tag, not an JSX tag
				
				UTIL.assert(file.grid[8].indentation, 1);
				UTIL.assert(file.grid[9].indentation, 0);
				UTIL.assert(file.grid[10].indentation, 0);
				
				EDITOR.closeFile(file.path);
				callback(true);
			});
		},
		
		function JSX2(callback) {
			EDITOR.openFile("jsx2.htm", '<!DOCTYPE html>\n<script></script>\n<script></script>\n<script></script>\n', function(err, file) {
				
				UTIL.assert(file.parsed.xmlTags.length, 7);
				
				UTIL.assert(file.grid[1].indentation, 0);
				UTIL.assert(file.grid[2].indentation, 0);
				UTIL.assert(file.grid[3].indentation, 0);
				
				EDITOR.closeFile(file.path);
				callback(true);
			});
		},
		
		function JSX1(callback) {
			
			EDITOR.openFile("jsx1.js", 'function foo(bar) {\nreturn <h1>Hello {bar}</h1>\n}\n<Foo bar={baz}>\nhi\n</Foo>\nif(a<b && c>d) {}\nif(a <b) {\n}\nelse if(a >b) {\n}\n', function(err, file) {
				
				if(file.parsed.xmlTags.length != 4) throw new Error("Expected 3 XML tags! file.parsed.xmlTags.length=" + file.parsed.xmlTags.length);
				
				UTIL.assert(file.grid[1].indentation, 1);
				
				UTIL.assert(file.grid[4].indentation, 1);
				
				
				EDITOR.closeFile(file.path);
				callback(true);
				
			});
			
		}
	];
	
	for(var i=0; i<tests.length; i++) EDITOR.addTest(tests[i]);
	
	
	/*
		EDITOR.addTest(1, function JSX7(callback) {
		EDITOR.openFile("jsx7.js", 'if(x < y)\n\n\'<a \\n></a>\';\n\n">"\n// meh\n', function(err, file) {
		
		UTIL.assert(file.grid[5].indentation, 0);
		
		//EDITOR.closeFile(file.path);
		callback(true);
		});
		});
	*/
	
	
	function runAllJsxTests() {
		
		alertBox("Running all JSX tests...");
		
		var allTests = tests.slice();
		
		run(allTests.shift());
		
		return PREVENT_DEFAULT;
		
		
		function run(test) {
			
			test(function(ok) {
				
				if(ok) {
					if(allTests.length > 0) run(allTests.shift());
					else alertBox("All JSX tests succeeded!");
				}
			});
			
		}
		
	}
	
})();
