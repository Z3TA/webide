/*
!DO:NOT:BUNDLE!

sudo apt-get install build-essential
sudo apt-get install qtcreator
sudo apt-get install qtdeclarative5-dev

*/

(function() {
"use strict";

	var logFile = {};
	
EDITOR.plugin({
		desc: "Run qml apps",
		load: function loadQml() {

			EDITOR.on("previewTool", runQmlMaybe, 3000); // Run after Static Site generator and web_preview

			CLIENT.on("process", qmlProcessMessageMaybe)
			
},
		unload: function unloadQml() {
			
			EDITOR.removeEvent("previewTool", runQmlMaybe);
			
}
});

	function qmlProcessMessageMaybe(p) {
		var pid = p.pid;
		
		var msg = p.stdout || p.stderr;
		
		if(msg) {
			if(logFile.hasOwnProperty(pid)) {
logFile[pid].write(msg);
				EDITOR.renderNeeded();
			}
		}
		
		if(p.close && logFile.hasOwnProperty(pid)) {
			logFile[pid].writeLineBreak();
			logFile[pid].write("Closed " + (new Date()));
			EDITOR.renderNeeded();
			delete logFile[pid];
		}
	}
	
	function runQmlMaybe(qmlFile, combo) {
		if(!qmlFile) return false;
		
		var ext = UTIL.getFileExtension(qmlFile.path);
		console.log("runQmlMaybe: ext=" + ext);
		
		if(ext != "qml") return false;
		
		var fileName = UTIL.getFilenameFromPath(qmlFile.path);
		var filePath = qmlFile.path;
		
		var pids = Object.keys(logFile);
		pids.forEach(kill);
		
		console.log("runQmlMaybe: Showing virtual display...");
		EDITOR.virtualDisplay.show(function(err) {
			if(err) return alertBox("Unable to show the local desktop! Error: " + err.message);
			console.log("runQmlMaybe: Virtual display open!");
			
			EDITOR.openFile(fileName + ".log", "Log file for qmlscene " + filePath + "\n\n", function(err, file) {
				if(err) return alertBox(err.message);
				
				console.log("runQmlMaybe: Log file opened!" + filePath);
				
				setTimeout(function() {
					console.log("runQmlMaybe: Starting qmlscene...");
					CLIENT.cmd("startProcess", {path: "/usr/bin/qmlscene", args: [filePath]}, function(err, p) {
						if(err) return alertBox(err.message);
						
						console.log("runQmlMaybe: Process with pid=" + p.pid + " started!");
						
						logFile[p.pid] = file;
						
					});
				}, 10);
				
			});
		});
		
		return true;
	}
	
	function kill(pid) {
		CLIENT.cmd("killProcess", {pid: pid}, function(err) {
			if(err) return alertBox(err.message);
			
			logFile[pid].write("Killed " + (new Date()));
			
			delete logFile[pid];
			
		});
	}
	
	
})();

