(function self_debug() {
	"use strict";
	
	/*
		Reason we ditched the old self_debugger (that Attached itself to the chromium debug tool's console)
		is that ONLY ONE socket can connect to the chromium debug tool's console.
		
		Idea
		----
		Create automatic tests cases and bug-repeat's
		 by recording all editor inputs and save state. 
		
		It might require several steps to put the editor in a bad state.
		Record all steps from when the file? or editor? was opened. 
		
		Most state bugs will probably be isolated to the file that's being worked on!?
		
	*/
	
	var files = {};
	var fileState = {};
	
	//EDITOR.on("fileOpen", selfDebugFileOpen);
	//EDITOR.on("fileClose", selfDebugFileClose);
	//EDITOR.on("interaction", selfDebugInteraction);
	//EDITOR.on("fileChange", selfDebugFileChange);
	
	var winMenuBugreport;
	
	window.onerror = windowError;
	
	EDITOR.plugin({
		desc: "Send bug reports",
		load: bugReportLoad,
		unload: bugReportUnload,
	});
	
	
	function bugReportLoad() {
		var key_S = 83;
		EDITOR.bindKey({desc: "Send bug report", charCode: key_S, fun: sendBugReport, combo: CTRL + SHIFT});
		
		winMenuBugreport = EDITOR.windowMenu.add("Send bug report", ["Editor", 8], sendBugReport);
		
		EDITOR.on("error", windowError);
		EDITOR.on("showMenu", showSendBugReportMenuItem);
		
	}
	
	function bugReportUnload() {
		EDITOR.unbindKey(sendBugReport);
		
		EDITOR.removeEvent("error", windowError);
		EDITOR.removeEvent("showMenu", showSendBugReportMenuItem);
	
		EDITOR.windowMenu.remove(winMenuBugreport);
	}
	
	function showSendBugReportMenuItem() {
		var file = EDITOR.currentFile;
		
		if(!file) return true;
		
		if(file.name.indexOf("bugreport") != -1) {
			var addSeparator = true;
			var tmpMenuItem = EDITOR.ctxMenu.addTemp("Send bug report", addSeparator, function sendBugReportWithoutAsking() {
				sendBugReport(false);
			});
		}
	}
	
	function sendBugReport(askFirst) {
		if(typeof askFirst != "boolean") askFirst = true; 
		
		EDITOR.ctxMenu.hide();
		winMenuBugreport.hide();
		
		var file = EDITOR.currentFile;
		
		if(!file) {
			alertBox("Open a file that you want to send as a bug report");
			return true;
		}
		
		if(file.name.indexOf("bugreport") == -1) askFirst = true;
		
		if(askFirst) {
					var yes = "Send bug report";
				var no = "Cancel";
				confirmBox("Send this file as bug report?\n" + file.path, [yes, no], function (answer) {
				if(answer == yes) sendit();
});
				}
				else {
sendit();
		}
		
		return true;
		
		function sendit() {
			var message = file.text;
			UTIL.httpPost("https://www.webtigerteam.com/mailform.nodejs", { meddelande: message, namn: 'JZEdit' }, function (err, respStr) {
				if(err) {
					alertBox("Problem sending bug report:  " + err.message);
					throw err;
				}
				else if(respStr.indexOf("Bad Gateway") != -1 || respStr.indexOf("Meddelande mottaget") == -1) {
					alertBox("Problem with bug reporting server. Try e-mailing the bug report. " + respStr);
					console.log("respStr=" + respStr);
				}
				else {
					alertBox("Bug report sent!");
				}
			});
		}
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
		var file = EDITOR.currentFile;
		
		if(file) {
			
			if(files[file]) {
				
				
				
				if(interaction == "keyDown") files[file].actions.push({interaction: interaction, options: options, fileState: fileState[file]});
			}
			
}
	}
	
	function windowError(message, source, lineno, colno, error) {
		
		console.warn("Error detected! message=" + message + " source=" + source + " lineno=" + lineno + " colno=" + colno);
		
		console.log("EDITOR.platform=" + EDITOR.platform);
		
		findSourcePath(source, function(err, source) {
			if(err) alertBox(err);
			showErrorMessage(message, source, lineno, colno, error)
		});
		
		EDITOR.stat("error");
		
	}
	
	function findSourcePath(source, callback) {
		if(source.indexOf("file:") == 0) {
			// If Windows detects / it will add C:/
			// If Linux does Not detect / it will will add the working dir
			if(EDITOR.platform == "Windows") {
				source = source.replace("file:///", ""); // Remove three slashes in windows
			}
			else {
				source = source.replace("file://", ""); // Two slashes in linux (and other?)
			}
			return callback(null, source);
		}
		else {
			
			// The source is always in client folder
			var url = UTIL.getLocation(source);
			console.log(url);
			console.log("document.location.href=" + document.location.href);
			console.log("url.pathname=" + url.pathname);
			
			var source = source.replace(url.pathname, "/client" + url.pathname);
			console.log("source=" + source);
			
			if(EDITOR.user) {
				source = EDITOR.installDirectory + 'client/' + url.pathname;
				return callback(null, source);
			}
			else {
				// We might not be logged in. Wait to see if EDITOR.installDirectory is populated
				setTimeout(function() {
					source = EDITOR.installDirectory + 'client/' + url.pathname;
					return callback(null, source);
				}, 3000);
			}
		}
	}
	
	
	function showErrorMessage(message, source, lineno, colno, error) {
		console.log("source=" + source);
		source = UTIL.toSystemPathDelimiters(source);
		
		if(EDITOR.settings.devMode) {
			if(source.indexOf("file:") != 0 && EDITOR.installDirectory == "/") {
				// EDITOR.openFileTool
			}
			
			var sourceLink = '<a href="JavaScript: EDITOR.openFile(\'' + source.replace(/\\/g, "\\\\") + '\', undefined, function(err, file) {\
			if(err) alertBox(err.message); else file.gotoLine(' + lineno + ');\
			EDITOR.renderNeeded();})">' + source + "</a>";
		}
		else {
			var sourceLink = '' + source + "";
		}
		
		var lineString = ":<b>" + lineno + "</b><br>";
		
		
		if(!source) {
			message = "There have been an error. Check the developer tools for more info!"
			sourceLink = "";
			lineString = "";
		}
		
		// We need editor errors to look different to other dialogs.
		// Or the user will think all dialogs are editor errors, especially if it's a JavaScript error.
		var death = document.createElement("div");
		death.setAttribute("id", "errorOverlay");
		death.style.width = window.innerWidth + "px";
		death.style.height = window.innerHeight + "px";
		death.style.zIndex = "2";
		death.style.position = "absolute";
		death.style.top = "0px";
		death.style.left = "0px";
		death.style.backgroundColor = "darkred";
		death.style.opacity = "0.5";
		
		var deathText = document.createElement("span");
		deathText.style.fontSize = "20px";
		deathText.innerText = "EDITOR ERROR (CRASH): WARNING! THE EDITOR MIGHT BE IN A BAD STATE! Restarting the editor is adviced. A bug report would be helpful.";
		
		death.appendChild(deathText);
		
		if(document && document.body) document.body.appendChild(death);
		
		
		
		var yes = "Close/restart editor";
		var createTestRestart = "Create a test case and restart";
		var createTestKeepRunning = "Create a test case and keep running";
		var sendBugReport = "Write bug report";
		var no = "Keep running";
		
		confirmBox("" + sourceLink + lineString + message + "<br><br>Close/restart the editor ?", [
			yes, sendBugReport, no
		], function (answer) {
			
			if(answer == createTestRestart || answer == createTestKeepRunning) {
				
				// Create a test case for automated testing
				
				
				if(answer == createTestRestart) answer = yes;
				
			}
			else if(answer == sendBugReport) {
				var errorReportFilePath = "bugreport.txt";
				EDITOR.openFile(errorReportFilePath, reportTemplate(message, source, lineno, colno, error), function errorReportOpened(err, file) {
					if(err && typeof GUI != "undefined") GUI.showDevTools(); // nw.js
					
					if(err) return alertBox("Unable to open errorReportFilePath=" + errorReportFilePath + " Error: " + err.message);
					
					file.moveCaretToEndOfFile(file.caret, function() {
						file.scrollToCaret(file.caret);
					});
				});
				
				
			}
			
			if(document && document.body && document.body.contains(death)) document.body.removeChild(death);
			
			if(answer == yes) {
				if(RUNTIME == "browser") {

					if ('serviceWorker' in navigator) {
						navigator.serviceWorker.getRegistrations().then(function(registrations) {
							
							for(var registration in registrations) {
								registrations[registration].unregister()
							}
							
						}).catch(function(err) {
							console.warn("Failed to unregister service workers: " + err.message)
						});
					}
					
					document.location = document.location.href;
				}
				else if(RUNTIME=="nw.js") process.exit(1); // Exit code=1 should make the batch/bash script restart the editor
			}
			else {
				if(EDITOR.settings.devMode && RUNTIME == "nw.js") {
					// Show the chrome dev tools
					var gui = require('nw.gui').Window.get();
					gui.showDevTools();
				}
			}
			
		});
	}
	
	
	function reportTemplate(errMessage, source, lineno, colno, error) {
		// Create a template used to report bugs
		
		var editorArgs = RUNTIME == "nw.js" ? require('nw.gui').App.argv : " (browser url) " + document.location.href;
		
		var message = 'To: "Editor bug report" <zeta@zetafiles.org>\n' +
		'Subject: JZedit ' + source + ' (line ' + lineno + ' col ' + colno + ')\n' +
		'\n' +
		'Date:' + (new Date()) + '\n' +
		'Commit: ' + EDITOR.version + '\n' +
		'Platform: ' + process.platform + '\n' +
		'Browser: ' + BROWSER + '\n' +
		'Arguments: ' + editorArgs + '\n' +
		'\n' +
		errMessage + '\n' +
		'\n' +
		(error ? error.stack + '\n' : "") +
		'\n' +
		'How to repeat:\n' + 
		'Please provide instruction on how to reproduce the error!\n' + 
		'\n' + 
		'\n' + 
		'\n' + 
		'How to send: Use keboard Ctrl + Shift + S,\n' + 
		'or "Send bug report" via the menu.\n' + 
		'(this only works if "bugreport" is in the file-name)\n' + 
		'Or send the bug report via e-mail (to the e-mail address at the top)\n';
		
		return message;
	}
	
})();