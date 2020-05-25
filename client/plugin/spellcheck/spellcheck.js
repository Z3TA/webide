
(function() {
	/*
		todo: A way to abort the spell-checker when text is removed!?
		
	*/
	"use strict";
	
	EDITOR.plugin({
		desc:  "Spellcheck",
		load: loadSpellchecker,
		unload: unloadSpellchecker,
	});
	
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
	var maxConcurrency = 5;
	var waitlist = [];
	
	var waitBeforeSpellcheckingMiddleOfWord = 1200;  // So that we do not spell-check a word that we are currently typing
	var menuItem;
	var enabled = false;
	var windowMenuSpellcheck;
	
	// Don't spell-check these:
	var htmlTags = ["tspan", "rect", "svg", "defs", "a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo", "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "dfn", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form", "h1", "-", "h6", "head", "header", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "keygen", "label", "legend", "li", "link", "main", "map", "mark", "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "param", "pre", "progress", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp", "script", "section", "select", "small", "source", "span", "strong", "style", "sub", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "u", "ul", "var", "video", "wbr"]; // HTML 5
	var jsKeywords = ["do", "if", "in", "for", "let", "new", "try", "var", "case", "else", "enum", "eval", "null", "this", "true", "void", "with", "await", "break", "catch", "class", "const", "false", "super", "throw", "while", "yield", "delete", "export", "import", "public", "return", "static", "switch", "typeof", "default", "extends", "finally", "package", "private", "continue", "debugger", "function", "arguments", "interface", "protected", "implements", "instanceof"]; // ES6
	var fileExtensions = ["js", "htm", "css", "txt", "json"];
	var programmersAbbr = ["onerror", "png", "gfx", "onclick", "onload", "src", "@media", "nowrap", "charset", "lang", "rx", "ry", "cx", "cy", "rgba", "url", "xmlns", "xlink", "&raquo", "&laquo", "&nbsp", "stringify", "str", "num", "refactor", "refactoring", "substr", "substring", "undefined", "href", "async", "chroot"];
	var regexIgnore = [/^\d+(em|px)$/, /^#?([A-Fa-f0-9]{1,6})$/, /^\d+.{1,6}/];
	
var suggestWord = null; // Used to prevent double lookups

	var progressBar = document.createElement("progress");
	progressBar.setAttribute("title", "spellcheck");
	var totalRequests = 0;
	var totalResponses = 0;
	progressBar.max = totalRequests;
	progressBar.value = totalResponses;
	
	function loadSpellchecker() {
		
		menuItem = EDITOR.ctxMenu.add(S("Spellcheck"), toggleSpellCheck, 10);
		windowMenuSpellcheck = EDITOR.windowMenu.add(S("Spellcheck"), [S("Tools"), 2], toggleSpellCheck);
		
		CLIENT.on("loginSuccess", loadDictionaries);
		
		EDITOR.registerAltKey({char: "0", alt:2, label: S("Spell"), fun: toggleSpellCheck});
		
		EDITOR.on("ctxMenu", spellcheckWordOnCaret);
		
	}
	
	function loadDictionaries(login) {
		CLIENT.cmd("spellcheck.languages", useLanguages, function(err, dictsLoaded) {
			// Can populate err even if some dictionaries succeeded!
			
			if( (typeof dictsLoaded == "number" && dictsLoaded == 0) || (err && err.code == "MODULE_MISSING")) {
				console.warn("All dictionaries failed to load. Unloading the spellcheker plugin");
				EDITOR.disablePlugin("Spellcheck");
			}
			else if(err) {
				// Other (unexpected) error
				alertBox("Failed to load spellcheck dictionaries " + JSON.stringify(useLanguages) + ": " + err.message);
			}
			
		});
	}
	
	function unloadSpellchecker() {
		disable(true);
		EDITOR.ctxMenu.remove(menuItem);
		EDITOR.windowMenu.remove(windowMenuSpellcheck);
		EDITOR.unregisterAltKey(toggleSpellCheck);
		
		EDITOR.removeEvent("ctxMenu", spellcheckWordOnCaret);
	}
	
	function spellcheckWordOnCaret(file, combo, caret, target) {
		if(!file) return ALLOW_DEFAULT;
		
		if(target.id != "editorCanvas") return;
		
		var caretAt = file.wordAtCaret(caret);
		var word = caretAt.word;
		
		if(word.length == 0) return ALLOW_DEFAULT;
		
if( UTIL.containsEmoji(word) ) return ALLOW_DEFAULT;

		if(suggestWord == word) return; // Prevent double lookups when double clicking
		
		suggestWord = word;
		
		CLIENT.cmd("spellcheck.check", {word: word}, function(err, spell) {
			if(err) {
// These errors can be annoying and are not that important, so lets swallow them
console.error(err);
				//alertBox(err.message);
				return;
			}
			
			if(suggestWord != word) {
				// The user has clicked again somewhere else. If we add another temp context menu item the Editor will complain
				return;
			}
			
			suggestWord = null;
			
			if(spell.suggestion) {
				
				var li = EDITOR.ctxMenu.addItem({text: spell.suggestion, temp: true, callback: insertSpellSuggestion, separator: true, order: 2});
				//alertBox(li.getAttribute("position"));
				/*
					var caption = document.createElement("span");
					caption.classList.add("inlineCaption");
					caption.innerText = "sugg: "
					//li.insertBefore(caption, li.firstChild);
					li.replaceChild(caption, li.firstChild);
				*/
				li.title = "Spellcheck suggestion";
				li.classList.add("notransform");
			}

			
			function insertSpellSuggestion() {
				var start = caret.index - caretAt.left.length;
				var end = caret.index + caretAt.right.length - 1;
				
				console.log("spellcheckWordOnCaret: start=" + start + " end=" + end + " caretAt.left=" + caretAt.left + " caretAt.right=" + caretAt.right);
				
				var deletedStr = file.deleteTextRange(start, end);
				console.log("spellcheckWordOnCaret: deletedStr=" + UTIL.lbChars(deletedStr));
				
				file.moveCaretToIndex(start, caret);
				file.insertText(spell.suggestion, caret);
				
			}
		});
		
		
	}
	
	function toggleSpellCheck() {
		
		console.log("Currently enabled=" + enabled);
		
		enabled = enabled ? false : true;
		
		console.log("Change status to enabled=" + enabled);
		
		EDITOR.ctxMenu.update(menuItem, enabled, S("Spellcheck"));
		EDITOR.windowMenu.update(windowMenuSpellcheck, {active: enabled});
		
		
		if(enabled) enable();
		else disable();
		
		EDITOR.ctxMenu.hide();
	}
	
	function enable() {
		
		EDITOR.removeEvent("ctxMenu", spellcheckWordOnCaret);
		
		// Begin spell-checking all opened files
		
		var change = "toggleSpellcheckerOn"
		var text = "";
		var index = 0;
		var row = 0;
		var col = 0;
		
		if(EDITOR.currentFile) runSpellCheck(EDITOR.currentFile, change, text, index, row, col); // Start with the file in view
		
		for(var path in EDITOR.files) {
			if(EDITOR.currentFile != EDITOR.files[path]) runSpellCheck(EDITOR.files[path], change, text, index, row, col);
		}
		
		EDITOR.on("fileChange", runSpellCheck);
		EDITOR.on("fileOpen", spellCheckFile);
		
		EDITOR.on("ctxMenu", showSpellSuggestion);
		
		showProgressBar();
		
		enabled = true;
		
	}
	
	function disable(unloading) {
		enabled = false;
		
		if(!unloading) EDITOR.on("ctxMenu", spellcheckWordOnCaret);
		
		EDITOR.removeEvent("fileChange", runSpellCheck);
		EDITOR.removeEvent("fileOpen", spellCheckFile);
		EDITOR.removeEvent("ctxMenu", showSpellSuggestion);
		
		// clear text decorations
		for(var filePath in EDITOR.files) clearFile(EDITOR.files[filePath])
		
		function clearFile(file) {
			if(file.grid == undefined) return;
			
			for(var row = 0; row < file.grid.length; row++) {
				for(var col = 0; col < file.grid[row].length; col++) {
					file.grid[row][col].wave = false;
				}
			}
		}
		
		hideProgressBar();
		
		wordsInQueue = 0;
		totalRequests = wordsInQueue;
		totalResponses = 0;
		
		progressBar.max = 1;
		progressBar.value = 0;
		
		waitlist = []; // Throw away the last waitList

		EDITOR.renderNeeded();
	}
	
	function hideProgressBar() {
		var footer = document.getElementById("footer");
		if(footer.contains(progressBar)) {
			footer.removeChild(progressBar);
			EDITOR.resizeNeeded();
		}
	}
	
	function showProgressBar() {
		var footer = document.getElementById("footer");
		if(!footer.contains(progressBar)) {
 footer.appendChild(progressBar);
			EDITOR.resizeNeeded(); // To show the progress bar
		}
	}
	
	function spellCheckFile(file) {
		runSpellCheck(file);
	}
	
	function showSpellSuggestion(file, combo, caret, target) {
		
if(target.className != "fileCanvas") return;
		
		console.log("showSpellSuggestion: file.path=" + file.path + " caret=" + JSON.stringify(caret) + " ");
		
		//var caret = EDITOR.mousePositionToCaret(posX, posY);
		
if(caret.eol) return true;

		var markedAsMisspelled = file.grid[caret.row][caret.col].wave;
		
		if(file) {
			file.getWordOnCaret(caret, wordOnCaret);
		}
		
		return true;
		
		function wordOnCaret(word, start, end) {
			
			var suggestion = "";
			console.log("showSpellSuggestion: wordOnCaret: word=" + word + " caret=" + JSON.stringify(caret));
			
			if(!word) {
				console.warn("showSpellSuggestion: wordOnCaret: No word on caret!");
				return;
			}
			
			if(misspelled.hasOwnProperty(word)) {
				suggestion = misspelled[word];
			}
			else {
				console.log("showSpellSuggestion:wordOnCaret: word=" + word + " not in misspelled=" + Object.keys(misspelled))
			}
			
			if(suggestion) {
				console.log("showSpellSuggestion:wordOnCaret: suggestion=" + suggestion);
				EDITOR.ctxMenu.addItem({text: suggestion, callback: replaceWord, temp: true, order: 1, separator: true});
				
				
			}
			else if(markedAsMisspelled) {
				console.log("showSpellSuggestion:wordOnCaret: No spell suggestion found!");
				EDITOR.ctxMenu.addItem({text: "No spelling suggestion for <i>" + word + "</i>", temp: true, order: 1, separator: true});
				}
			
			
			function replaceWord() {
				EDITOR.ctxMenu.hide();
				
				console.log("replacing " + word + " for " + suggestion);
				
				// Move caret to the first letter
				file.moveCaretToIndex(start);
				
				// Delete the word
				file.deleteTextRange(start, start + word.length - 1);
				
				file.insertText(suggestion);
				
				/*
					console.log("waves yo? start=" + start + " suggestion.length=" + suggestion.length);
					for(var i=start, pos; i<start+suggestion.length; i++) {
					pos = file.rowFromIndex(i);
					console.log("i=" + i + " row=" + pos.row + " col=" + pos.col + " char=" + file.text.charAt(i) + " wave=" + file.grid[pos.row][pos.col].wave);
					}
				*/
				
				EDITOR.renderNeeded();
				
				EDITOR.stat("spellcheck_correct_suggested");
			}
		}
	}
	
	function runSpellCheck(file, change, text, index, row, col) {
		
		console.log("runSpellCheck file.path=" + file.path + " change=" + change);
		
		var wordDelimiters = " .,[]()=:\"<>/{}\t\n\r!*-+;_\\";
		var grid = file.grid;
		
		// possible change: text (insertText), insert (putCharacter), deleteCharacter, line break, delete, undo-redo
		
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
			if(change=="undo-redo") return;
			
			
			// clear text decoration from current line
			for(var x = 0; x < grid[row].length; x++) {
				grid[row][x].wave = false;
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
		//for(var row = Math.max(0, file.startRow); row < Math.min(grid.length, file.startRow+EDITOR.view.visibleRows); row++) {
		
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
				
				if( UTIL.containsEmoji(word) ) return;
				
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
	
	function spellingError(filePath, origWord, row, col, textLength) {
		var file = EDITOR.files[filePath];
		
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
		else { 
			//console.log("'" + origWord + "' is miss-spelled. Suggestion: " + misspelled[origWord] +" row=" + row + " col=" + col);
			
			// ### Color the grid
			var origWordLength = origWord.length;
			// col is the end-column. The range is col-origWordLength to col
			
			if(grid[row].length < col) {
				//console.log("spellcheck: The grid has changed! grid[" + row + "].length=" + grid[row].length + " col=" + col + " origWordLength=" + origWordLength + "");
				return; //
			}
			
			for(var c=col-1; c>col-origWordLength-1; c--) {
				
				grid[row][c].wave = true;
				//grid[row][c].color="red";
				//console.log("coloring row=" + row + " col=" + c);
				
			}
			
			if(file == EDITOR.currentFile) {
				// We only need to render if the row is visible on the screen
				if(file.rowVisible(row)) { 
					EDITOR.renderNeeded();
					//EDITOR.renderRow(row);
				}
			}
		}
	}
	
	function spellCheck(file, word, row, col, fromQueue) {
		if(!enabled) return;
		
		/*
			Check if a word is spelled correctly or not. This is a very slow async function.
			
			optimization? cache words
			
			The callback function has to take into consideration that the state of the document
			might have changed when the answer is returned.
			
		*/
		
		//console.log("spell-checking:" + word);
		
		var checkedDictionaries = 0;
		var voteCorrect = 0;
		var suggestion = "";
		
		//console.time("spell-check " + word);
		
		//console.log("spell-checking:" + word);
		
		for (var i=0; i<regexIgnore.length; i++) {
			if(word.match(regexIgnore[i])) return;
		}
		
		
		if(htmlTags.indexOf(word) != -1 || jsKeywords.indexOf(word) != -1 || UTIL.isNumeric(word) || programmersAbbr.indexOf(word) != -1 || fileExtensions.indexOf(word) != -1) {
			//doSomething(file.path, true, word, row, col); // It's spelled correct
		}
		else if(cache.hasOwnProperty(word)) {
			if(cache[word] == false) spellingError(file.path, word, row, col);
			if(fromQueue) totalResponses++;
		}
		else {
			
			totalRequests++; // Include words in queue
			
			/*
				Because of the maxConcurrency, the progress bar is not that useful.
				So make the progress bar include words that are in queue.
				
				problem: Once the word in the queue is processed, it might have been cached! 
				solution: Add a fromQueue flag, and increment responses even when the word is cached.
				
			*/
			
			if(wordsInQueue >= maxConcurrency) {
				waitlist.push([file, word, row, col, true]);
			}
			else {
				wordsInQueue++;
				
			CLIENT.cmd("spellcheck.check", {word: word}, function(err, spell) {
					if(!enabled) return;
					
					totalResponses++;
					
					progressBar.max = totalRequests;
					progressBar.value = totalResponses;
					
					if(totalRequests == totalResponses) {
						hideProgressBar();
					}
					else {
						showProgressBar();
					}
				
				if(err) {
					alertBox("Failed to spellcheck word=" + word + " Error: " + err.message);
					return;
				}
				
				if(spell == undefined) throw new Error("Did not get a spell object from spellcheck.check word=" + word);
				
				if(spell.correct) {
					cache[word] = true;
				}
				else {
					// All dictionaries think it's spelled wrong
					cache[word] = false;
					misspelled[word] = spell.suggestion;
					
					spellingError(file.path, word, row, col, file.text.length);
				}
				
				wordsInQueue--;
				//console.log("wordsInQueue=" + wordsInQueue);
				if(wordsInQueue==0) {
						//totalRequests = 0;
						//totalResponses = 0;
					EDITOR.renderNeeded();
				}
					
					if(waitlist.length > 0) {
						while(waitlist.length > 0 && wordsInQueue < maxConcurrency) {
							spellCheck.apply(null, waitlist.shift());
						}
					}
					
				});
			}
		}
		
		progressBar.max = totalRequests;
		progressBar.value = totalResponses;
		
		//console.timeEnd("spell-check " + word);
	}
	
})();