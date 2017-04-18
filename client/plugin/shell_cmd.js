/*
	todo:
	
	Run on remote server
	Support interaction, for example enter text to prompts
	
*/

(function() {
	"use strict";
	
	var shellMenuItem;
	var shellFile;
	var promptString = "$ ";
	
	EDITOR.plugin({
		desc: "Run shell commands on local or remote system",
		load: loadShell,
		unload: unloadShell,
	});
	
	function loadShell() {
		shellMenuItem = EDITOR.addMenuItem("Shell command ...", function() {
			createShellFile();
			EDITOR.hideMenu();
		});
		
		var T = 84;
		var ENTER = 13;
		
		EDITOR.bindKey({desc: "Run shell command", charCode: ENTER, fun: runShellCommand});
		EDITOR.bindKey({desc: "Enter shell commands", charCode: T, combo: CTRL, fun: createShellFile});
		
	}
	
	function unloadShell() {
		
		if(shellMenuItem) EDITOR.removeMenuItem(shellMenuItem);
		EDITOR.unbindKey(createShellFile);
		
		EDITOR.unbindKey(runShellCommand);
		
	}
	
	function createShellFile() {
		
		EDITOR.openFile("shell", promptString, function shellFileOpen(err, file) {
			
			shellFile = file;
			
			shellFile.lineBreak = "\n";
			
			shellFile.moveCaretToEnd();
			
		});
		
	}
	
	function runShellCommand(file, combo, character, charCode, direction, targetElementClass) {
		
		if(file == shellFile && file) {
			
			// This will always run after keyboard_enter.js because this is a plugin, while keyboard_enter.js is just a key binding
			// So we have to check the line above the carret because of the just inserted line break
			var row = file.caret.row-1;
			var rowText = shellFile.rowText(row);
			
			
			if(rowText.indexOf(promptString) === 0) {
				
				var commandToRun = rowText.substr(promptString.length);
				
				var execOptions = {
					encoding: 'utf8',
					timeout: 2000,
					maxBuffer: 200*1024,
					killSignal: 'SIGTERM',
					cwd: null,
					env: null
				}
				
				if(runtime == "nw.js") {
					var exec = require('child_process').exec;
					
					exec(commandToRun, execOptions, function(err, stdout, stderr) {
						
						var output = stdout + stderr;
						
						output = output.replace(/\r/g, "");
						
						shellFile.insertTextRow(output, file.caret.row);
						
						shellFile.insertText(promptString);
						
					});
				}
				
			}
			
			
			
			
			
			return false;
		}
		else return true;
		
	}
	
})();

