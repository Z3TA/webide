
(function() {
	/*
		todo: A way to abort the spell-checker when text is removed!?
	
	
	*/
	"use strict";
	
	//if(global.settings.enableSpellchecker===false) return;
	

	if(global.settings.enableSpellchecker===undefined) {
		// Add ourself to settings
		global.settings.enableSpellchecker = true;
	}
	
	/*
	
		Strategy: 
			spell-check the visible area first, then the rest in the background ?
			
			Do not spellcheck the word we are currently typing!
			
			We might want to disable spellchecking for some files!?
	

		Place hunspell dictionaries (and .aff) in ./languages/lang_prefix/*
		
		Can be downloaded from: http://cgit.freedesktop.org/libreoffice/dictionaries/tree/
	*/
	
	var useLanguages = ["en_US", "sv_SE"]; // Add more languages by including the language prefix
	
	var cache = {}; // true for OK, false for misspelled
	var misspelled = {}; // suggested word
	
	var waitTimer;
	var isWaiting = false;
	var wordsInQueue = 0;
	var waitBeforeSpellcheckingMiddleOfWord = 1200;  // So that we do not spell-check a word that we are currently typing
	var numWorkers = 1; // How many workers to use (one for every cpu core!?)
	var worker = [];
	var workersReady = 0;
	
	editor.on("start", spellCheckerMain);
	
	function spellCheckerMain() {
		
		
		editor.addMenuItem("Toggle spell-checker", toggleSpellCheck); // Add items to the canvas context meny

		
		for(var i=0; i<numWorkers; i++) {
			loadWorker(useLanguages);
		}

	}
	
	function toggleSpellCheck() {
		global.settings.enableSpellchecker = global.settings.enableSpellchecker ? false : true;
		console.log("global.settings.enableSpellchecker=" + global.settings.enableSpellchecker);
		
		if(global.settings.enableSpellchecker) {
			// Begin spell-checking all opened files
			
			let change = "toggleSpellcheckerOn"
			let text = "";
			let index = 0;
			let row = 0;
			let col = 0;
			
			if(global.currentFile) runSpellCheck(global.currentFile, change, text, index, row, col); // Start with the file in view
			
			for(var path in global.files) {
				if(global.currentFile != global.files[path]) runSpellCheck(global.files[path], change, text, index, row, col);
			}
			
		}
		editor.hideMenu();
		}

	function allWorkersReady() {
		
		console.log("All spell-check workers ready!");
		
		editor.on("edit", runSpellCheck);
		
		editor.on("fileLoad", spellCheckFile);
		
		editor.on("mouseClick", showSpellSuggestion);
		
		console.log("All workers ready!");
		
		// Spellcheck currently opened files
		for(var file in global.files) {
			runSpellCheck(global.files[file]);
		}
	
	}


	function loadWorker(languages) {
		
		var id = worker.push(childProcess.fork("./plugin/spellcheck_worker.js", [languages.join(";")])) -1;
		
		console.log("spell-check worker " + id + "/" + worker.length + " loaded!");

		worker[id].on('message', worker_message);
		worker[id].on('error', worker_error);
		worker[id].on('exit', worker_exit);
		
		//worker[id].send("foo;test;0;0"); // Send test
		
	}
	

	function worker_message(data) {
		
		//console.log("spell-check worker data:" + data);
		
		if(data == "ready!") {
			workersReady++;
		
			if(workersReady == numWorkers) allWorkersReady();
		}
		else {
			var arr = data.split(";");
			var filePath = arr[0];
			var word = arr[1];
			var row = arr[2];
			var col = arr[3];
			var textLength = arr[4];
			var spell = arr[5]; // Added by the worker, * for correct, or a (list?) of suggestions
			
			
			var correct = (spell == "*");
			
			if(correct) {
				cache[word] = true;
			}
			else {
				// All dictionaries think it's spelled wrong
				cache[word] = false;
				misspelled[word] = spell; 
			}
			
			doSomething(filePath, correct, word, row, col, textLength);
			
			
		}
	}

	function worker_error(code) {
		console.warn("spell-check worker error:" + code);
	}

	function worker_exit(code) {
		console.error(new Error("spell-check worker exit:" + code));
	}
		
	function spellCheckFile(file) {
		runSpellCheck(file);
	}
	
	
	function showSpellSuggestion(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo) {

		if(mouseDirection != "up" || button != 2) return; // Only add suggestion on up, and right

		var file = global.currentFile;
		
		if(file) {
			file.getWordOnCaret(caret, wordOnCaret);
		}
		
		function wordOnCaret(word, start, end) {
			
			var suggestion = "";
			console.log("CLICK:" + word + " " + JSON.stringify(caret));
			
			
			if(misspelled.hasOwnProperty(word)) {
				suggestion = misspelled[word];
			}
			
			if(suggestion) {
				editor.addTempMenuItem(suggestion, replaceWord);
			}
			/*
			else {
				editor.contextMenuAddTemp("No spelling suggestion for <i>" + word + "</i>");
			}
			*/
			
			function replaceWord() {
				
				editor.hideMenu();
				
				console.log("replacing " + word + " for " + suggestion);
				
				// Move caret to the first letter
				file.moveCaretToIndex(start);
				
				// Delete the word
				for(var i=0; i<word.length; i++) {
					file.deleteCharacter(undefined, false); // false = Do not call file.change events
				}
								
				file.insertText(suggestion);
				
			}
			
		}

		
		
	}
	
	
	function runSpellCheck(file, change, text, index, row, col) {
		
		if(global.settings.enableSpellchecker === false) return;
		
		var wordDelimiters = " .,[]()=:\"<>/{}\t\n\r!*-+;_\\";
		var grid = file.grid;

		// possible change: text (insertText), insert (putCharacter), deletedSelection, line break, delete, undo-redo
		
		//console.log("change=" + change);
		
		if(change) { // Also calls on file load, but then change is undefined
			
			/*
				problem: 
					user makes a spelling mistake, then corrects it. And the correction is wrong.
				
			*/
			
			if(change=="insert") {
				// Only spell check if a wordDelimiter was inserted/deleted. 
				console.log("wordDelimiter?: " + text + " in " + wordDelimiters + " ? " + (wordDelimiters.indexOf(text) != -1));
				if(wordDelimiters.indexOf(text) == -1) { // Not a wordDelimiter
					
					clearTimeout(waitTimer);
					waitTimer = setTimeout(function() {
						runSpellCheck(file, "delete", text, index, row, col);
					}, waitBeforeSpellcheckingMiddleOfWord);
					
					isWaiting = true;
					
					return; 
				}
			}
			
			// Do not run spellcheck if a line break was inserted ... Why?
			//if(change=="linebreak") return;
			if(change=="deletedSelection") return;
			if(change=="undo-redo") return;
			

			// clear text decoration from current line
			for(var x = 0; x < grid[row].length; x++) {
				grid[row][x].decoration.redWave = false;
			}
			
			if(change=="insert" || change=="delete") {
				// Only spellcheck the current line
				checkRow(grid[row]);
				return;

			}
			
		}
		
		clearTimeout(waitTimer);
		isWaiting = false;
		
		// Run on visible rows
		//for(var row = Math.max(0, file.startRow); row < Math.min(grid.length, file.startRow+global.view.visibleRows); row++) {
		
		console.time("runSpellCheckTimer");

		for(var row = 0; row < grid.length; row++) {
			checkRow(grid[row]);
		}
		console.timeEnd("runSpellCheckTimer");
		
		function checkRow(gridRow) {

			var word = "";
			var char = "";
			
			for(var col=0; col<gridRow.length; col++) {
				
				char = gridRow[col].char;
				
				if(wordDelimiters.indexOf(char) != -1) {
					testWord(word);
					word="";
				}
				else {
					word = word.concat(char);
					//console.log("word now:" + word);
				}
				
			}
			
			testWord(word); // If it's the only word on the line
			
			
			function testWord(word) {
				
				var lastUpper = 0;
				var part = "";
				var firstChar = word.substr(0, 1);
				var lastChar = word.substr(word.length-1, 1);
				var cp = 0;
				
				if(firstChar == "'" && lastChar == "'") {
					word = word.substring(1, word.length-1);
					cp = -1;
				}
				
				var ignoreTogether = "'"; // Letters to ignore if they are uppercase
				
				if(word.length > 0) {
					// Break up camelCasing into two words
					for(var i=1; i<word.length; i++) { // Ignore first letter
						if(word[i].toUpperCase() == word[i] && ignoreTogether.indexOf(word[i]) == -1) {
							part = word.substring(lastUpper, i)
							lastUpper = i;
							if(part.length > 1) {
								//console.log("runTogether:" + part);
								spellCheck(file, part, row, col + cp - word.length + i);
							}
						}
					}
					
					if(lastUpper !== 0) {
						word = word.substring(lastUpper, word.length);
					}
					
					if(word.length > 1) spellCheck(file, word, row, col + cp);
				
				}
				else {
					//console.log("spellchecker ignoring:" + word);
				}
				//console.log("word=" + word);
				
			}
			
		}
	}
	

	
	function isNumeric(n) {
	  return !isNaN(parseFloat(n)) && isFinite(n);
	}
	
	function doSomething(filePath, correct, origWord, row, col, textLength) {
		
		var file = global.files[filePath];
		
		wordsInQueue--;
		
		if(file === undefined) {
			console.log("spellcheck: The file (" + filePath + ") is no longer opened!");
			return;
		}
		
		var grid = file.grid;
		
		if(textLength == undefined) textLength = file.text.length;
		
		if(file.text.length < textLength) {
			// Don't do any coloring if something has been removed.
			console.log("Not showing spelling error because text has been removed");
		}
		else if(!correct) { 
			//console.log("'" + origWord + "' is miss-spelled. Suggestion: " + misspelled[origWord] +" row=" + row + " col=" + col);
			
			// ### Color the grid
			var origWordLength = origWord.length;
			// col is the end-column. The range is col-origWordLength to col
				
				if(grid[row].length < col) {
				//console.log("spellcheck: The grid has changed! grid[" + row + "].length=" + grid[row].length + " col=" + col + " origWordLength=" + origWordLength + "");
					return; //
				}
				
			for(var c=col-1; c>col-origWordLength-1; c--) {
					
					grid[row][c].decoration.redWave = true;
					//grid[row][c].color="red";
					//console.log("coloring row=" + row + " col=" + c);
					
				}
				
			if(file == global.currentFile) {
				editor.renderRow(row);
					//editor.renderNeeded();
				}
				
			
		}

		//console.log("wordsInQueue=" + wordsInQueue);
		if(wordsInQueue==0) {
			editor.renderNeeded();
		}
		
			
	}
	
	function spellCheck(file, word, row, col) {
		/*
			Check if a word is spelled correctly or not. This is a very slow async function.
			
			optimization? cache words
			
			The callback function has to take into consideration that the state of the document
			might have changed when the answer is returned.
		
		*/
		
		//console.log("spellchecking:" + word);
		
		var htmlTags = ["a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo", "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "dfn", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form", "h1", "-", "h6", "head", "header", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "keygen", "label", "legend", "li", "link", "main", "map", "mark", "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "param", "pre", "progress", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp", "script", "section", "select", "small", "source", "span", "strong", "style", "sub", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "u", "ul", "var", "video", "wbr"]; // HTML 5
		var jsKeywords = ["do", "if", "in", "for", "let", "new", "try", "var", "case", "else", "enum", "eval", "null", "this", "true", "void", "with", "await", "break", "catch", "class", "const", "false", "super", "throw", "while", "yield", "delete", "export", "import", "public", "return", "static", "switch", "typeof", "default", "extends", "finally", "package", "private", "continue", "debugger", "function", "arguments", "interface", "protected", "implements", "instanceof"]; // ES6
		var fileExtensions = ["js", "htm", "css", "txt", "json"];
		var programmersAbbr = ["str", "num"];
		
		var checkedDictionaries = 0;
		var voteCorrect = 0;
		var suggestion = "";
		
		//console.time("spell-check " + word);
		
		//console.log("spell-checking:" + word);
		 
		wordsInQueue++;
		
		if(htmlTags.indexOf(word) != -1 || jsKeywords.indexOf(word) != -1 || isNumeric(word) || programmersAbbr.indexOf(word) != -1 || fileExtensions.indexOf(word) != -1) {
			doSomething(file.path, true, word, row, col); // It's spelled correct
			}
		else if(cache.hasOwnProperty(word)) {
			doSomething(file.path, cache[word], word, row, col);
		}
		else {
			
			/* 
				Tell any of the workers to spell-check the word
			*/
			
			var workerId = wordsInQueue % numWorkers;
			
			var data = file.path + ";" + word + ";" + row + ";" + col + ";" + file.text.length;
			
			//console.log("Sending data to spell-check worker " + workerId + "\ndata=" + data);
			
			worker[workerId].send(data);

		}
		
		//console.timeEnd("spell-check " + word);

	}
	

})();