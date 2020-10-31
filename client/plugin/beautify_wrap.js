/*
	
	
	When is wrapping single paragraphs/functions useful!?
	When you are on a small screen and want to make the code fit!?
	
	Both js-beautify and prettify sucks, but js-beautify sucks a little less...
	
	
*/

(function() {
	"use strict";

	var DEPS = ["../js-beautify.1.10.2/beautify.js", "../js-beautify.1.10.2/beautify-html.js"];
	var DEPENDENCIES_LOADED = false;
	
	var winMenuBeautify;
	
	var defaultSettings = {
		"indent_size": 4,
		"indent_char": " ",
		"indent_with_tabs": false,
		"editorconfig": false,
		"eol": "\n",
		"end_with_newline": false,
		"indent_level": 0,
		"preserve_newlines": true,
		"max_preserve_newlines": 10,
		"space_in_paren": false,
		"space_in_empty_paren": false,
		"jslint_happy": false,
		"space_after_anon_function": false,
		"space_after_named_function": false,
		"brace_style": "collapse",
		"unindent_chained_methods": false,
		"break_chained_methods": false,
		"keep_array_indentation": false,
		"unescape_strings": false,
		"wrap_line_length": 0,
		"e4x": false,
		"comma_first": false,
		"operator_position": "before-newline",
		"indent_empty_lines": false,
		"templating": ["auto"]
	};
	
	EDITOR.plugin({
		desc: "Format JS using js-beautify",
		load: function loadJSbeautifyTextWrapper() {
			
			EDITOR.bindKey({desc: S("save_current_file"), key: "B", combo: CTRL + SHIFT, fun: beautify});
			
			EDITOR.bindKey({desc: "Paste beautified", key: "V", combo: CTRL + SHIFT, fun: pasteBeautified});
			
			winMenuBeautify = EDITOR.windowMenu.add(S("js_beautify"), [S("Tools"), 7], beautify);
			
			EDITOR.on("wrapText", wrapJavaScriptTool);
			
			EDITOR.on("ctxMenu", wrapJsMaybe);
			
		},
		unload: function unloadJSbeautifyTextWrapper() {
			
			EDITOR.unbindKey(beautify);
			EDITOR.unbindKey(pasteBeautified);

			EDITOR.windowMenu.remove(winMenuBeautify);
			
			EDITOR.removeEvent("ctxMenu", wrapJsMaybe);
			EDITOR.removeEvent("wrapText", wrapJavaScriptTool);

		}
	});
	
	function isJS(file) {
		var ext = UTIL.getFileExtension(file.path);
		return ext.toLowerCase() == "js" || (file.parsed && file.parsed.language=="JS");
	}
	
	function isHTML(file) {
		var ext = UTIL.getFileExtension(file.path);
		return ext.toLowerCase().slice(0,3) == "htm";
	}
	
	function wrapJsMaybe(file, combo, caret, target) {
		if(!file) return;
		if(file.text == undefined) return;
		if(target.className != "fileCanvas") return;
if(!isJS(file)) return;

		var row = caret.row;
		
		if(row < 0) return;
		if(row >= file.grid.length) return;
		
		console.log("beautify: row=" + row + " file.grid[" + row + "].length=" + file.grid[row].length + " EDITOR.view.visibleColumns=" + EDITOR.view.visibleColumns);
		
		if(file.grid[row].length < EDITOR.view.visibleColumns) return;
		else {
console.log("beautify: file.grid[row].length=" + file.grid[row].length + " < EDITOR.view.visibleColumns=" + EDITOR.view.visibleColumns);
		}
		
		var scriptMenuItem = EDITOR.ctxMenu.addTemp("Wrap code block", true, wrapJsAt);
		
		function wrapJsAt() {
			jsWrap(file, row);
			EDITOR.ctxMenu.hide();
		}
		
	}
	
	function wrapJavaScriptTool(file, combo) {
		console.log("beautify: wrapJavaScriptTool: file=" + file.path);
		var allowDefault = jsWrap(file, file.caret.row);
		if(allowDefault) return false;
		else return true; // Prevents other wrap tools
	}
	
	function jsWrap(file, initRow) {
		console.log("beautify: jsWrap: file=" + file.path);

		if(!isJS(file)) {
			console.log("beautify: Not a JavaScript file: " + file.path);
			return true;
		}
		
		var startRow = initRow;
		var startIndentation = file.grid[startRow].indentation;
		for(var row = startRow; row < file.grid.length; row++) {
			if(file.grid[row].length == 0 && file.grid[row].indentation == startIndentation) break;
			else {
				console.log("beautify: jsWrap: startRow=" + startRow + " including row=" + row);
			}
		}
		var endRow = row-1;
		
		wrap(file, startRow, endRow);
		
		return false;
	}
	
	function wrap(file, startRow, endRow) {
		
		console.log("beautify: wrap: startRow=" + startRow + " endRow=" + endRow);
		
		var settings = {
			indent_size: 0, // file.indentation.length,
			indent_char: file.indentation.charAt(0),
			indent_with_tabs: (file.indentation == "\t"),
			eol: file.lineBreak,
			end_with_newline: false, // When wrapping, the last row can not be empty!
			wrap_line_length: EDITOR.view.visibleColumns - 1, // Where to break line
			unescape_strings: true
		};
		
		var rowsBefore = endRow - startRow + 1;
		var indentationStart = file.grid[startRow].indentation;
		
		if(indentationStart != file.grid[endRow].indentation) {
			throw new Error("Indentation on startRow=" + startRow + " (" + file.grid[startRow].indentation + " = " + UTIL.lbChars(file.grid[startRow].indentationCharacters) + ") and endRow=" + endRow + " (" + file.grid[endRow].indentation + " = " + UTIL.lbChars(file.grid[endRow].indentationCharacters) + ") is not the same!");
		}

		settings.indent_level = indentationStart;
		
		var startIndex = file.grid[startRow].startIndex;
		
		if(endRow == file.grid.length-1) {
			console.log("beautify: wrap: endRow=" + endRow + " on last row! text=" + file.rowText(endRow));
			var endIndex = file.text.length-1;
		}
		else if(file.grid[endRow].length == 0) {
			throw new Error("endRow=" + endRow + " can not be on an empty row!");
			console.log("beautify: wrap: endRow=" + endRow + " on empty row!");
			endIndex = file.grid[endRow].startIndex;
		}
		else {
			console.log("beautify: wrap: endRow=" + endRow + " on a row with text=" + file.rowText(endRow));
			endIndex = file.grid[endRow][file.grid[endRow].length-1].index;
		}
		
		var text = file.text.slice(startIndex, endIndex+1);
		
		if(DEPENDENCIES_LOADED) return jsBeautifyLoaded(null);
		
		loadDependencies(DEPS, jsBeautifyLoaded);
		
		function jsBeautifyLoaded(err) {
			if(err) {
				alertBox("Failed to load dependencies: " + err.message);
				return;
			}
			
			console.log("beautify: wrap: before:\n" + text);
			
			if(isHTML(file)) {
				console.log("beautify: wrap: using html_beautify for file.path=" + file.path)
				text = html_beautify(text, settings);
			}
			else if(isJS(file)) {
				console.log("beautify: wrap: using js_beautify for file.path=" + file.path)
				text = js_beautify(text, settings);
			}
			
			console.log("beautify: wrap: after:\n" + text);
			
			file.moveCaretToIndex(startIndex);
			file.deleteTextRange(startIndex, endIndex);
			file.insertText(text);
			
		}
	}
	
	function pasteBeautified(file) {
		
		if(!file) return ALLOW_DEFAULT;
		if(!EDITOR.input) return ALLOW_DEFAULT;
		
		// Chrome users probably want "paste as plain text". And that's what they will get (plus formatting)
		// https://defkey.com/what-means/ctrl-shift-v

		var text;
		
		EDITOR.getClipboardContent(function gotClipboardDate(err, data, usingPseudoClipboard) {
			if(err) return alertBox(err.message);
			
			text = data;
			
			if(DEPENDENCIES_LOADED) return pasteAfterBeautifyLoaded(null);
			
			loadDependencies(DEPS, pasteAfterBeautifyLoaded);
		});
		
		return PREVENT_DEFAULT;
		
		function pasteAfterBeautifyLoaded(err) {
			if(err) {
				alertBox("Failed to load formatting dependencies: " + err.message);
				return;
			}
			
			console.log("beautify: pasteBeautified: before:\n" + text);
			
			var settings = {
				indent_size: 0, // file.indentation.length,
				indent_char: file.indentation.charAt(0),
				indent_with_tabs: (file.indentation == "\t"),
				eol: file.lineBreak,
				end_with_newline: false,
				wrap_line_length: EDITOR.view.visibleColumns - 1, // Where to break line
				unescape_strings: true
			};
			
			if(isHTML(file)) {
				console.log("beautify: pasteBeautified: using html_beautify for file.path=" + file.path)
				text = html_beautify(text, settings);
			}
			else if(isJS(file)) {
				console.log("beautify: pasteBeautified: using js_beautify for file.path=" + file.path)
				text = js_beautify(text, settings);
			}
			else {
				console.warn("beautify: pasteBeautified: File type not supported: " + file.path);
			}
			
			console.log("beautify: pasteBeautified: after:\n" + text);
			
			file.insertText(text);
			
		}
	}
	
	function beautify() {
		
		var file = EDITOR.currentFile;
		
		// Use zero indent size because the Editor will take care of the indentation!
		// And some users like to use 100 <main> elements after each other making jsBeautify end up using 3 character line length ...
		var jsSettings = {
			indent_size: 0, // file.indentation.length
			indent_char: file.indentation.charAt(0),
			indent_with_tabs: (file.indentation == "\t"),
			eol: file.lineBreak,
			end_with_newline: true, // opinioned, nice for version control
			wrap_line_length: EDITOR.view.visibleColumns - 1 // Where to break line
		}
		
		var htmlSettings = undefined;
		
		//console.log("beautify: DEPENDENCIES_LOADED=" + DEPENDENCIES_LOADED + " file.path=" + file.path);
		
		if(DEPENDENCIES_LOADED) jsBeautifyLoaded(null);
		else loadDependencies(DEPS, jsBeautifyLoaded);
		
		return PREVENT_DEFAULT;
		
		function jsBeautifyLoaded(err) {
			//console.log("beautify: jsBeautifyLoaded: err=" + err);
			
			if(err) {
alertBox("Failed to load dependencies: " + err.message);
				return;
			}
			
			DEPENDENCIES_LOADED = true;
			
			var text = file.text;
			
			console.log("beautify: jsSettings=" + JSON.stringify(jsSettings, null, 2));
			
			console.log("beautify: before:\n" + text);
			
			// html_beautify and js_beautify functions are inserted to global scope by beautify.js
			
			if(isHTML(file)) {
				console.log("beautify: using html_beautify for file.path=" + file.path)
				text = html_beautify(text, jsSettings);
			}
			else if(isJS(file)) {
				console.log("beautify: using js_beautify for file.path=" + file.path)
text = js_beautify(text, jsSettings);
			}
			else return alertBox("Unable to js-beautify ." + UTIL.getFileExtension(file.path) + " file types!");
			
			console.log("beautify: after:\n" + text);
			
			file.reload(text);
			
			alertBox(file.path + ' was re-formatted/styled by js-beautify!\n<a title="' + EDITOR.getKeyFor("reloadFileFromKeyCombo") + '">Reload from disk</a> to undo. Or <a title="' + EDITOR.getKeyFor("saveFileFromKeyboardCombo") + '">save</a> to apply.');
			
		}
	}
	
	function loadDependencies(deps, callback) {
		
		//console.log("beautify: loadDependencies: deps=" + deps);
		
		var counter = 0;
		var errors = [];
		
		for (var i=0; i<deps.length; i++) {
			EDITOR.loadScript(deps[i], doneMaybe);
		}
		
		function doneMaybe(err) {
			if(err) {
				console.error(err);
				errors.push(err);
			}
			if(++counter == deps.length) {
				if(errors.length == 0) {
					var error = null;
				}
				else {
					if(errors.length == 1) var error = errors[0];
					else var error = new Error(errors.map(function(err) {return err.message}).join("\n"));
				}
				
				callback(error);
				callback = null;
			}
			else {
				//console.log("beautify: loadDependencies: counter=" + counter + " deps.length=" + deps.length + " err=" + err);
			}
		}
	}
	
})();