
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
			
			var keyEscape = 27;
			EDITOR.bindKey({desc: "Send ETX (end of text) to terminal (Instead of Ctrl+C which is used for copying)", fun: terminalEndOfText, charCode: keyEscape, combo: 0});
			
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
			
			http://www.termsys.demon.co.uk/vtansi.htm
			http://ascii-table.com/ansi-escape-sequences-vt-100.php
			
			
		*/
		
			function parse(data) {
				
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
			var defaultBackgroundColor = EDITOR.settings.style.bgColor;
			
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
			
			for (var i=0; i<data.length; i++) {
					char = data.charAt(i);
					code = data.charCodeAt(i);
					
				console.log("char=" + char + " code=" + code + " inEsc=" + inEsc + " inText=" + inText + " inBracket=" + inBracket + 
				" inNumberSerie=" + inNumberSerie + " inNumber=" + inNumber + " ");
					
					if(code == 7) { // BEL
					inNumber = "";
					inNumberSerie = false;
					numberSerie.length = 0;
					inText = true;
					}
					else if(code == 13) { // cr
					}
					else if(code == 27) { // ESC
						inEsc = true;
						inText = false;
					inBracket = false;
					inNumberSerie = false;
					inNumber = "";
					numberSerie.length = 0;
				}
				else if(inEsc && (code == 91 || code == 93)) { // 91=[  93=]  
					inBracket = true;
						inEsc = false;
					}
					else if(inBracket && char == "K") {
						// Erase End of Line
						// todo: Erase until end of line
						var row = file.grid[file.caret.row];
						if(row.length > file.caret.col) {
							var firstIndex = file.caret.index;
							var lastIndex = row[row.length-1].index;
							file.deleteTextRange(firstIndex, lastIndex);
						}
						inBracket = false;
						inText = true;
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
					resetDisplay();
					inBracket = false;
					inText = true;
				}
				
				else if(inNumberSerie && char == "r") {
					console.log("todo: Set top and bottom lines of a window"); 
					// What does this mean !?!?!?
					inNumberSerie = false;
					numberSerie.length = 0;
					inNumber = "";
					inText = true;
				}
				
				
				
				// ### Clearing lines
				else if(char == "K" && (inBracket || inNumber == "0") ) {
					console.log("todo: Clear line from cursor right ");
				}
				else if(char == "K" && inNumber == "1") {
					console.log("todo: Clear line from cursor left ");
				}
				else if(char == "K" && inNumber == "2") {
					console.log("todo: Clear entire line ");
				}
				
				// ### Clearing screen
				else if(char == "J" && (inBracket || inNumber == "0") ) {
					console.log("todo: Clear screen from cursor down");
				}
				else if(char == "J" && inNumber == "1") {
					console.log("todo: Clear screen from cursor up ");
				}
				else if(code == 74 && inNumber == "2") { // J
					var startRow = file.startRow;
					var caretX = file.caret.col;
					
					console.log("Clear entire screen! startRow=" + startRow + " file.grid.length=" + file.grid.length);
					
					for(var row=startRow; row<file.grid.length; row++) {
						console.log("Clearing row=" + row);
						file.removeAllTextOnRow(row);
					}
					
					//file.scrollTo(caretX, startRow);
					}
				
				// ### Moving the cursor
				else if(inBracket && char == "H") {
					console.log("Move cursor to upper left corner");
					file.moveCaret(undefined, file.startRow, 0);
				}
				else if(inNumberSerie && char == "H") {
					var toCol = parseInt(inNumber) - 1;
					var toRow = file.startRow + parseInt(numberSerie.pop()) - 1;
					
					console.log("Move cursor to screen location vertically " + toRow + ", horizontally " + toCol + " ");
					
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
						file.insertText(spaces);
					}
						
					file.moveCaret(undefined, toRow, toCol);
					
						inNumber = "";
						inNumberSerie = false;
					//numberSerie.length = 0;
					if(numberSerie.length > 0) throw new Error("Unexpected numberSerie.length=" + numberSerie.length + " numberSerie=" + JSON.stringify(numberSerie));
						inText = true;
						}
				else if(inNumber && char == "A") {
					var times = parseInt(inNumber);
					console.log("Move cursor up " + times + " lines");
					for(var j=0; j<times;j++) file.moveCaretUp();
					
					inNumber = "";
					inText = true;
				}
				else if(inNumber && char == "B") {
					var times = parseInt(inNumber);
					console.log("Move cursor down " + times + " lines");
					for(var j=0; j<times;j++) file.moveCaretDown();
					
					inNumber = "";
					inText = true;
				}
				else if(inNumber && char == "C") {
					var times = parseInt(inNumber);
					console.log("Move cursor right " + times + " lines");
					for(var j=0; j<times;j++) file.moveCaretRight();
					
					inNumber = "";
					inText = true;
				}
				else if(inNumber && char == "D") {
					var times = parseInt(inNumber);
					console.log("Move cursor left " + times + " lines");
					for(var j=0; j<times;j++) file.moveCaretLeft();
					
					inNumber = "";
					inText = true;
				}
				
				else if(inNumber && code == 104) { // h
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
					*/
					
					inNumber = "";
					inText = true;
				}
				else if(inNumber && code == 108) { // l
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
					Esc[?9l 	Reset interlacing mode 	DECINLM*/
					
					inNumber = "";
					inText = true;
				}
				
				else if(inNumber && code == 109) { // m
						// ### Display mode
						
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
					
					inNumber = "";
					inNumberSerie = false;
					numberSerie.length = 0;
					inText = true;
				}
				
				else if(inEsc && code == 109) { // m
					inText = true;
					inEsc = false;
				}
				else if(inText) {
					// ### Text
					
					if(code == 10) {
						file.moveCaretToEnd();
						file.writeLineBreak();
					}
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
						if(!file.caret.eol && (data.charCodeAt(i-1) == 8 || data.length == 1 )) file.deleteCharacter();
							file.putCharacter(char);
						if(foregroundColor != defaultForeGroundColor) file.grid[file.caret.row][file.caret.col-1].color = foregroundColor;
					}
				}
			}
			EDITOR.renderNeeded();
			
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
		
			// We don't want the text right of the caret to cary over to the next line!
			//file.writeLineBreak();
			//file.moveCaretToEnd();
		}
		else if(code == 67 && combo.alt) { // Alt+C (instead of Ctrl+C which is used for copying)
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
		else if(code == 9) { // tab
			data = "\t";
		}
		
		else return true;
		
		CLIENT.cmd("terminal.write", {id: id, data: data}, function terminalWrite(err) {
			if(err) alertBox(err.message);
		});
		
		return false;
	}
	
	function terminalEndOfText(file, combo, character, charCode, keyPushDirection, targetElementClass) {
		if(terminalFiles.indexOf(file) == -1) return true;
		
		var id = file.path.match(reTerm)[1];
		var data = String.fromCharCode(3); // ETX (end of text) 
		
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