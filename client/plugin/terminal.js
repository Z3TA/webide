/*
	
	Question: Should terminals be reopened when the file re-opens !?
	Answer: No! Because we wouln't be able to get back to the old state (bash session)
	
	Problem: The terminal's shell have it's own key-bindings which overlaps the editor's key bindings! Example Ctrl+C to copy, is used to exit a program in bash shell.
	Solution 1: Use Alt for Ctrl and Shift+Alt for Alt !?  (AltGr doesn't seem to work)
	
*/
(function() {
	"use strict";
	
	var termPrefix = "terminal"; // Terminal name prefix
	var ESC = String.fromCharCode(27);
	
	var menuItem;
	var terminalFiles = [];
	var reTerm = new RegExp(termPrefix + "(\\d+)");
	var oldCols = 0;
	var oldRows = 0;
	var altKeyPressed = false;
	var ctrlKeyPressed = false;

	EDITOR.plugin({
		desc: "Terminal emulator",
		load: function loadTerminal() {
			
			menuItem = EDITOR.addMenuItem("Terminal", startTerminalFromMenu, 16);
			
			CLIENT.on("terminal", terminalMessage);
			
			EDITOR.on("afterResize", resizeTerminals);
			EDITOR.on("keyPressed", terminalKeyPressed);
			EDITOR.on("keyDown", terminalKeyDown); // Needed to detect enter
			EDITOR.on("fileClose", terminalCloseFile);
			EDITOR.on("paste", terminalPaste);
			EDITOR.on("mouseClick", terminalMouseClick);
			EDITOR.on("exit", exitAllTerminals);
			
			if(QUERY_STRING["start"] && QUERY_STRING["start"].indexOf("terminal") != -1) {
				CLIENT.on("loginSuccess", startTerminalOnLogin);
			}
			
			EDITOR.registerAltKey({char: "=", alt:1, label: "Ctrl", fun: ctrlKey});
			EDITOR.registerAltKey({char: "=", alt:2, label: "Alt", fun: altKey});
			
		},
		unload: function unloadTerminal() {
			
			EDITOR.removeMenuItem(menuItem);
			
			CLIENT.removeEvent("terminal", terminalMessage);
			
			EDITOR.removeEvent("afterResize", resizeTerminals);
			EDITOR.removeEvent("keyPressed", terminalKeyPressed);
			EDITOR.removeEvent("keyDown", terminalKeyDown);
			EDITOR.removeEvent("fileClose", terminalCloseFile);
			EDITOR.removeEvent("paste", terminalPaste);
			
			CLIENT.removeEvent("loginSuccess", startTerminalOnLogin);
			CLIENT.removeEvent("terminal", terminalMessage);
			EDITOR.removeEvent("exit", exitAllTerminals);
			
			EDITOR.unregisterAltKey(altKey);
			EDITOR.unregisterAltKey(ctrlKey);
		}
	});
	
	function altKey(file) {
		altKeyPressed = true;
		
		paintCaret(file, "⎋");
	}
	
	function ctrlKey(file) {
		ctrlKeyPressed = true;
		
		paintCaret(file, "✲");
	}
	
	function paintCaret(file, symbol) {
		var caret = file.caret;
		var fillStyle = EDITOR.settings.caret.color;
		var bufferStartRow = file.startRow;
		var screenStartRow = 0;
		var row = caret.row;
		var col = caret.col;
		
		var middle = Math.floor(EDITOR.settings.topMargin + (row - bufferStartRow + screenStartRow) * EDITOR.settings.gridHeight) + Math.floor(EDITOR.settings.gridHeight/2);
		var left = Math.floor(EDITOR.settings.leftMargin + (col + (file.grid[row].indentation * EDITOR.settings.tabSpace) - file.startColumn) * EDITOR.settings.gridWidth);
		
		var ctx = EDITOR.canvasContext;
		
		ctx.fillStyle = fillStyle;
		ctx.fillText(symbol, left, middle);
	}
	
	function terminalMouseClick(mouseX, mouseY, caret, mouseDirection, button) {
		if(!caret) return true; // Means the click was outside the file grid
		var file = EDITOR.currentFile;
		if(terminalFiles.indexOf(file) == -1) return true;
		
		var terminalState = file.terminal;
		
		// Another module places the caret when we push mouse button down!
		if(mouseDirection == "up") {
			if(terminalState && (terminalState.caret.row || terminalState.caret.col)) {
				if(terminalState.caret.row == caret.row) {
					/*
						Send the new position to the terminal server
						
						Problem 1: How to calculate the position to send to the server ?
						Solution: Save terminalState.caret
						
						Problem 2: Server don't understand [3D or [3C
						Solution: Send many [D and [C
						
						Problem 3: The server will echo the commands
						Solution: Move the file caret to terminalState.caret before sending
					*/
					
					var deltaCol = caret.col - terminalState.caret.col;
					
					if(deltaCol != 0) {
						file.moveCaret(undefined, terminalState.caret.row, terminalState.caret.col);
						
						var id = file.path.match(reTerm)[1];
						
						console.log("deltaCol=" + deltaCol);
						
						if(deltaCol > 0) var code = "C";
						else var code = "D";
						
						deltaCol = Math.abs(deltaCol);
						
						// Seems we can't specify [3D to move 3 steps ...
						
						code = ESC + "[" + code;
						
						var data = code;
						
						for (var i=0; i<deltaCol; i++) CLIENT.cmd("terminal.write", {id: id, data: data}, caretMoved);
						}
				}
			}
		}
		
		return true;
		
		// scroll wheel = paste sel, or clipboard !?
		
		function caretMoved(err) {
			if(err) alertBox(err.message);
			
		}
		
	}
	
	function terminalPaste(file, text, pasteEvent) {
		console.log("terminal paste: text=" + text);
		
		if(terminalFiles.indexOf(file) == -1) return true;
		
		var id = file.path.match(reTerm)[1];
		
		if(!EDITOR.input) return true;
		
		CLIENT.cmd("terminal.write", {id: id, data: text}, function terminalWrite(err) {
			if(err) alertBox(err.message);
		});
		
		return false;
	}
	
	function startTerminalFromMenu(file, combo, character, charCode, direction) {
		startTerminal();
	}
	
	function startTerminalOnLogin() {
		startTerminal(function (err, file) {
			if(err) return alertBox(err.message);
			});
	}
	
	function startTerminal(startTerminalCallback) {
		
		EDITOR.hideMenu();
		
		var cwd = EDITOR.currentFile && UTIL.getDirectoryFromPath(EDITOR.currentFile.path);
		
		if(cwd && cwd.indexOf("://") != -1) {
			if(EDITOR.user && EDITOR.user.home) cwd = EDITOR.user.home;
		}
		
		if(!cwd) cwd = "/";
		
		var cols = EDITOR.view.visibleColumns;
		var rows = EDITOR.view.visibleRows;
		var terminalId = 1;
		var terminalName = termPrefix + terminalId;
		
		var openFiles = Object.keys(EDITOR.files);
		while(openFiles.indexOf(terminalName) != -1 && terminalId < 100) {
			terminalId++;
			terminalName = termPrefix + terminalId;
		}
		
		CLIENT.cmd("terminal.open", {cwd: cwd, cols: cols, rows: rows, id: terminalId}, function terminalOpened(err, term) {
			if(err) {
				// How do I repeat: Open two terminals, then close them, and open a new terminal
				var reHigher = /Terminal id needs to be (\d+) or higher/;
				var matchHigher = err.message.match(reHigher);
				if(matchHigher) {
					terminalId = parseInt(matchHigher[1]);
					terminalName = termPrefix + terminalId;
					return CLIENT.cmd("terminal.open", {cwd: cwd, cols: cols, rows: rows, id: terminalId}, terminalOpened);
				}
				else if(startTerminalCallback) startTerminalCallback(err);
				else return alertBox(err.message);
			}
			// We might get terminal data before we get the open callback!
			openTerminalFile(terminalName, startTerminalCallback);
			});
	}
	
	function resizeTerminals(file) {
		var cols = EDITOR.view.visibleColumns;
		var rows = EDITOR.view.visibleRows;
		
		if(oldCols != cols || oldRows != rows) {
			oldCols = cols;
			oldRows = rows;
			
			for (var i=0, match, id=0; i<terminalFiles.length; i++) {
				match = terminalFiles[i].path.match(reTerm);
				id = parseInt(match[1]);
				resizeTerminal(id);
			}
		}
		
		function resizeTerminal(id) {
			if(CLIENT.connected) {
				CLIENT.cmd("terminal.resize", {id: id, cols: cols, rows: rows}, function terminalResized(err) {
					if(err && err.code == "UNKNOWN_TERMINAL_ID") {
						// The server might have restarted
						terminalCloseFile(termPrefix + id);
					}
					else if(err) {
						console.log("err.code=" + err.code);
						throw err;
					}
				});
			}
			else console.warn("Not connected to server!");
		}
	}
	
	function openTerminalFile(name, callback) {
		
		if(!name) throw new Error("name=" + name);
		
		if(EDITOR.openFileQueue.indexOf(name) != -1) {
			console.warn("The terminal name=" + name + " is already in the openFileQueue=" + JSON.stringify(EDITOR.openFileQueue));
			EDITOR.whenFileOpens(name, callback);
			return;
		}
		
		if(EDITOR.files.hasOwnProperty(name)) {
			if(callback) callback(null, EDITOR.files[name]); 
			return;
		}
		
		EDITOR.openFile(name, "", {show: true}, function fileOpened(err, file) {
			if(err) {
				if(callback) return callback(err);
				else return alertBox(err.message);
			}
			
			file.mode = "text";
			file.parse = false;
			file.parsed = null;
			file.noChangeEvents = true;
			file.noCollaboration = true;
			
			terminalFiles.push(file);
			file.write(file.path + " session started " + (new Date()) + "\n");
			file.writeLine("Use Alt key instead of Ctrl to send control characters! And Alt+Shift instead of Alt (to send Esc+character)");
			file.writeLineBreak();
			file.writeLineBreak();
			EDITOR.renderNeeded();
			
			console.log(typeof callback)
			console.log(callback);
			
			if(callback) callback(null, file);
			
		});
	}
	
	function terminalMessage(term) {
		
		var file = EDITOR.files[termPrefix + term.id];
		
		if(term.exit) {
			
			if(file) {
file.writeLine("\n" + file.path + " session closed " + (new Date()) + "\n");
				EDITOR.renderNeeded();
			}
			
			if(term.exit.code != 0) alertBox(termPrefix + term.id + " exit: code=" + term.exit.code + " signal=" + term.exit.signal);
			
			while(terminalFiles.indexOf(file) != -1) terminalFiles.splice(terminalFiles.indexOf(file), 1);
			return;
		}
		
		if(!file && term.data) {
			var name = termPrefix + term.id;
			openTerminalFile(name, function(err, f) {
				if(err) return alertBox(err.message);
				
				file = f;
				parse(term.data);
			})
		}
		else if(term.data) parse(term.data);
		
		console.log("terminal:" + JSON.stringify(term, null, 2));
		
		/*
			
			http://www.termsys.demon.co.uk/vtansi.htm
			http://ascii-table.com/ansi-escape-sequences-vt-100.php
			
			
		*/
		
		function parse(data) {
			
			console.log("Parse data=" + data);
			
			var char = "";
			var code = 0;
			var inEsc = false;
			var inText = true;
			var inBracket = false;
			var inNumber = "";
			var bright = false;
			var inNumberSerie = false;
			var numberSerie = [];
			
			var defaultForeGroundColor = EDITOR.settings.style.textColor;
			var defaultBackgroundColor = null; // EDITOR.settings.style.bgColor;
			
			var colorBlack = "black";
			var colorRed = "red";
			var colorGreen = "green";
			var colorYellow = "yellow";
			var colorBlue = "blue";
			var colorMagenta = "magenta";
			var colorCyan = "cyan";
			var colorWhite = "white";
			
			var bright = false;
			var dim = false;
			var underscore = false;
			var blink = false;
			var reverse = false;
			var hidden = false;
			var foregroundColor = defaultForeGroundColor;
			var backgroundColor = defaultBackgroundColor;
			
			if(!file.terminal) file.terminal = new TerminalState();
			var terminalState = file.terminal;
			
			var charBuffer = "";
			
			for (var i=0; i<data.length; i++) {
				char = data.charAt(i);
				code = data.charCodeAt(i);
				
				console.log("char=" + char + " code=" + code + " inEsc=" + inEsc + " inText=" + inText + " inBracket=" + inBracket + 
				" inNumberSerie=" + inNumberSerie + " inNumber=" + inNumber + " ");
				
				if(code == 7) { // BEL
					if(charBuffer) print();
					inNumber = "";
					inNumberSerie = false;
					numberSerie.length = 0;
					inText = true;
				}
				else if(code == 27) { // ESC
					if(charBuffer) print();
					inEsc = true;
					inText = false;
					inBracket = false;
					inNumberSerie = false;
					inNumber = "";
					numberSerie.length = 0;
				}
				else if(inEsc && code == 93) { // 93=]  
					if(charBuffer) print();
					// Undocumented
					inEsc = false;
				}
				else if(inEsc && code == 91) { // 91=[
					if(charBuffer) print();
					inBracket = true;
					inEsc = false;
				}
				
				// ### Start numbers
				else if(inBracket && code == 48) { // 0
					inNumber = "0";
					inBracket = false;
				}
				else if(inBracket && code == 49) { // 1
					inNumber = "1";
					inBracket = false;
				}
				else if(inBracket && code == 50) { // 2
					inNumber = "2";
					inBracket = false;
				}
				else if(inBracket && code == 51) { // 3
					inNumber = "3";
					inBracket = false;
				}
				else if(inBracket && code == 52) { // 4
					inNumber = "4";
					inBracket = false;
				}
				else if(inBracket && code == 53) { // 5
					inNumber = "5";
					inBracket = false;
				}
				else if(inBracket && code == 54) { // 6
					inNumber = "6";
					inBracket = false;
				}
				else if(inBracket && code == 55) { // 7
					inNumber = "7";
					inBracket = false;
				}
				else if(inBracket && code == 56) { // 8
					inNumber = "8";
					inBracket = false;
				}
				else if(inBracket && code == 57) { // 9
					inNumber = "9";
					inBracket = false;
				}
				
				// ### Add numbers
				else if((inNumber || inNumberSerie) && code == 48) { // 0
					inNumber += "0";
				}
				else if((inNumber || inNumberSerie) && code == 49) { // 1
					inNumber += "1";
				}
				else if((inNumber || inNumberSerie) && code == 50) { // 2
					inNumber += "2";
				}
				else if((inNumber || inNumberSerie) && code == 51) { // 3
					inNumber += "3";
				}
				else if((inNumber || inNumberSerie) && code == 52) { // 4
					inNumber += "4";
				}
				else if((inNumber || inNumberSerie) && code == 53) { // 5
					inNumber += "5";
				}
				else if((inNumber || inNumberSerie) && code == 54) { // 6
					inNumber += "6";
				}
				else if((inNumber || inNumberSerie) && code == 55) { // 7
					inNumber += "7";
				}
				else if((inNumber || inNumberSerie) && code == 56) { // 8
					inNumber += "8";
				}
				else if((inNumber || inNumberSerie) && code == 57) { // 9
					inNumber += "9";
				}
				
				else if(inNumber && code == 59) { // ;
					numberSerie.push(inNumber);
					inNumberSerie = true;
					inNumber = "";
				}
				
				else if(inBracket && code == 109) { // m
					if(charBuffer) print();
					resetDisplay();
					inBracket = false;
					inText = true;
				}
				
				else if(inNumberSerie && inNumber && char == "r") {
					if(charBuffer) print();
					var bottom = parseInt(inNumber);
					var top = parseInt(numberSerie.pop());
					
					console.log("Set top=" + top + " and bottom=" + bottom + " lines of a window"); 
					
					if( isNaN(top) || isNaN(bottom) ) throw new Error("top=" + top + " bottom=" + bottom + " data=" + data);
					
					terminalState.topLine = top;
					terminalState.bottomLine = bottom;
					
					inNumberSerie = false;
					numberSerie.length = 0;
					inNumber = "";
					inText = true;
				}
				
				
				
				// ### Clearing lines
				else if(char == "K" && (inBracket || inNumber == "0") ) {
					
					console.log("Clear line from cursor right ");
					var row = file.grid[file.caret.row];
					if(row.length > file.caret.col) {
						var firstIndex = file.caret.index;
						var lastIndex = row[row.length-1].index;
						file.deleteTextRange(firstIndex, lastIndex);
					}
					inBracket = false;
					inNumber = "";
					inText = true;
				}
				else if(char == "K" && inNumber == "1") {
					console.log("todo: Clear line from cursor left ");
					inNumber = "";
					inText = true;
				}
				else if(char == "K" && inNumber == "2") {
					console.log("todo: Clear entire line ");
					inNumber = "";
					inText = true;
				}
				
				// ### Clearing screen
				else if(char == "J" && (inBracket || inNumber == "0") ) {
					console.log("todo: Clear screen from cursor down");
					inBracket = false;
					inNumber = "";
					inText = true;
				}
				else if(char == "J" && inNumber == "1") {
					console.log("todo: Clear screen from cursor up ");
					inNumber = "";
					inText = true;
				}
				else if(char == "J" && inNumber == "2") { // J
					var startRow = file.startRow;
					
					console.log("Clear entire screen! startRow=" + startRow + " file.grid.length=" + file.grid.length);
					
					file.moveCaretToEndOfFile();
					file.insertLineBreak();
					file.startRow = file.caret.row;
					EDITOR.renderNeeded();
					
					/*
					for(var row=startRow; row<file.grid.length; row++) {
						console.log("Clearing row=" + row);
						file.removeAllTextOnRow(row);
					}
					*/
					
					inNumber = "";
					inText = true;
				}
				
				// ### Moving the cursor
				else if((inEsc || inNumber || inBracket) && char == "A") {
					if(charBuffer) print();
					
					if(inNumber) var times = parseInt(inNumber);
					else var times = 1;
					
					console.log("Move cursor up " + times + " lines");
					
					var col = file.caret.col;
					
					for(var j=0; j<times;j++) file.moveCaretUp();
					
					if(file.caret.col < col) {
						file.insertSpace(col - file.caret.col);
					}
					
					inEsc = false;
					inBracket = false;
					inNumber = "";
					inText = true;
				}
				else if((inEsc || inNumber || inBracket) && char == "B") {
					if(charBuffer) print();
					
					if(inNumber) var times = parseInt(inNumber);
					else var times = 1;
					
					console.log("Move cursor down " + times + " lines");
					
					var col = file.caret.col;
					
					for(var j=0; j<times;j++) {
						console.log("file.caret.row=" + file.caret.row + " file.grid.length=" + file.grid.length);
						
						if(file.caret.row == file.grid.length-1) {
							// Terminal wants to move the caret down, but there are no more lines in the editor:
							file.moveCaretToEndOfFile();
							file.insertLineBreak();
						}
						else file.moveCaretDown();
						
					}
					
					if(file.caret.col < col) {
						file.insertSpace(col - file.caret.col);
					}
					
					inEsc = false;
					inBracket = false;
					inNumber = "";
					inText = true;
				}
				else if((inEsc || inNumber || inBracket) && char == "C") {
					if(charBuffer) print();
					
					if(inNumber) var times = parseInt(inNumber);
					else var times = 1;
					
					console.log("Move cursor right " + times + " lines");
					for(var j=0; j<times;j++) {
						if(file.caret.eol) file.insertText(" ");
						else file.moveCaretRight();
					}
					inEsc = false;
					inBracket = false;
					inNumber = "";
					inText = true;
				}
				else if((inEsc || inNumber || inBracket) && char == "D") {
					if(charBuffer) print();
					
					if(inNumber) var times = parseInt(inNumber);
					else var times = 1;
					
					console.log("Move cursor left " + times + " lines");
					for(var j=0; j<times;j++) file.moveCaretLeft();
					
					inEsc = false;
					inBracket = false;
					inNumber = "";
					inText = true;
				}
				else if((inEsc && char == "H") || (inBracket && (char == "H" || char == "f"))) {
					if(charBuffer) print();
					
					console.log("Move cursor to upper left corner");
					file.moveCaret(undefined, file.startRow, 0);
					inEsc = false;
					inBracket = false;
					inText = true;
				}
				else if(inNumberSerie && (char == "H" || char == "f")) {
					if(charBuffer) print();
					
					var toCol = parseInt(inNumber) - 1;
					var toRow = parseInt(file.startRow + parseInt(numberSerie.pop())) - 1; // + terminalState.topLine;
					
					console.log("Move cursor to screen location vertically row=" + toRow + ", horizontally col=" + toCol + " ");
					
					console.log("file.startRow=" + file.startRow + " toCol=" + toCol + " toRow=" + toRow + " file.grid.length=" + file.grid.length + " " + toRow + "-" + file.grid.length + "=" + (toRow - file.grid.length));
					
					while(toRow >= file.grid.length) {
						file.writeLineBreak();
					}
					
					console.log(" file.grid.length=" + file.grid.length + " toRow=" + toRow);
					console.log(" file.grid[" + toRow + "].length=" + file.grid[toRow].length);
					
					if(toCol >= file.grid[toRow].length) {
						var spaces = "";
						for(var j=0; j<toCol-file.grid[toRow].length; j++) {
							spaces += " ";
						}
						file.moveCaret(undefined, toRow, file.grid[toRow].length-1);
						if(spaces) file.insertText(spaces);
					}
					
					file.moveCaret(undefined, toRow, toCol);
					
					inNumber = "";
					inNumberSerie = false;
					//numberSerie.length = 0;
					if(numberSerie.length > 0) throw new Error("Unexpected numberSerie.length=" + numberSerie.length + " numberSerie=" + JSON.stringify(numberSerie));
					inText = true;
				}
				else if(inEsc && char == "E") {
					if(charBuffer) print();
					
					console.log("todo: Move to next line");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "7") {
					if(charBuffer) print();
					
					console.log("todo: Save cursor position and attributes");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "8") {
					if(charBuffer) print();
					
					console.log("todo: Restore cursor position and attributes");
					inEsc = false;
					inText = true;
				}
				
				// ### Scrolling
				else if( (inEsc || inNumber) && (char == "D" || char == "L")) {
					if(charBuffer) print();
					
					if(inNumber) var times = parseInt(inNumber);
					else var times = 1;
					console.log("todo: Move/scroll window UP " + times + " line(s)");
					var topRow = file.startRow;
					var bottomRow = file.startRow;
					
					if(terminalState.topLine > 0) topRow += terminalState.topLine-1;
					if(terminalState.bottomLine > 0) bottomRow += terminalState.bottomLine;
					
					var topLineText = "";
					var bottomLineText = "";
					for(var j=0; j<times; j++) {
					topLineText = terminalState.topScrollRowBuffer.pop();
					
					if(topLineText == undefined) topLineText = "";
					
					//file.insertTextRow(topLineText, topRow);
						file.insertTextRow("", topRow);
						
					bottomLineText = file.removeRow(bottomRow);
					terminalState.bottomScrollRowBuffer.unshift(bottomLineText);
					}
					
					inEsc = false;
					inBracket = false;
					inNumber = "";
					inText = true;
				}
				else if( (inEsc || inNumber) && char == "M") {
					if(charBuffer) print();
					
					if(inNumber) var times = parseInt(inNumber);
					else var times = 1;
					
					var topRow = file.startRow;
					var bottomRow = file.startRow;
					
					if(terminalState.topLine > 0) topRow += (terminalState.topLine-1);
					if(terminalState.bottomLine > 0) bottomRow += terminalState.bottomLine-1;
					
					console.log("Move/scroll window DOWN " + times + " line(s) startRow=" + startRow + " topLine=" + terminalState.topLine + 
					" bottomLine=" + terminalState.bottomLine + " topRow=" + topRow + " bottomRow=" + bottomRow);
					
var bottomLineText = "";
var topLineText = "";
					for(var j=0; j<times; j++) {
					bottomLineText = terminalState.bottomScrollRowBuffer.shift();
					
					if(bottomLineText == undefined) bottomLineText = "";
					
					//file.insertTextRow(bottomLineText, bottomRow);
						
						if(!inNumber) {
							topLineText = file.removeRow(bottomRow);
						file.insertTextRow("", topRow);
						}
						else {
							file.insertTextRow("", bottomRow+1);
							topLineText = file.removeRow(topRow);
						}
						
					terminalState.topScrollRowBuffer.push(topLineText);
					}
					
					inEsc = false;
					inBracket = false;
					inNumber = "";
					inText = true;
				}
				
				
				else if(inNumber && char == "h") {
					if(charBuffer) print();
					
					/*
						Esc[20h 	Set new line mode 	LMN
						Esc[?1h 	Set cursor key to application 	DECCKM
						none 	Set ANSI (versus VT52) 	DECANM
						Esc[?3h 	Set number of columns to 132 	DECCOLM
						Esc[?4h 	Set smooth scrolling 	DECSCLM
						Esc[?5h 	Set reverse video on screen 	DECSCNM
						Esc[?6h 	Set origin to relative 	DECOM
						Esc[?7h 	Set auto-wrap mode 	DECAWM
						Esc[?8h 	Set auto-repeat mode 	DECARM
						Esc[?9h 	Set interlacing mode 	DECINLM
						
						ESC[?47h  Save screen
						
					*/
					if(inNumber == 4) {
						terminalState.smoothScrolling = true;
					}
					
					inNumber = "";
					inText = true;
				}
				else if(inNumber && char == "l") { // small L
					if(charBuffer) print();
					
					/*
						Esc[20l 	Set line feed mode 	LMN
						Esc[?1l 	Set cursor key to cursor 	DECCKM
						Esc[?2l 	Set VT52 (versus ANSI) 	DECANM
						Esc[?3l 	Set number of columns to 80 	DECCOLM
						Esc[?4l 	Set jump scrolling 	DECSCLM
						Esc[?5l 	Set normal video on screen 	DECSCNM
						Esc[?6l 	Set origin to absolute 	DECOM
						Esc[?7l 	Reset auto-wrap mode 	DECAWM
						Esc[?8l 	Reset auto-repeat mode 	DECARM
					Esc[?9l 	Reset interlacing mode 	DECINLM
					*/
					
					if(inNumber == 4) {
						terminalState.smoothScrolling = false;
					}
					
					inNumber = "";
					inText = true;
				}
				
				
				// ### Misc
				else if(inEsc && char == "=") {
					console.log("todo: Set alternate keypad mode");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == ">") {
					console.log("todo: Set numeric keypad mode ");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "A" && data.charAt(i-1) == "(") {
					console.log("todo: Set United Kingdom G0 character set");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "A" && data.charAt(i-1) == ")") {
					console.log("todo: Set United Kingdom G1 character set ");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "B" && data.charAt(i-1) == "(") {
					console.log("todo: Set United States G0 character set ");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "B" && data.charAt(i-1) == ")") {
					console.log("todo: Set United States G1 character set");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "0" && data.charAt(i-1) == "(") {
					console.log("todo: Set G0 special chars. & line set ");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "0" && data.charAt(i-1) == ")") {
					console.log("todo: Set G1 special chars. & line set  ");
					// baud rate ??
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "1" && data.charAt(i-1) == "(") {
					console.log("todo: Set G0 alternate character ROM ");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "1" && data.charAt(i-1) == ")") {
					console.log("todo: Set G1 alternate character ROM ");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "2" && data.charAt(i-1) == "(") {
					console.log("todo: Set G0 alt char ROM and spec. graphics");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "2" && data.charAt(i-1) == ")") {
					console.log("todo: Set G1 alt char ROM and spec. graphics");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "N") {
					console.log("todo: Set single shift 2 ");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "O") {
					console.log("todo: Set single shift 3 ");
					inEsc = false;
					inText = true;
				}
				
				// ### Tabs
				else if(inEsc && char == "H") {
					console.log("todo: Set a tab at the current column");
					inEsc = false;
					inText = true;
				}
				else if(inBracket && char == "g") {
					console.log("todo: Clear a tab at the current column");
					inBracket = false;
					inText = true;
				}
				else if(inNumber == "0" && char == "g") {
					console.log("todo: Clear a tab at the current column");
					inNumber = "";
					inText = true;
				}
				else if(inNumber == "3" && char == "g") {
					console.log("todo: Clear all tabs");
					inNumber = "";
					inText = true;
				}
				
				// ### Letters width/height
				else if(inEsc && char == "3" && data.charAt(i-1) == "#") {
					console.log("todo: Double-height letters, top half ");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "4" && data.charAt(i-1) == "#") {
					console.log("todo: Double-height letters, bottom half ");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "5" && data.charAt(i-1) == "#") {
					console.log("todo: Single width, single height letters ");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "6" && data.charAt(i-1) == "#") {
					console.log("todo: Double width, single height letters");
					inEsc = false;
					inText = true;
				}
				
				else if(inNumber && char == "m") { // code=109
					// ### Display mode
					
					if(charBuffer) print();
					
					numberSerie.push(inNumber);
					
					for (var j=0; j<numberSerie.length; j++) {
						// foreground
						if(numberSerie[j] == "30") foregroundColor = colorBlack;
						else if(numberSerie[j] == "31") foregroundColor = colorRed;
						else if(numberSerie[j] == "32") foregroundColor = colorGreen;
						else if(numberSerie[j] == "33") foregroundColor = colorYellow;
						else if(numberSerie[j] == "34") foregroundColor = colorBlue;
						else if(numberSerie[j] == "35") foregroundColor = colorMagenta;
						else if(numberSerie[j] == "36") foregroundColor = colorCyan;
						else if(numberSerie[j] == "37") foregroundColor = colorWhite;
						
						// background
						else if(numberSerie[j] == "40") backgroundColor = colorBlack;
						else if(numberSerie[j] == "41") backgroundColor = colorRed;
						else if(numberSerie[j] == "42") backgroundColor = colorGreen;
						else if(numberSerie[j] == "43") backgroundColor = colorYellow;
						else if(numberSerie[j] == "44") backgroundColor = colorBlue;
						else if(numberSerie[j] == "45") backgroundColor = colorMagenta;
						else if(numberSerie[j] == "46") backgroundColor = colorCyan;
						else if(numberSerie[j] == "47") backgroundColor = colorWhite;
						
						else {
							while(numberSerie[j].length > 0) {
								
								if(numberSerie[j].charAt(0) == "0") {
									resetDisplay(); // Reset all
								}
								else if(numberSerie[j].charAt(0) == "1") {
									bright = true;
								}
								else if(numberSerie[j].charAt(0) == "2") {
									dim = true;
								}
								else if(numberSerie[j].charAt(0) == "4") {
									underscore = true;
								}
								else if(numberSerie[j].charAt(0) == "5") {
									blink = true;
								}
								else if(numberSerie[j].charAt(0) == "7") {
									reverse = true;
								}
								else if(numberSerie[j].charAt(0) == "8") {
									hidden = true;
								}
								
								numberSerie[j] = numberSerie[j].slice(1);
							}
						}
					}
					
					if(backgroundColor == defaultBackgroundColor && EDITOR.settings.style.bgColor == "rgb(255,255,255)") {
						// If there's no background set, the editors default will be used.
						// Many programs asume you are using a black or very dark background for the terminal!
						// So if we are using the white default we have to make some color adjustments
						
						if(foregroundColor == colorYellow) foregroundColor = "#c59800";
						if(foregroundColor == colorCyan) foregroundColor = "#008686";
						if(foregroundColor == colorWhite) foregroundColor = "#828282";
					}
					
					inNumber = "";
					inNumberSerie = false;
					numberSerie.length = 0;
					inText = true;
				}
				
				else if(inNumber && char == "P") {
					// This is not in the spec!!?!? But bash sends it
					if(charBuffer) print();
					
					var times = parseInt(inNumber);
					
					console.log("Delete " + times + " characters");
					for(var j=0; j<times;j++) file.deleteCharacter();
				
					inNumber = "";
					inText = true;
				}
				
				else if(inEsc && code == 109) { // m
					if(charBuffer) print();
					
					inText = true;
					inEsc = false;
				}
				else if(inText) {
					// ### Text
					
					if(code == 10) { // New Line \n
						
						if(charBuffer) print();
						
						console.log("Terminal New line: terminalState.bottomLine=" + terminalState.bottomLine + " file.startRow=" + file.startRow + 
						" file.caret.row=" + file.caret.row + " file.grid.length=" + file.grid.length);
						
						if(terminalState.topLine > 0 && terminalState.bottomLine > 0 && (terminalState.bottomLine -1 + file.startRow) == file.caret.row) {
							file.removeRow(terminalState.topLine-1 + file.startRow);
						}
						
						if(file.caret.row == file.grid.length-1) {
						file.moveCaretToEndOfFile();
							file.writeLineBreak();
						}
						else {
							if(charBuffer) print();
file.insertLineBreak();
						}
					}
					else if(code == 13) {// Carriage Return \r
						if(charBuffer) print();
						//file.moveCaretToEndOfLine();
						file.moveCaretToStartOfLine();
						//file.moveCaretDown();
					}
					else if(code == 8) { // BS  (backspace)  
						//if(file.caret.col > 0) file.moveCaretLeft();
						if(charBuffer) print();
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
						/*
							Optimization:
							Buffer characters instead of inserting them one by one.
						*/
						charBuffer += char;
						
					}
					
					terminalState.caret.row = file.caret.row;
					terminalState.caret.col = file.caret.col;
					
				}
				
			}
			
			if(charBuffer) print();
			
			EDITOR.renderNeeded();
			
			function print() {
				
				console.log("Terminal Insert: " + UTIL.lbChars(charBuffer) + " backgroundColor=" + backgroundColor + " foregroundColor=" + foregroundColor + " reverse=" + reverse);
				//if(!file.caret.eol && (data.charCodeAt(0) == 8 || data.charCodeAt(data.length-1) == 8 || data.charCodeAt(i-1) == 8 || data.length == 1 )) file.deleteCharacter();
				// terminal always overwrite !?
				var colStart = file.caret.col;
				if(!file.caret.eol && !terminalState.smoothScrolling) {
					var deleteTo = Math.min(file.caret.index + charBuffer.length-1, file.caret.index + file.grid[file.caret.row].length - file.caret.col - 1);
					file.deleteTextRange(file.caret.index, deleteTo);
				}
				file.insertText(charBuffer);
				charBuffer = "";
				
				if(backgroundColor != defaultBackgroundColor) {
					for(var col=colStart; col<file.caret.col; col++) file.grid[file.caret.row][col].bgColor = backgroundColor;
				}
				if(foregroundColor != defaultForeGroundColor) {
					for(var col=colStart; col<file.caret.col; col++) file.grid[file.caret.row][col].color = foregroundColor;
				}
				else if(reverse) {
					// Make the (default?) text color the background and the bacgkround the text color
					for(var col=colStart; col<file.caret.col; col++) {
						file.grid[file.caret.row][col].bgColor = EDITOR.settings.style.textColor;
						file.grid[file.caret.row][col].color = EDITOR.settings.style.bgColor;
					}
				}
				
				terminalState.caret.col = file.caret.col;
			}
			
			function resetDisplay() {
				bright = false;
				dim = false;
				underscore = false;
				blink = false;
				reverse = false;
				hidden = false;
				foregroundColor = defaultForeGroundColor;
				backgroundColor = defaultBackgroundColor;
			}
			
		}
	}
	
	function terminalKeyPressed(file, character, combo) {
		
		var isTerminal = terminalFiles.indexOf(file) != -1;
		
		if(!isTerminal) return ALLOW_DEFAULT;
		
		var terminalId = file.path.match(reTerm)[1];
		
		console.log("terminalKeyPressed: " + character);
		
		if(!EDITOR.input) return ALLOW_DEFAULT;
		
		if(EDITOR.mode != "default") return ALLOW_DEFAULT;
		
		if(ctrlKeyPressed) {
			// Turn the character into a control character
			var ascii = character.toUpperCase().charCodeAt(0) - 64;
			character = String.fromCharCode(ascii);
			ctrlKeyPressed = false;
		}
		else if(altKeyPressed) {
			// Send an Escape character before the character
			character = ESC + character;
			altKeyPressed = false;
		}
		
		CLIENT.cmd("terminal.write", {id: terminalId, data: character}, function terminalWrite(err) {
			if(err) alertBox(err.message, err.code || "TERMINAL_ERROR");
		});
		
		return PREVENT_DEFAULT;
	}
	
	function terminalKeyDown(file, character, combo, keyDownEvent) {
		/*
			
			Sending alt-combois: First send Esc, then the letter!?
			Example: Alt+A = Esc+A
			
		*/
		
		if(terminalFiles.indexOf(file) == -1) return ALLOW_DEFAULT;
		
		var code = keyDownEvent.charCode || keyDownEvent.keyCode;
		
		console.log("terminalKeyDown: character=" + character + " (" + code + ") combo=" + JSON.stringify(combo));
		
		if(!EDITOR.input) return ALLOW_DEFAULT;
		
		var id = file.path.match(reTerm)[1];
		var data;
		
		
		if(code == 8) { // backspace
			data = character;
		}
		else if(code == 9) { // tab
			data = "\t";
		}
		else if(code == 13) { // Enter
			data = character;
			
			// We don't want the text right of the caret to cary over to the next line!
			
			// Check for open or edit command
			
			var rowText = file.rowText(file.caret.row);
			// ltest1@zpc:/repo/tensorflow$ open README.md
			// bash-4.3$ open README.md
			var reCmd = /^(.*)?:(.*)\$ ([^ ]*) (.*)$/
			var reBash = /bash\-([\d.]*)\$() ([^ ]*) (.*)$/
			
			var match = rowText.match(reCmd) || rowText.match(reBash);
			if(match && match.length == 5) {
				var folder = match[2];
				var command = match[3];
				if(command == "open" || command == "edit") {
					var path = UTIL.trailingSlash(folder) + match[4];
					
					//data = String.fromCharCode(1); // Go to start of command
					//data += "echo ";
					//data += character; // Enter
					
					path = path.trim(); // Remove trailing space
					
					EDITOR.openFile(path, undefined, {show: true}, function(err, file) {
						if(err && err.code == "ENOENT") {
							EDITOR.openFile(path, "", {show: true}); // Create new empty file
						}
						else if(err) alertBox(err.message);
					});
				}
			} 
			else console.warn("Unable to match command: rowText=" + rowText + " match=" + JSON.stringify(match));
			
		}
		else if(code == 37 && combo.sum == 0) { // arrow left
			data = ESC + "[D";
		}
		else if(code == 38 && combo.sum == 0) { // arrow up
			data = ESC + "[A";
		}
		else if(code == 39 && combo.sum == 0) { // arrow right
			data = ESC + "[C";
		}
		else if(code == 40 && combo.sum == 0) { // arrow down
			data = ESC + "[B";
		}
		else if(code == 46 && combo.sum == 0) { // Delete
			// ab|c => We will get \b\u001b[1Pc\b (BACK DEL1 c BACK
			data = ESC + "[C" + String.fromCharCode(127); // Move right then delete
		}
		
		// CTRL+ (we'll use ALT instead)
		else if(character == "A" && combo.alt) {
			data = String.fromCharCode(1);
		}
		else if(character == "B" && combo.alt) {
			data = String.fromCharCode(2);
		}
		else if(character == "C" && combo.alt) { // Alt+C (instead of Ctrl+C which is used for copying)
			data = String.fromCharCode(3); // ETX (end of text)
		}
		else if(character == "D" && combo.alt) {
			data = String.fromCharCode(4);
		}
		else if(character == "E" && combo.alt) {
			data = String.fromCharCode(5);
		}
		else if(character == "F" && combo.alt) {
			data = String.fromCharCode(6);
		}
		else if(character == "G" && combo.alt) {
			data = String.fromCharCode(7);
		}
		else if(character == "H" && combo.alt) {
			data = String.fromCharCode(8);
		}
		else if(character == "I" && combo.alt) {
			data = String.fromCharCode(9);
		}
		else if(character == "J" && combo.alt) {
			data = String.fromCharCode(10);
		}
		else if(character == "K" && combo.alt) {
			data = String.fromCharCode(11);
		}
		else if(character == "L" && combo.alt) {
			data = String.fromCharCode(12);
		}
		else if(character == "M" && combo.alt) {
			data = String.fromCharCode(13);
		}
		else if(character == "N" && combo.alt) {
			data = String.fromCharCode(14);
		}
		else if(character == "O" && combo.alt) {
			data = String.fromCharCode(15);
		}
		else if(character == "P" && combo.alt) {
			data = String.fromCharCode(16);
		}
		else if(character == "Q" && combo.alt) {
			data = String.fromCharCode(17);
		}
		else if(character == "R" && combo.alt) {
			data = String.fromCharCode(18);
		}
		else if(character == "S" && combo.alt) {
			data = String.fromCharCode(19);
		}
		else if(character == "T" && combo.alt) {
			data = String.fromCharCode(20);
		}
		else if(character == "U" && combo.alt) {
			data = String.fromCharCode(21);
		}
		else if(character == "V" && combo.alt) {
			data = String.fromCharCode(22);
		}
		else if(character == "W" && combo.alt) {
			data = String.fromCharCode(23);
		}
		else if(character == "X" && combo.alt) {
			data = String.fromCharCode(24);
		}
		else if(character == "Y" && combo.alt) {
			data = String.fromCharCode(25);
		}
		else if(character == "Z" && combo.alt) {
			data = String.fromCharCode(26);
		}
		else if(combo.alt && combo.shift) {
			data = ESC + character;
		}
		else return ALLOW_DEFAULT;
		
		CLIENT.cmd("terminal.write", {id: id, data: data}, function terminalWrite(err) {
			if(err) alertBox(err.message, err.code || "TERMINAL_ERROR");
		});
		
		return PREVENT_DEFAULT;
	}
	
	function terminalCloseFile(file) {
		if(typeof file == "string") {
			file = EDITOR.files[file];
		}
		
		if(terminalFiles.indexOf(file) == -1) return true;
		
		var id = file.path.match(reTerm)[1];
		
		file.write("\n\nClosing " + file.path + " session " + new Date());
		EDITOR.renderNeeded();
		
		CLIENT.cmd("terminal.close", {id: id}, function terminalClose(err) {
			if(err && err.code != "UNKNOWN_TERMINAL_ID") alertBox(err.message);
		});
		
		while(terminalFiles.indexOf(file) != -1) terminalFiles.splice(terminalFiles.indexOf(file), 1);
		
	}
	
	function exitAllTerminals() {
		console.log("exitAllTerminals: " + terminalFiles.length);
		for (var i=0; i<terminalFiles.length; i++) terminalCloseFile(terminalFiles[i]);
		return true;
	}
	
	function TerminalState() {
		this.topLine = 0;
		this.bottomLine = EDITOR.view.visibleRows;
		this.topScrollRowBuffer = [];
		this.bottomScrollRowBuffer = [];
		this.caret = {row: 0, col: 0};
	}
	
	
	// TEST-CODE-START
	
	// Need to be sync because files opened via terminal get showFile priority (which lasts for five seconds)
	EDITOR.addTest(1000, false, function openFileFromTerminal(callback) {
		
		EDITOR.openFile("terminal1337", '', function(err, file) {
			terminalFiles.push(file);
			
			var testFile = "testOpenFileFromTerminal"
			var filesOpened = 0;
			var filesClosed = 0;
			
			bash("ltest1@zpc:/repo/tensorflow$", "/repo/tensorflow/" + testFile);
			bash("bash-4.3$", "/" + testFile);
			
			function bash(bashPrompt, filePath) {
				
				filesOpened++;
				
				filePath = filePath + filesOpened;
				
				file.write(bashPrompt + ' open ' + testFile + filesOpened);
				
				
				EDITOR.mock("keydown", {charCode: 13, target: "canvas"}); // Simulate Press enter
				
				if(! (filePath in EDITOR.files) && EDITOR.openFileQueue.indexOf(filePath) == -1) throw new Error("Expected " + filePath + " to be opened! bashPrompt=" + bashPrompt);
				
				file.writeLineBreak();
				
				// Wait until the file have been opened, then close it
				setTimeout(function closeTheFile() {
					console.log( "openFileFromTerminal: EDITOR.files=" + JSON.stringify(Object.keys(EDITOR.files)) + " closing " + filePath + " ..." );
					EDITOR.closeFile(filePath);
					filesClosed++;
					if(filesClosed==filesOpened) {
						// Test finished!
						
						EDITOR.closeFile(file.path);
						
						EDITOR.showFileReset(); // Because files opened from the editor get show state to prevent other files to get shown
						
						EDITOR.closeAllDialogs("UNKNOWN_TERMINAL_ID");
						
						callback(true);
					}
					
				}, 1000);
				
			}
		});
	});
	
	
	// TEST-CODE-END
	
})();