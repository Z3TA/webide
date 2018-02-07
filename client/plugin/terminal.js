
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
			
			if(!file.terminal) file.terminal = {
				topLine: 0,
				bottomLine: EDITOR.view.visibleRows,
				topScrollRowBuffer: [],
				bottomScrollRowBuffer: []
			};
			var terminalState = file.terminal;
			
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
				
				else if(inNumberSerie && inNumber && char == "r") {
					
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
					var caretX = file.caret.col;
					
					console.log("Clear entire screen! startRow=" + startRow + " file.grid.length=" + file.grid.length);
					
					for(var row=startRow; row<file.grid.length; row++) {
						console.log("Clearing row=" + row);
						file.removeAllTextOnRow(row);
					}
					
					//file.scrollTo(caretX, startRow);
					
					inNumber = "";
					inText = true;
				}
				
				// ### Moving the cursor
				else if((inEsc || inNumber || inBracket) && char == "A") {
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
					console.log("Move cursor to upper left corner");
					file.moveCaret(undefined, file.startRow, 0);
					inEsc = false;
					inBracket = false;
					inText = true;
				}
				else if(inNumberSerie && (char == "H" || char == "f")) {
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
						file.insertText(spaces);
					}
					
					file.moveCaret(undefined, toRow, toCol);
					
					inNumber = "";
					inNumberSerie = false;
					//numberSerie.length = 0;
					if(numberSerie.length > 0) throw new Error("Unexpected numberSerie.length=" + numberSerie.length + " numberSerie=" + JSON.stringify(numberSerie));
					inText = true;
				}
				else if(inEsc && char == "E") {
					console.log("todo: Move to next line");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "7") {
					console.log("todo: Save cursor position and attributes");
					inEsc = false;
					inText = true;
				}
				else if(inEsc && char == "8") {
					console.log("todo: Restore cursor position and attributes");
					inEsc = false;
					inText = true;
				}
				
				// ### Scrolling
				else if( (inEsc || inNumber) && (char == "D" || char == "L")) {
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
				
				else if(inNumber && char == "P") {
					// This is not in the spec!!?!? But bash sends it
					var times = parseInt(inNumber);
					
					console.log("Delete " + times + " characters");
					for(var j=0; j<times;j++) file.deleteCharacter();
				
					inNumber = "";
					inText = true;
				}
				
				else if(inEsc && code == 109) { // m
					inText = true;
					inEsc = false;
				}
				else if(inText) {
					// ### Text
					
					if(code == 10) { // New Line \n at cursor! (todo: add the line at the cursor and not eof!)
						var bottomLine = file.startRow;
						if(terminalState.bottomLine > 0) bottomLine += terminalState.bottomLine-1;
							file.moveCaretToEndOfFile();
						file.writeLineBreak();
						}
					else if(code == 13) {// Carriage Return
						//file.moveCaretToEndOfLine();
						file.moveCaretToStartOfLine();
						//file.moveCaretDown();
					}
					else if(code == 8) { // BS  (backspace)  
						//if(file.caret.col > 0) file.moveCaretLeft();
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
						console.log("Terminal Insert: " + UTIL.lbChars(char) + " backgroundColor=" + backgroundColor + " foregroundColor=" + foregroundColor + " reverse=" + reverse);
						//if(!file.caret.eol && (data.charCodeAt(0) == 8 || data.charCodeAt(data.length-1) == 8 || data.charCodeAt(i-1) == 8 || data.length == 1 )) file.deleteCharacter();
						// terminal always overwrite !?
						if(!file.caret.eol && !terminalState.smoothScrolling) file.deleteCharacter();
						file.putCharacter(char);
						
						if(backgroundColor != defaultBackgroundColor) file.grid[file.caret.row][file.caret.col-1].bgColor = backgroundColor;
						
						if(foregroundColor != defaultForeGroundColor) file.grid[file.caret.row][file.caret.col-1].color = foregroundColor;
						else if(reverse) {
							// Make the (default?) text color the background and the bacgkround the text color
							file.grid[file.caret.row][file.caret.col-1].bgColor = EDITOR.settings.style.textColor;
							file.grid[file.caret.row][file.caret.col-1].color = EDITOR.settings.style.bgColor;
						}
						
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
		
		
		
		if(code == 8) { // backspace
			data = character;
		}
		else if(code == 9) { // tab
			data = "\t";
		}
		else if(code == 13) { // Enter
			data = character;
			
			// We don't want the text right of the caret to cary over to the next line!
			//file.writeLineBreak();
			//file.moveCaretToEndOfFile();
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