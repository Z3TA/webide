(function() {
	"use strict";
	
	/*
		Reason we ditched the old self_debugger (that Attached itself to the chromium debug tool's console)
		is that ONLY ONE socket can connect to the chromium debug tool's console.
		
		The goal of this plugin is to create automatic tests ceases and bug-repeats
		 by recording all editor inputs and save state. 
		
		It might require several steps to put the editor in a bad state.
		Record all steps from when the file? or editor? was opened. 
		
		Most state bugs will probably be isolated to the file that's being worked on!?
		
	*/
	
	var files = {};
	var fileState = {};
	
	//editor.on("fileOpen", selfDebugFileOpen);
	//editor.on("fileClose", selfDebugFileClose);
	//editor.on("interaction", selfDebugInteraction);
	//editor.on("fileChange", selfDebugFileChange);
	
	
	editor.plugin({
		desc: "Send bug reports",
		load: bugReportLoad,
		unload: bugReportUnload,
	});
	
	
	function bugReportLoad() {
		var key_S = 83;
		editor.bindKey({desc: "Send bug report", charCode: key_S, fun: sendBugReport, combo: CTRL + SHIFT});
	}
	
	function bugReportUnload() {
		
	}
	
	function sendBugReport() {
		
		var file = editor.currentFile;
		
		if(file) {
			if(file.name.indexOf("bugreport") != -1) {
				
				var yes = "Send bug report";
				var no = "Cancel";
				confirmBox("Send this file as bug report?\n" + file.path, [yes, no], function (answer) {
				
					if(answer == yes) {
				
				var message = file.text;
				
					httpPost("https://www.webtigerteam.com/mailform.nodejs", { meddelande: message, namn: 'JZEdit' }, function (respStr, err) {
					if(err) {
						alert("Problem sending bug report:  " + err.message);
						throw err;
					}
					else if(respStr.indexOf("Bad Gateway") != -1 || respStr.indexOf("Meddelande mottaget") == -1) {
						alert("Problem with bug reporting server. Try e-mailing the bug report. " + respStr);
						console.log("respStr=" + respStr);
					}
					else {
						alert("Bug report sent!");
					}
					});
				}
		});
				return false;
		}
		}
		return true;
	}
	
	function selfDebugFileOpen(file) {
		files[file] = {text: file.text, caret: {index: file.caret.index, row: file.caret.row, col: file.caret.col}, actions: []}; // Save state
	}
	
	function selfDebugFileClose(file) {
		// Delete state
		delete files[file];
		delete fileState[file];
	}
	
	function selfDebugFileChange(file, change) {
		if(!fileState[file]) fileState[file] = [];
		
		fileState[file].push(file.text)
	}
	
	
	function selfDebugInteraction(interaction, options) {
		var file = editor.currentFile;
		
		if(file) {
			
			if(files[file]) {
				
				
				
				if(interaction == "keyDown") files[file].actions.push({interaction: interaction, options: options, fileState: fileState[file]});
			}
			
}
	}
	
	window.onerror = function(message, source, lineno, colno, error) {
		
		var yes = "Close/restart editor";
		var createTestRestart = "Create a test case and restart";
		var createTestKeepRunning = "Create a test case and keep running";
		var sendBugReport = "Write bug report";
		var no = "Keep running";
		confirmBox("" + source + ":<b>" + lineno + "</b><br>" + message + "<br><br>Close/restart the editor ?", [
			yes, sendBugReport, no
		], function (answer) {
			
			if(answer == createTestRestart || answer == createTestKeepRunning) {
				
				// Create a test case for automated testing
				
				
				if(answer == createTestRestart) answer = yes;
				
}
			else if(answer == sendBugReport) {
				var errorReportFilePath = "bugreport.txt";
				editor.openFile(errorReportFilePath, reportTemplate(message, source, lineno, colno, error), function errorReportOpened(err, file) {
					
					if(err) GUI.showDevTools();
					
					file.moveCaretToEnd(file.caret, function() {
						file.scrollToCaret(file.caret);
					});
				});
				
				
			}
			
			if(answer == yes) {
				process.exit(1); // Exit code=1 should make the batch/bash script restart the editor
			}
			else {
				if(editor.devMode) {
					// Show the chrome dev tools
					var gui = require('nw.gui').Window.get();
					gui.showDevTools();
				}
}
			
		});
		
	}
	
	
	
	function reportTemplate(message, source, lineno, colno, error) {
		// Create a template used to report bugs
		
		var message = 'To: "Johan Zetterberg" <zeta@zetafiles.org>\n' +
		'Subject: JZedit ' + source + ' (line ' + lineno + ' col ' + colno + ')\n' +
		'\n' +
		'Date:' + (new Date()) + '\n' +
		'Commit: ' + editor.version + '\n' +
		'Platform: ' + process.platform + '\n' +
		'Arguments: ' + require('nw.gui').App.argv + '\n' +
		'\n' +
		error.stack + '\n' +
		'\n' +
		'How to repeat:\n' + 
		'\n' + 
		'\n' + 
		'Hit Ctrl + Shift + S to send this report over HTTPS. (this only works if "bugreport" is in the file-name)\n' + 
		'Or e-mail the bug report with your favorite email client (to the e-mail address at the top)\n';
		
		return message;
	}
	
})();