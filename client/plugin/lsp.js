/*
	
	MS Language server protocol
	
	https://microsoft.github.io/language-server-protocol/specifications/specification-3-14/
	
	Having played around with Flow and javascript-typescript-langserver the conclusion is that they are not that good.
	javascript-typescript-langserver will for example not parse Node.JS modules and requires "typings".
	But then I tried npm install -g typescript-language-server and npm install -g typescript and it worked much better!
	
	Whoa. The npm typescript-language-server is very inconsistent in what it returns in completion requests,
	sometimes it returns the object properties, but sometime it throws in some global variables,
	and somtimes it returns the universe and everything.
	
	Disable other autocomplete plugins when testing:
	?lsp=true&disable_nodejsautocomplete=true&disable_builtinjsautocomplete=true
	
*/

(function() {
	"use strict";

	if(!QUERY_STRING["lsp"]) {
		console.warn("Not loading language server client!");
		return;
	}
	
	var trackedFiles = {};
	var languageServers = [];
	var lspServers = {
		"typescript-language-server": {
			bin: "/.npm-packages/bin/typescript-language-server",
			args: ["--stdio"]
		}
		/*
			
			npm i -g typescript
			npm install -g typescript-language-server
			
		*/
	}
	
	var languages = {
		javascript: lspServers["typescript-language-server"]
	}
	
	
	var completionItemKind = {
		text: 1, 
		Method: 2, 
		Function: 3, 
		Constructor: 4, 
		Field: 5, 
		Variable: 6, 
		Class: 7, 
		Interface: 8, 
		Module: 9, 
		Property: 10, 
		Unit: 11, 
		Value: 12, 
		Enum: 13, 
		Keyword: 14, 
		Snippet: 15, 
		Color: 16, 
		File: 17, 
		Reference: 18, 
		Folder: 19, 
		EnumMember: 20, 
		Constant: 21, 
		Struct: 22, 
		Event: 23, 
		Operator: 24, 
		TypeParameter: 25
	}
	
	EDITOR.plugin({
		desc: "Language server protocol",
		load: loadLSP,
		unload: unloadLSP,
		order: 1000 // Load before reopen_files.js
	});
	
	function loadLSP() {
		
		EDITOR.on("fileOpen", lspFileOpen);
		EDITOR.on("fileClose", lspFileClose);
		
		EDITOR.on("fileChange", lspFileChange);
		
		EDITOR.on("autoComplete", lspAutoComplete);
		
		CLIENT.on("lspClose", lspClose);
		
	}
	
	function unloadLSP() {
		EDITOR.removeEvent("fileOpen", lspFileOpen);
		EDITOR.removeEvent("fileClose", lspFileClose);
		
		EDITOR.removeEvent("fileChange", lspFileChange);
		
		EDITOR.removeEvent("autoComplete", lspAutoComplete);
		
		CLIENT.removeEvent("lspClose", lspClose);
		
		for(var path in trackedFiles) delete trackedFiles[path];
		
		for(var language in languageServers) stopLanguageServer(language);
		
	}
	
	function lspAutoComplete(file, wordToComplete, wordLength, gotOptions, autoCompleteCallback) {
		
		if(!trackedFiles.hasOwnProperty(file)) {
			console.log("lspAutoComplete: not tracked: " + file.path);
			return;
		}
		
		var lsp = languageServers[trackedFiles[file].language];
		
		var row = file.caret.row;
		var col = file.caret.col;
		var indentationCharactersLength = file.grid[row].indentationCharacters.length;
		
		var position = {
			line: row, 
			character: col + indentationCharactersLength
		}
		
		var options = [];
		
		console.log("lspAutoComplete: wordToComplete=" + wordToComplete + " (" + wordToComplete.length + " characters) position=" + JSON.stringify(position));
		
		lsp.req("textDocument/completion", {
			textDocument: {
				uri: trackedFiles[file].uri,
				languageId: trackedFiles[file].language,
				version: trackedFiles[file].version,
			},
			position: position
		}, function(err, resp) {
			if(err) {
				alertBox("Language server for language=" + trackedFiles[file].language + " was unable to handle completion request! Error: " + err.message + " position=" + JSON.stringify(position));
			}
			
			console.log("lspAutoComplete: textDocument/completion response: " + JSON.stringify(resp, null, 2));
			
			var items = resp.items;
			
			if(!items) {
				// Some language servers send the item is the resp
				items = resp;
				//throw new Error("No items in resp=" + JSON.stringify(resp, null, 2));
			}
			
			console.log("lspAutoComplete: Found " + items.length + " items! wordContainsDot=" + wordContainsDot);
			
			var completionsContainsDot = false;
			
			for(var i=0, completion; i<items.length; i++) {
				completion = items[i].label;
				
				if(!wordContainsDot || (wordContainsDot && items[i].kind == 5)) {
					// We only want the object members ... completionItemKind id's doesn't make sense, but the magic number 5 seems to do what we want
					options.push(completion);
				}
				
				if(completion.indexOf(".") != -1) completionsContainsDot = true;
			}
			
			console.log("lspAutoComplete: Added " + options.length + " options. completionsContainsDot=" + completionsContainsDot);
			
			console.log("lspAutoComplete: completionsContainsDot=" + completionsContainsDot + " wordToComplete=" + wordToComplete + " options=" + JSON.stringify(options));
			
			
			if(wordContainsDot && !completionsContainsDot) {
				var leftSide = wordToComplete.slice(0, wordToComplete.lastIndexOf(".") + 1);
// Assume the language server returned options for the right side of the dot
				options = options.map(function(completion) {
					return leftSide + completion;
				});
				console.log("lspAutoComplete: Added full chain to options = " + JSON.stringify(options));
			}
			
			// Filter out all options that doesn't contain the word we want to autocomplete
			options = options.filter(function(completion) {
				return (completion.indexOf(wordToComplete) == 0);
			});
			
			console.log("lspAutoComplete: Filtered options = " + JSON.stringify(options));
			
			autoCompleteCallback(options);
			
		});
		
		var wordContainsDot = (wordToComplete.indexOf(".") != -1);
		
		return {async: true};
		
	}
	
	function lspClose(obj) {
		
		console.log("lspClose: obj=" + JSON.stringify(obj));
		
		var language = obj.language;
		
		alertBox("Language server for language=" + language + " closed with code=" + obj.code);
		
		if(languageServers.hasOwnProperty(language)) {
			
for(var path in trackedFiles) {
				if( trackedFiles[path].language == language ) delete trackedFiles[path];
}

delete languageServers[language];
}
		
		console.log("lspClose: trackedFiles: " + JSON.stringify(trackedFiles));
		console.log("lspClose: languageServers: " + JSON.stringify(languageServers));

	}
	
	function startLanguageServer(language, callback) {
		
		// todo: Handle several start request. eg. when two files are opened at the same time; prevent double lsp servers.
		
		if(languages.hasOwnProperty(language)) {
			var lspServer = languages[language];
		}
		
		var lspOptions ={language: language};
		if(lspServer) {
			lspOptions.bin = lspServer.bin;
			lspOptions.args = lspServer.args;
		}
		
		CLIENT.cmd("LSP.start", lspOptions, function(err, resp) {
			if(err) {
				return callback(err);
			}
			
			console.log("startLanguageServer: resp=" + JSON.stringify(resp, null, 2));
			
			languageServers[language] = {
				req: function(method, options, callback) {
					CLIENT.cmd("LSP.req", {language: language, method: method, options: options}, function(err, resp) {
						callback(err, resp);
					});
				},
				notify: function(method, options, callback) {
					CLIENT.cmd("LSP.notify", {language: language, method: method, options: options}, function(err, resp) {
						callback(err, resp);
					});
				},
				capabilities: resp.capabilities
			};
			
			callback(null, languageServers[language]);
		});
	}
	
	function stopLanguageServer(language) {
		CLIENT.cmd("LSP.stop", {language: language}, function(err) {
			if(err) alertBox("Failed to stop language server for " + language + ": " + err.message);
			
			delete languageServers[language];
		});
	}
	
	function lspFileChange(file, type, characters, caretIndex, row, col, colIndent, endRow, endCol, endColIndent) {
		
		if(file == undefined) throw new Error("Missing file (first argument) arguments=" + JSON.stringify(arguments));
		if(type == undefined) throw new Error("Missing type (second argument) arguments=" + JSON.stringify(arguments));
		if(characters == undefined) throw new Error("Missing characters (third argument) arguments=" + JSON.stringify(arguments));
		if(caretIndex == undefined) throw new Error("Missing caretIndex (argument 4) arguments=" + JSON.stringify(arguments));
if(row == undefined) throw new Error("Missing row (argument 5) arguments=" + JSON.stringify(arguments));
if(col == undefined) throw new Error("Missing col (argument 6) arguments=" + JSON.stringify(arguments));
if(colIndent == undefined) throw new Error("Missing colIndent (argument 7) arguments=" + JSON.stringify(arguments));
if(endRow == undefined) throw new Error("Missing endRow (argument 8) arguments=" + JSON.stringify(arguments));
if(endCol == undefined) throw new Error("Missing endCol (argument 9) arguments=" + JSON.stringify(arguments));
if(endColIndent == undefined) throw new Error("Missing endColIndent (argument 10) arguments=" + JSON.stringify(arguments));
		
		if(!trackedFiles.hasOwnProperty(file)) {
			console.log("lspFileChange: not tracked: " + file.path);
			return;
		}
		
		var lsp = languageServers[trackedFiles[file].language];
		
		trackedFiles[file].version++;
		
		var text = "";
		var rangeLength = 0;
		var range = {
			start: {line: row, character: col+colIndent}
		};
		
		if(type == "removeRow") {
			range.start.character = 0;
			range.end = {line: row, character: characters.length + file.lineBreak.length};
			rangeLength = characters.length + file.lineBreak.length;
		}
		else if(type == "text") { // Text was inserted
			range.end = range.start;
			rangeLength = characters.length;
			text = characters;
		}
		else if(type == "insert") { // One character was inserted
			range.end = range.start;
			rangeLength = characters.length;
			text = characters;
		}
		else if(type == "deleteTextRange") { // Deleted a bunch of text
			range.end = {line: endRow, character: endCol+endColIndent};
			rangeLength = characters.length;
		}
		else if(type == "linebreak") { // A line break was inserted
			range.end = range.start;
			text = characters;
		}
		else if(type == "delete") { // One character was deleted
			range.end = range.start;
			rangeLength = characters.length;
		}
		else if(type == "reload") { // The file was reloaded with new text
			range.end = {line: endRow, character: endCol+endColIndent};
			text = characters;
		}
		else {
			throw new Error("Unknown file change event type=" + type);
		}
		
		var serverSupportsIncrementalUpdates = false; // LOL
		
		if(serverSupportsIncrementalUpdates) {
			var change = {
				range: range, // The range of the document that changed
				rangeLength: rangeLength, //  The length of the range that got replaced
				text: text // The new text of the range/document
			};
		}
		else {
			var change = {
				text: file.text
			};
		}
		
		lsp.notify("textDocument/didChange", {
			textDocument: {
				uri: trackedFiles[file].uri,
				languageId: trackedFiles[file].language,
				version: trackedFiles[file].version,
			},
			contentChanges: [change]
			
		}, function(err, resp) {
			if(err) {
				alertBox("Language server for language=" + trackedFiles[file].language + " was unable to handle didChange request! Error: " + err.message + " change: type=" + type + " range=" + JSON.stringify(range, null, 2));
			}
			console.log("textDocument/didOpen response: " + JSON.stringify(resp));
		});
		
	}
	
	function lspFileClose(file) {
		
		if(!trackedFiles.hasOwnProperty(file)) return;
		
		var lsp = languageServers[trackedFiles[file].language];
		
		lsp.notify("textDocument/didClose", {
			textDocument: {
				uri: trackedFiles[file].uri,
				languageId: trackedFiles[file].language,
				version: trackedFiles[file].version
			}
		}, function(err, resp) {
			if(err) throw err;
			console.log("textDocument/didClose response: " + JSON.stringify(resp));
		});
		
		delete trackedFiles[file];
	}
	
	function lspFileOpen(file) {
		
		// Note: Use the language-id specified by LSP protocol. eg. javascript for JavaScript and php for PHP
		
		// Detect language
		var ext = UTIL.getFileExtension(file.path);
		if(ext == "js") {
			var language = "javascript";
			
		}
		else {
			console.warn("Unknow lanugage: ext=" + ext + " path=" + file.path);
			return;
		}
		
		// LSP wants all files to have a version, which is incremented on all changes
		trackedFiles[file] = {
			uri: uriPath(file.path),
			language: language,
			version: 0
		};
		
		if(languageServers.indexOf(language) == -1) startLanguageServer(language, lspServerStarted);
		else lspServerStarted(null, languageServers[language]);
		
		function lspServerStarted(err, lsp) {
			if(err) {
alertBox("Unable to start the language server for language=" + language + " Error: " + err.message);
				
				delete trackedFiles[file];
				
				return;
			}
			
			lsp.notify("textDocument/didOpen", {
				textDocument: {
					uri: trackedFiles[file].uri,
					languageId: trackedFiles[file].language,
					version: trackedFiles[file].version,
					text: file.text
				}
			}, function(err, resp) {
				if(err) {
					alertBox("Language server for language=" + language + " was unable to handle didOpen request! Error: " + err.message);
				}
				
				console.log("textDocument/didOpen response: " + JSON.stringify(resp));
			});
			
		}
		
	}
	
	function uriPath(path) {
		if(path.indexOf("://") == -1) return "file://" + path;
		else return path;
	}
	
})();


