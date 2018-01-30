
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
				EDITOR.on("keyDown", terminalkeyDown); // Needed to detect enter
			EDITOR.on("fileClose", terminalCloseFile);
			
			},
			unload: function unloadTerminal() {
				
			EDITOR.removeMenuItem(menuItem);
			
			CLIENT.removeEvent("terminal", terminalMessage);
			
				EDITOR.removeEvent("afterResize", resizeTerminals);
				EDITOR.removeEvent("keyDown", terminalkeyDown);
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
		
			if(EDITOR.files.hasOwnProperty(name) && callback) return callback(null, EDITOR.files[name]); 
			
			EDITOR.openFile(name, "", function fileOpened(err, file) {
				if(err) {
					if(callback) return callback(err);
					else return alertBox(err.message);
				}
				
			file.mode = "text";
			
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
			
			function parse(data) {
				
				var char = "";
				var code = 0;
				var inCommand = false;
			var inText = true;
				
				for (var i=0; i<data.length; i++) {
					char = data.charAt(i);
					code = data.charCodeAt(i);
					
					if(code == 7) { // BEL *beep*
						}
				else if(code == 13) { // cr
				}
					else if(code == 27) { // ESC
						inCommand = true;
						inText = false;
					}
					else if(inCommand && code == 109) { // m
						inText = true;
						inCommand = false;
					}
					else if(inText) {
					if(code == 10) file.insertLineBreak();
					else file.putCharacter(char);
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
		
	function terminalkeyDown(file, character, combo, keyDownEvent) {
		if(terminalFiles.indexOf(file) == -1) return true;
		
		var code = keyDownEvent.charCode || keyDownEvent.keyCode;
		
		console.log("key down: " + character + " (" + code + ")");
		
		if(code != 13) return true;
		
		var id = file.path.match(reTerm)[1];
		
		CLIENT.cmd("terminal.write", {id: id, data: character}, function terminalWrite(err) {
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