(function() {
	"use strict";
	
	/*
		
		EDITOR.currentFile.caret.index
		
		
	*/
	
	
	EDITOR.addTest(1, function callbackMagic(callback) {
		EDITOR.openFile("callbackMagic.js", 'function foo(cb) {\nvar answer = {baz: 1};\ncb(new Error("Hi"), answer);\n}\nfoo(bar);\nfunction bar(a, b) {\nb.b\n}\n', function(err, file) {
			var index = 107;
			var atCaret = autoComplete(file, index);
			UTIL.assert(file.rowText(6), "b.baz"); // No autocomplete!
			EDITOR.closeFile(file);
			callback(true);
		});
	});
	
	EDITOR.addTest(function numbersHasNoLengthProperty(callback) {
		EDITOR.openFile("numbersHasNoLengthProperty.js", 'var nr = 42;\nnr.l\n', function(err, file) {
			var index = 17;
			var atCaret = autoComplete(file, index);
			UTIL.assert(file.rowText(1), "nr.l"); // No autocomplete!
			EDITOR.closeFile(file.path);
			callback(true);
		});
	});
	
	EDITOR.addTest(function autocompleteObjectPrototype(callback) {
		EDITOR.openFile("autocompleteObjectPrototype.js", 'var obj = {};\nobj.hasO\n', function(err, file) {
			var index = 22;
			var atCaret = autoComplete(file, index);
			UTIL.assert(file.rowText(1), "obj.hasOwnProperty()");
			EDITOR.closeFile(file.path);
			callback(true);
		});
	});
	
	EDITOR.addTest(function autocompletePrototypeMethods(callback) {
		EDITOR.openFile("autocompletePrototypeMethods.js", 'function Person() {}\nPerson.prototype.banana=function() {};\nvar p = new Person();\np.ba\n', function(err, file) {
			var index = 86;
			var atCaret = autoComplete(file, index);
			UTIL.assert(file.rowText(3), "p.banana()");
			EDITOR.closeFile(file.path);
			callback(true);
		});
	});
	
	EDITOR.addTest(function autocompleteBuiltinObjectPrototype(callback) {
		EDITOR.openFile("autocompleteBuiltinObjectPrototype.js", 'var date = new Date();\ndate.n\n', function(err, file) {
			var index = 29;
			var atCaret = autoComplete(file, index);
			UTIL.assert(file.rowText(1), "date.now()");
			EDITOR.closeFile(file.path);
			callback(true);
		});
	});
	
	EDITOR.addTest(function autocompleteThisVariables(callback) {
		EDITOR.openFile("autocompleteThisVariables.js", 'function Person(name) {\nthis.name = name;\n}\nvar myPerson = new Person("World");\n\nmyPerson.na\n', function(err, file) {
			var index = 92;
			var atCaret = autoComplete(file, index);
			UTIL.assert(atCaret.word, "myPerson.name");
			EDITOR.closeFile(file.path);
			callback(true);
			});
	});
	
	EDITOR.addTest(function dontAutocompleteLamdaFunctions(callback) {
		EDITOR.openFile("dontAutocompleteLamdaFunctions.js", 'foo(function mylamdafunction() {\nmy\n});\nmy', function(err, file) {
			var index = 42;
			var atCaret = autoComplete(file, index);
			if( file.rowText(3) != "my" ) throw new Error("Should not autocomplete lambda functions unless inside the function!");
			
			var index = 35;
			var atCaret = autoComplete(file, index);
			if( file.rowText(1) != "mylamdafunction()" ) throw new Error("Expected autocompletion of the name of the function we are in!");
			
			EDITOR.closeFile(file.path);
			callback(true);
		});
	});
	
	EDITOR.addTest(function autocompleteJsBuiltins(callback) {
		EDITOR.openFile("autocompleteJsBuiltins.js", 'Math.fl', function(err, file) {
			var index = 7;
			
			var atCaret = autoComplete(file, index);
			
			UTIL.assert(file.rowText(0), "Math.floor()");
			
			EDITOR.closeFile(file.path);
			callback(true);
		});
	});
	
	EDITOR.addTest(function autocompleteArrayPrototypes(callback) {
		EDITOR.openFile("autocompleteArrayPrototypes.js", 'var arr = []\narr.fo', function(err, file) {
			var index = 19;
			
			var atCaret = autoComplete(file, index);
			
			UTIL.assert(file.rowText(1), "arr.forEach()");
			
			EDITOR.closeFile(file.path);
			callback(true);
		});
	});
	
	EDITOR.addTest(function autocompleteSubProp(callback) {
		EDITOR.openFile("autocompleteSubProp.js", 'var object = {property: {subproperty: 1}}\nobject.property.s', function(err, file) {
			var index = 59;
			
			var atCaret = autoComplete(file, index);
			
			UTIL.assert(atCaret.word, "object.property.subproperty");
			
			EDITOR.closeFile(file.path);
			callback(true);
		});
	});
	
	EDITOR.addTest(function autocompleteObjects(callback) {
		EDITOR.openFile("autocompleteObjects.js", 'var object = {foo: 1, bar: 2}\nobject.b', function(err, file) {
			
			var index = 38;
			
			var atCaret = autoComplete(file, index);
			
			UTIL.assert(atCaret.word, "object.bar");
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function autocompleteVariables(callback) {
		EDITOR.openFile("autocompleteVariables.js", 'var foobar = 1\nfoo', function(err, file) {
			
			var index = 18;
			
			var atCaret = autoComplete(file, index);
			
			UTIL.assert(atCaret.word, "foobar");
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function autocompleteFunctionArguments(callback) {
		EDITOR.openFile("autocompleteFunctionArguments.js", 'function foo(abaCadabra, bubbelBabbel) {\n\n}\n', function(err, file) {
			
			
			var firstArg = "abaCadabra";
			var secondArg = "bubbelBabbel";
			
			var key_a = 65;
			var key_tab = 9;
			
			file.moveCaret(undefined, 1); // Move into the function
			
			file.putCharacter(firstArg.substr(0,1)); // a
			EDITOR.showFile(file);
			EDITOR.mock("keydown", {charCode: key_tab}); // tab
			
			var textOnRow = file.rowText(file.caret.row).trim();
			
			UTIL.assert(textOnRow, firstArg);
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	});
	
	EDITOR.addTest(function autocompleteAfterIf(callback) {
		EDITOR.openFile("autocompleteAfterIf.js", 'var foobar = 1\nif(foo\n', function(err, file) {
			
			var index = 21;
			
			var atCaret = autoComplete(file, index);
			
			UTIL.assert(atCaret.word, "foobar");
			
			EDITOR.closeFile(file.path);
			callback(true);
			
		});
	});
	
	EDITOR.addTest(610, false, function autocompleteFromOtherFilesInProject(callback) {
		EDITOR.openFile("/mywebsiteproject/index.htm", '<html><head><script src="script1.js"></script><script src="script2.js"></script></head></html>', function(err, file0) {
			EDITOR.openFile("/mywebsiteproject/script1.js", 'var globalVariableFromScript1 = "abcdefg";\n', function(err, file1) {
				EDITOR.openFile("/mywebsiteproject/script2.js", 'globalVariableFromS\nanotherGlobalVariableB\n\n', function(err, file2) {
					EDITOR.openFile("/mywebsiteproject/script3.js", 'var anotherGlobalVariableButFromScript3 = "hjiklmno";\n', function(err, file3) {
						// file3 is just there to make sure file2 doesn't autocomplete global variables from file3.
						
						// There is a timer in place to prevent the same file from being parsed many times ...
						setTimeout(test, 200);
						
						function test() {
							var atCaret = autoComplete(file2, 19);
							UTIL.assert(atCaret.word, "globalVariableFromScript1"); // Completed
							
							var atCaret = autoComplete(file2, 48);
							UTIL.assert(atCaret.word, "anotherGlobalVariableB"); // Not completed
							
							EDITOR.closeFile(file3);
							EDITOR.closeFile(file2);
							EDITOR.closeFile(file1);
							EDITOR.closeFile(file0);
							
							callback(true);
						}
					});
				});
			});
		});
	});
	
	
	function autoComplete(file, index) {
		
		var key_tab = 9;
		var wordDelimiters = " \t\r\n;:()"
		
		file.moveCaretToIndex(index);
		EDITOR.showFile(file);
		EDITOR.mock("keydown", {charCode: key_tab}); // tab to autocomplete
		
		return file.wordAtCaret(file.caret, wordDelimiters);
	} 
	
})();


