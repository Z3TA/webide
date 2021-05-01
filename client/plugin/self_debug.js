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
	
	EDITOR.plugin({
		desc: "Send bug reports",
		load: bugReportLoad,
		unload: bugReportUnload,
	});
	
	function bugReportLoad() {
		var key_S = 83;
		EDITOR.bindKey({desc: S("send_bug_report"), charCode: key_S, fun: sendBugReport, combo: ALT + SHIFT});
		
		winMenuBugreport = EDITOR.windowMenu.add(S("send_bug_report"), [S("Editor"), 8], sendBugReport);
		
		EDITOR.on("error", windowError);
		EDITOR.on("ctxMenu", showSendBugReportMenuItem);
		
		setTimeout(handleEarlyErrors, 1000);
	}
	
	function bugReportUnload() {
		EDITOR.unbindKey(sendBugReport);
		
		EDITOR.removeEvent("error", windowError);
		EDITOR.removeEvent("ctxMenu", showSendBugReportMenuItem);
	
		EDITOR.windowMenu.remove(winMenuBugreport);
	}
	
	function handleEarlyErrors() {
		
		while(JAVASCRIPT_ERRORS.length > 0) {
			registerError(JAVASCRIPT_ERRORS.shift());
		}
		
		// We can now take over from capture_errors.js
		window.onerror = windowError;
		JAVASCRIPT_ERRORS = null;
		
		function registerError(e) {
			windowError.call(window, e.message, e.source, e.lineno, e.colno, e.error);
		}
		
	}
	
	function showSendBugReportMenuItem(file, combo, caret, target) {
		if(!file) return true;
if(target.className != "fileCanvas") return;
		
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
		
		return PREVENT_DEFAULT;
		
		function sendit() {
			var message = file.text;
			UTIL.httpPost("https://www.webtigerteam.com/mailform.nodejs", { meddelande: message, namn: 'WebIDE', robot: "42" }, function (err, respStr) {
				if(err) {
					alertBox("Problem sending bug report:  " + err.message);
					throw err;
				}
				else if(respStr.indexOf("Bad Gateway") != -1 || respStr.indexOf("Meddelande mottaget") == -1) {
					alertBox("Problem with bug reporting server. Try e-mailing the bug report. " + respStr);
					//console.log("respStr=" + respStr);
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
	
	// Prevent the editor from hanging the computer due to errors
	var JS_ERROR_COUNTER = 0;
	var MAX_JS_ERRORS = 50;
	
	function windowError(message, source, lineno, colno, error) {
		console.warn("Error detected! message=" + message + " source=" + source + " lineno=" + lineno + " colno=" + colno + " EDITOR.platform=" + EDITOR.platform + "");
		
		if(++JS_ERROR_COUNTER > MAX_JS_ERRORS) {
			alert("Too many JavaScript errors detected. The editor needs to be restarted!");
			// Self destory
			var url = document.location.href;
			document.body.innerHTML = 'Too many JavaScript errors was detected. The editor need to be <a href="' + url + '">restarted</a>!';
			EDITOR = null;
		}
		
		findSourcePath(source, function(err, source) {
			if(err) alertBox(err);
			showErrorMessage(message, source, lineno, colno, error)
		});
		
		EDITOR.stat("error");
		
		if(!EDITOR.settings.devMode) {
			// People are generally *very* bad at reporting bugs, only 1 in 10000 bugs will be reported.
			// So send away a mini report, while trying not to leak any personal data
			
			var miniReport = source + ":" + lineno + ":" + colno + "\n" + 
			"\nStacktrace:\n" + (error && error.stack) + "\n" + 
			"\nCurrent file: " + EDITOR.currentFile.path + "\n" + 
			"Browser: " + ((typeof navigator == "object" && navigator.userAgent) || window.userAgent) + " (" + BROWSER + ")\n" +
			"Version: " + EDITOR.version + "\n" +
			"Dist: " + EDITOR.dist + "\n" +
			"Last server msg: " + UTIL.shortString(JSON.stringify(CLIENT.lastMsgFromServer, null, 2)) + "\n" + 
			"";
			
			UTIL.httpPost("https://www.webtigerteam.com/mailform.nodejs", { meddelande: miniReport, namn: 'WebIDE', subject: message, robot: "42" }, function (err, respStr) {});
		}
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
			//console.log(url);
			//console.log("document.location.href=" + document.location.href);
			//console.log("url.pathname=" + url.pathname);
			
			var source = source.replace(url.pathname, "/client" + url.pathname);
			//console.log("source=" + source);
			
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
		//console.log("source=" + source);
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
		
		var yes = "Close/restart editor";
		var createTestRestart = "Create a test case and restart";
		var createTestKeepRunning = "Create a test case and keep running";
		var sendBugReport = "Write bug report";
		var no = "Keep running";
		
		var lastMsgFromServer = CLIENT.lastMsgFromServer;
		
		//console.log("selfDebug: Asking the user what to do...");
		var dialog = confirmBox("" + sourceLink + lineString + message + " (code=" + (error && error.code) + ")<br><br>Close/restart the editor ?", [
			yes, sendBugReport, no
		], function (answer) {
			
			//console.log("selfDebug: answer=" + answer);
			
			if(answer == createTestRestart || answer == createTestKeepRunning) {
				
				// Create a test case for automated testing
				
				
				if(answer == createTestRestart) answer = yes;
				
			}
			else if(answer == sendBugReport) {
				var errorReportFilePath = "bugreport.txt";
				EDITOR.openFile(errorReportFilePath, reportTemplate(message, source, lineno, colno, error, lastMsgFromServer), function errorReportOpened(err, file) {
					if(err && typeof GUI != "undefined") GUI.showDevTools(); // nw.js
					
					if(err) return alertBox("Unable to open errorReportFilePath=" + errorReportFilePath + " Error: " + err.message);
					
					// Select the row that contains repeat instructions
					file.select(file.grid[4]);
				});
			}
			
			if(document && document.body && document.body.contains(death)) document.body.removeChild(death);
			
			if(answer == yes) {
				if(RUNTIME == "browser") {

					if ('serviceWorker' in navigator) {
						//console.log("selfDebug: Unregister service worker ...");
						navigator.serviceWorker.getRegistrations().then(function(registrations) {
							
							for(var registration in registrations) {
								registrations[registration].unregister()
							}
							
						}).catch(function(err) {
							console.warn("selfDebug: Failed to unregister service workers: " + err.message)
						});
					}
					
					//console.log("selfDebug: Forcing reload ...");
					if(document.location.href.indexOf('#') != -1) {
						// If the location has a #hash in it, it won't reload the page!
						//console.log("selfDebug: Removing hash"); 
						document.location = document.location.href.substr(0, document.location.href.indexOf('#'));
					}
					else {
						document.location = document.location.href;
					}
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

if(dialog) {
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
}


	}
	
	
	function reportTemplate(errMessage, source, lineno, colno, error, lastMsgFromServer) {
		// Create a template used to report bugs
		
		var editorArgs = RUNTIME == "nw.js" ? require('nw.gui').App.argv : " (browser url) " + document.location.href;
		
		var message = 'To: "Editor bug report" <zeta@zetafiles.org>\n' +
		'Subject: WebIDE ' + source + ' (line ' + lineno + ' col ' + colno + ')\n' +
		'\n' +
		'How to repeat:\n' +
		'Please provide instruction on how to reproduce the error!\n' +
		'\n' +
		'\n' +
		'\n' +
		'How to send: Use keybord shortcut: ' + EDITOR.getKeyFor(sendBugReport) + ',\n' +
		'or right click and choose "Send bug report" via the context menu.\n' +
		'(this only works if "bugreport" is in the file-name)\n' +
		'Or send the bug report via e-mail (to the e-mail address at the top)\n' +
		'\n' +
		'Date:' + (new Date()) + '\n' +
		'Commit: ' + EDITOR.version + '\n' +
		'Dist: ' + EDITOR.dist + '\n' +
		'Platform: ' + process.platform + '\n' +
		'Browser: ' + BROWSER + '\n' +
		'Arguments: ' + editorArgs + '\n' +
		'\n' +
		'Error message: ' + errMessage + '\n' +
		'Error code: ' + (error && error.code) + '\n' +
		'\n' +
		(error ? error.stack + '\n' : "") +
		'\n' +
		"Last server msg: " + UTIL.shortString(JSON.stringify(lastMsgFromServer, null, 2), 4096) + "\n" + 
		"";
		
		return message;
	}
	
})();