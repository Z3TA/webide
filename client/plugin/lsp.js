/*
	
	MS Language server protocol
	
	https://microsoft.github.io/language-server-protocol/specifications/specification-3-14/
	
*/

(function() {
	"use strict";

	if(!QUERY_STRING["lsp"]) {
		console.warn("Not loading language server client!");
		return;
	}
	
	var trackedFiles = {};
	var languageServers = [];
	
	EDITOR.plugin({
		desc: "Language server protocol",
		load: loadLSP,
		unload: unloadLSP
	});
	
	function loadLSP() {
		
		EDITOR.on("fileOpen", lspFileOpen);
		EDITOR.on("fileClose", lspFileClose);
		
		EDITOR.on("fileChange", lspFileChange);
		
	}
	
	function unloadLSP() {
		EDITOR.removeEvent("fileOpen", lspFileOpen);
		EDITOR.removeEvent("fileClose", lspFileClose);
		
		EDITOR.removeEvent("fileChange", lspFileChange);
		
		for(var path in trackedFiles) delete trackedFiles[path];
		
		for(var language in languageServers) stopLanguageServer(language);
		
	}
	
	function startLanguageServer(language, callback) {
		CLIENT.cmd("LSP.start", {language: language}, function(err) {
			if(err) {
				return callback(err);
			}
			
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
				}
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
	
	function lspFileChange(file, type, characters, caretIndex, row, col, endRow, endCol) {
		
		if(!trackedFiles.hasOwnProperty(file)) {
			console.log("lspFileChange: not tracked: " + file.path);
			return;
		}
		
		var lsp = languageServers[trackedFiles[file].language];
		
		trackedFiles[file].version++;
		
		var text = "";
		var rangeLength = 0;
		var indentLength = file.grid[row].indentationCharacters.length;
		var range = {
			start: {line: row, character: col+indentLength}
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
			range.end = {line: endRow, character: endCol};
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
			range.end = {line: endRow, character: endCol};
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
			if(err) return alertBox("Unable to start the language server for language=" + language + " Error: " + err.message);
			
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


