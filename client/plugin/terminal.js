
(function() {
"use strict";

	var menuItem;
	
	var terminalFiles = [];
	
	var reTerm = /terminal(\d+)/;
	
		EDITOR.plugin({
			desc: "Terminal emulator",
			load: function loadTerminal() {
				
			menuItem = EDITOR.addMenuItem("Terminal", startTerminal);
			
			CLIENT.on("terminal", terminalMessage);
			
				EDITOR.on("afterResize", resizeTerminals);
				EDITOR.on("keyPressed", terminalKeyPressed);
			EDITOR.on("keyDown", terminalKeyDown); // Needed to detect enter
			EDITOR.on("fileClose", terminalCloseFile);
			
			},
			unload: function unloadTerminal() {
				
			EDITOR.removeMenuItem(menuItem);
			
			CLIENT.removeEvent("terminal", terminalMessage);
			
				EDITOR.removeEvent("afterResize", resizeTerminals);
			EDITOR.removeEvent("keyDown", terminalKeyDown);
				EDITOR.removeEvent("fileClose", terminalCloseFile);
			}
		});
		
		function startTerminal() {
			
			EDITOR.hideMenu();
			
			var cwd = EDITOR.currentFile && UTIL.getDirectoryFromPath(EDITOR.currentFile.path);
			var cols = EDITOR.view.visibleColumns;
			var rows = EDITOR.view.visibleRows;
			
			CLIENT.cmd("terminal.open", {cwd: cwd, cols: cols, rows: rows}, function terminalOpened(err, term) {
				if(err) return alertBox(err.message);
				
				// We might get terminal data before we get the open callback!
				openTerminalFile("terminal" + term.id);
				
			});
		}
		
		function resizeTerminals(file) {
			var cols = EDITOR.view.visibleColumns;
			var rows = EDITOR.view.visibleRows;
			var id = 0;
			var match = null;
			
			for(var path in EDITOR.files) {
				match = path.match(reTerm);
				if(match) {
					id = match[1];
					resizeTerminal(id);
				}
			}
			
			function resizeTerminal(id) {
				CLIENT.cmd("terminal.resize", {id: id, cols: cols, rows: rows}, function terminalResized(err) {
					if(err) console.warn(err.message);
				});
			}
		}
		
		function openTerminalFile(name, callback) {
			
		if(!name) throw new Error("name=" + name);
		
		if(EDITOR.files.hasOwnProperty(name)) {
if(callback) callback(null, EDITOR.files[name]); 
		return;
		}
		
			EDITOR.openFile(name, "", function fileOpened(err, file) {
				if(err) {
					if(callback) return callback(err);
					else return alertBox(err.message);
				}
				
			file.mode = "text";
			file.parse = false;
			
			terminalFiles.push(file);
				
				if(callback) callback(null, file);
				
			});
			}
		
		function terminalMessage(term) {
			
		var file = EDITOR.files["terminal" + term.id];
		
		if(term.exit) {
			alertBox("terminal" + term.id + " exit: code=" + term.exit.code + " signal=" + term.exit.signal);
			while(terminalFiles.indexOf(file) != -1) terminalFiles.splice(terminalFiles.indexOf(file), 1);
			return;
		}
		
			if(!file && term.data) {
			var name = "terminal" + term.id;
				openTerminalFile(name, function(err, f) {
					if(err) return alertBox(err.message);
					
					file = f;
					parse(term.data);
				})
			}
			else if(term.data) parse(term.data);
			
			console.log("terminal:" + JSON.stringify(term, null, 2));
			
		/*
			
			Terminal is always in insert mode !?
			
		*/
		
			function parse(data) {
				
				var char = "";
				var code = 0;
			var inEsc = false;
			var inText = true;
			var inBracket = false;
			
			for (var i=0; i<data.length; i++) {
					char = data.charAt(i);
					code = data.charCodeAt(i);
					
				console.log("char=" + char + " code=" + code);
				
					if(code == 7) { // BEL
						}
				else if(code == 13) { // cr
				}
					else if(code == 27) { // ESC
					inEsc = true;
						inText = false;
					}
				else if(inEsc && char == "]") {
					inBracket = true;
					inEsc = false;
				}
				else if(inBracket && char == "K") {
					// Erase End of Line
					// todo: Erase until end of line
				}
				else if(inEsc && code == 109) { // m
						inText = true;
					inEsc = false;
					}
					else if(inText) {
					if(code == 10) file.insertLineBreak();
					else if(code == 8) { // BS  (backspace)  
						file.moveCaretLeft();
						//file.deleteCharacter();
						}
					else if(code == 9) { // TAB (horizontal tab)
						var spaces = ""
						for (var j=0; j<EDITOR.settings.tabSpace; j++) {
							spaces += " ";
						}
						file.insertText(spaces);
					}
					else {
						if(!file.caret.eol) file.deleteCharacter();
						file.putCharacter(char);
					}
				}
			}
			EDITOR.renderNeeded();
		}
	}
	
	function terminalKeyPressed(file, character, combo) {
		if(terminalFiles.indexOf(file) == -1) return true;
		
		var id = file.path.match(reTerm)[1];
		
		console.log("key pressed: " + character);
		
		CLIENT.cmd("terminal.write", {id: id, data: character}, function terminalWrite(err) {
			if(err) alertBox(err.message);
		});
		
		return false;
	}
	
	function terminalKeyDown(file, character, combo, keyDownEvent) {
		if(terminalFiles.indexOf(file) == -1) return true;
		
		var code = keyDownEvent.charCode || keyDownEvent.keyCode;
		
		console.log("key down: " + character + " (" + code + ")");
		
		var id = file.path.match(reTerm)[1];
		var data;
		
		var ESC = String.fromCharCode(27);
		
		if(code == 13) { // Enter
			data = character;
		}
		else if(code == 67 && combo.ctrl) { // Ctrl+C
			data = String.fromCharCode(3); // ETX (end of text) 
		}
		else if(code == 8) { // backspace
			data = character;
		}
		else if(code == 37) { // arrow left
			data = ESC + "[D";
		}
		else if(code == 39) { // arrow right
			data = ESC + "[C";
		}
		
		else if(code == 38) { // arrow up
			data = ESC + "[A";
		}
		else if(code == 40) { // arrow down
			data = ESC + "[B";
		}
		
else return true;
		
		CLIENT.cmd("terminal.write", {id: id, data: data}, function terminalWrite(err) {
			if(err) alertBox(err.message);
		});
		
		return false;
	}
	
	
	function terminalCloseFile(file) {
		if(terminalFiles.indexOf(file) == -1) return true;
		
		var id = file.path.match(reTerm)[1];
		
		CLIENT.cmd("terminal.close", {id: id}, function terminalClose(err) {
			if(err) alertBox(err.message);
		});
		
		while(terminalFiles.indexOf(file) != -1) terminalFiles.splice(terminalFiles.indexOf(file), 1);
		
	}
	
})();