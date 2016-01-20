
(function() {

	"use strict";
	
	if(global.settings.enableSpellchecker===false) return;
	
	if(!Nodehun) return; // Notehun is required for this plugin to work!
	
	if(global.settings.enableSpellchecker===undefined) {
		// Add ourself to settings
		global.settings.enableSpellchecker = true;
	}
	
	/*
	
		Strategy: 
			spell-check the visible area first, then the rest in the background ?
			
			Do not spellcheck the word we are currently typing!
			
			
		We might want to disable spellchecking for some files!?
			
	
	*/
	
	/*
		Place hunspell dictionaries (and .aff) in ./languages/lang_prefix/*
		
		Can be downloaded from: http://cgit.freedesktop.org/libreoffice/dictionaries/tree/
	*/
		
	var useLanguages = ["en_US", "sv_SE"]; // Add more languages by including the language prefix
	
	var dict = [];
	var cache = {}; // true for OK, false for misspelled
	var misspelled = {}; // suggested word
	
	var waitTimer;
	var isWaiting = false;
	var wordsInQueue = 0;
	var waitBeforeSpellcheckingMiddleOfWord = 1200;  // So that we do not spell-check a word that we are currently typing
	var numDictionaries = 0;
	var languagesLoaded = 0;
	
	editor.on("start", spellCheckerMain);
	
	function spellCheckerMain() {
		
		for(var i=0; i<useLanguages.length; i++) {
			loadDictionary(useLanguages[i]);
		}
		
		/*
		var english = "./languages/en_US/en_US";
		var swedish = "./languages/sv_SE/sv_SE";
		
		// Read the dictionary files (can be slow!)
		var affbuf1 = fs.readFileSync(swedish + ".aff");
		var affbuf2 = fs.readFileSync(english + ".aff");

		var dictbuf1 = fs.readFileSync(swedish + ".dic");
		var dictbuf2 = fs.readFileSync(english + ".dic");
		
		// Create dictionary
		
		dict.push(new Nodehun(affbuf1,dictbuf1));
		dict.push(new Nodehun(affbuf2,dictbuf2));

		numDictionaries = dict.length;
		*/
		
		
		
		/* Add second language
		dict.addDictionary(dictbuf2,function(err){
			if(err) throw err;            
		});
		*/
		

		function allDictionariesLoaded() {
			// All dictionaries has loaded: now add event listeners.
			
			numDictionaries = dict.length;
			
			editor.on("edit", runSpellCheck);
			
			editor.on("fileLoad", spellCheckFile);
			
			editor.on("mouseClick", showSpellSuggestion);
			
			console.log("All dictionaries loaded! numDictionaries=" + numDictionaries);
				
			// Spellcheck currently opened files
			for(var file in global.files) {
				runSpellCheck(global.files[file]);
			}
		
		}


		function loadDictionary(lang) {
			
			// Async load the .aff and .dic files. Then create a dictionary
			
			var affBuffer;
			var dictBuffer;
			var gotAff = false;
			var gotDict = false;
			
			editor.readFromDisk("./languages/" + lang + "/" + lang + ".aff", readAff, true);  // true = return buffer
			editor.readFromDisk("./languages/" + lang + "/" + lang + ".dic", readDict, true);
			
			function readAff(path, buffer) {
				affBuffer = buffer;
				gotAff = true;
				
				if(gotAff && gotDict) gotAll();
			}
			
			function readDict(path, buffer) {
				dictBuffer = buffer;
				gotDict = true;
				
				if(gotAff && gotDict) gotAll();
			}
			
			function gotAll() {
				/*
					We have both the aff and dict content!
					Create the dictionary:
				*/
				
				dict.push(new Nodehun(affBuffer,dictBuffer));
				
				console.log("BEFORE languagesLoaded=" + languagesLoaded + " / " + useLanguages.length);
				
				languagesLoaded++; // WTF, why can't I put this inside the if ???
				
				if(languagesLoaded == useLanguages.length) {
					console.log("IN languagesLoaded=" + languagesLoaded + " / " + useLanguages.length);

					allDictionariesLoaded();
				}
				
				console.log("AFTER languagesLoaded=" + languagesLoaded + " / " + useLanguages.length);
				
			}
			
		}
		
		
	}
	
	function spellCheckFile(file) {
		runSpellCheck(file);
	}
	
	
	function showSpellSuggestion(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo) {

		if(mouseDirection != "up" || button != 2) return; // Only add suggestion on up, and right

		var file = global.currentFile;
		
		file.getWordOnCaret(caret, wordOnCaret);
		
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
		
		var wordDelimiters = " .,[]()=:\"<>/{}\t\n\r!*-+;_\\";
		var htmlTags = ["a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo", "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "dfn", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form", "h1", "-", "h6", "head", "header", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "keygen", "label", "legend", "li", "link", "main", "map", "mark", "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "param", "pre", "progress", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp", "script", "section", "select", "small", "source", "span", "strong", "style", "sub", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "u", "ul", "var", "video", "wbr"]; // HTML 5
		var jsKeywords = ["do", "if", "in", "for", "let", "new", "try", "var", "case", "else", "enum", "eval", "null", "this", "true", "void", "with", "await", "break", "catch", "class", "const", "false", "super", "throw", "while", "yield", "delete", "export", "import", "public", "return", "static", "switch", "typeof", "default", "extends", "finally", "package", "private", "continue", "debugger", "function", "arguments", "interface", "protected", "implements", "instanceof"]; // ES6
		
		var grid = file.grid;
		

		// possible change: text (insertText), insert (putCharacter), deletedSelection, linebreak, delete, undo-redo
		
		console.log("change=" + change);
		
		
		
		if(change) { // Also calls on file load
			
			/*
			
				problem: 
			user makes a spelling mistake, then corrects it. And the correction is wrong.
			
			
			*/
			
			
			if(change=="insert") {
				// Only spellcheck if a wordDelimiter was inserted/deleted. 
				console.log("HOPPLA: " + text + " in " + wordDelimiters + " ? " + (wordDelimiters.indexOf(text) != -1));
				if(wordDelimiters.indexOf(text) == -1) { // Not a wordDelimiter
					
					clearTimeout(waitTimer);
					waitTimer = setTimeout(function() {
						runSpellCheck(file, "delete", text, index, row, col);
					}, waitBeforeSpellcheckingMiddleOfWord);
					
					isWaiting = true;
					
					return; 
				}
			}
			
			
			// Do not run spellcheck if a line break was inserted
			if(change=="linebreak") return;
			if(change=="deletedSelection") return;
			if(change=="undo-redo") return;
			

			// clear text decoration from current line
			for(var x = 0; x < grid[row].length; x++) {
				grid[row][x].decoration.redWave = false;
			}
			global.render = true;

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
		
		console.time("runSpellCheck");

		for(var row = 0; row < grid.length; row++) {
			checkRow(grid[row]);
		}
		console.timeEnd("runSpellCheck");
		
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
				
				var ignoreTogether = "'"; // Letters to ignore if they are uppercase
				
				if(word.length > 0 && htmlTags.indexOf(word) == -1 && jsKeywords.indexOf(word) == -1 && !isNumeric(word) ) {
					
					
					
					// Break up camelCasing into two words
					for(var i=1; i<word.length; i++) { // Ignore first letter
						if(word[i].toUpperCase() == word[i] && ignoreTogether.indexOf(word[i]) == -1) {
							part = word.substring(lastUpper, i)
							lastUpper = i;
							if(part.length > 1) {
								console.log("runTogether:" + part);
								spellCheck(file, part, doSomething, row, col - word.length + i);
							}
						}
					}
					
					if(lastUpper !== 0) {
						word = word.substring(lastUpper, word.length);
					}
					
					if(word.length > 1) spellCheck(file, word, doSomething, row, col);
					
					
					
				
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
	
	function doSomething(file, correct, origWord, row, col) {
		var grid = file.grid;
		
		wordsInQueue--;
		
		if(!correct) {
			console.log("'" + origWord + "' is miss-spelled. Suggestion: " + misspelled[origWord]);
			colorGrid(row, col, origWord.length);
		}

		console.log("wordsInQueue=" + wordsInQueue);
		if(wordsInQueue==0) {
			editor.render();
		}
			
		function colorGrid(row, col, length) {
			
			for(var c=col-1; c>col-length-1; c--) {
				if(grid[row].length >= c-1) {
					grid[row][c].decoration.redWave = true;
					//grid[row][c].color="red";
					//console.log("coloring row=" + row + " col=" + c);
				}

			}
			
			global.render = true;
			
		}
			
	}
	
	function spellCheck(file, word, callback, row, col) {
		/*
			Check if a word is spelled correctly or not. This is a very slow async function.
			
			optimization? cache words
			
			The callback function has to take into consideration that the state of the document
			might have changed when the answer is returned.
		
		*/
		
		var checkedDictionaries = 0;
		var voteCorrect = 0;
		var suggestion = "";
		
		//console.time("spellcheck " + word);
		
		console.log("spellchecking:" + word);
		
		wordsInQueue++;
		
		if(cache.hasOwnProperty(word)) {
			callback(file, cache[word], word, row, col);
		}
		else {
			
			/* 
				Run the word through all dictionaries ...
				The word is considered corret if either of them think it's correct.
			*/
			
			for(var i=0; i<numDictionaries; i++) {
				dict[i].spellSuggest(word, spellAnswer);
				//dict.isCorrect(word, spellAnswer);
			}
			

		}
		
		//console.timeEnd("spellcheck " + word);
		
		function spellAnswer(err, correct, sugg, origWord){
			
			if(err) console.error(err);
			
			checkedDictionaries++;
			
			if(correct) {
				voteCorrect++;
			}
			else if(sugg && !suggestion) { // sugg is either a string or null
				suggestion = sugg;
			}
			
			if(checkedDictionaries == numDictionaries) {
				// All directores has been checked!
				
				if(voteCorrect > 0) {
					// At least one dictionary think it's correct
					cache[word] = true;
					correct = true;
				}
				else {
					// All dictionaries think it's spelled wrong
					cache[word] = false;
					misspelled[word] = suggestion; 
				}

				callback(file, correct, origWord, row, col);
			}

		}
	}
	

})();