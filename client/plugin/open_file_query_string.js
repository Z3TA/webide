
(function() {
	"use strict";
	
	EDITOR.plugin({
		desc: "query-string-open-file",
		load: function openShareFile() {
			
			if(QUERY_STRING.open) {
				console.log("");
				openFileMaybe(QUERY_STRING.open, false, function(err) {
					if(err) CLIENT.on("loginSuccess", openFileAfterLogin);
				});
				
			}
			
		},
		unload: function unloadOpenShareFile() {
			CLIENT.removeEvent("loginSuccess", openFileAfterLogin);
		},
	});
	
	function openFileAfterLogin() {
		CLIENT.removeEvent("loginSuccess", openFileAfterLogin); // Only run once
		
		openFileMaybe(QUERY_STRING.open, true);
		
	}
	
	function openFileMaybe(path, afterLogin, callback) {
		
		if(EDITOR.files.hasOwnProperty(path)) {
			console.log("openFileMaybe: path=" + path + " Already opened!");
			if(callback) {
				callback(err)
				callback = null;
			}
			return;
		}
		
		if(path.match(/https?:\/\//)) {
// Download the file, then open it
			// First try downloading using client only
			
			console.log("openFileMaybe: Attempting to download url=" + path + " using client ...")
			
			UTIL.httpGet(path, function(err, text) {
				if(err) {
					console.log("openFileMaybe: Failed to download url=" + path + " using client!");
					if(!afterLogin) {
						if(callback) {
							callback(err)
							callback = null;
						}
						return;
					}
					else if(afterLogin) {
						console.log("openFileMaybe: Asking the server to download url=" + path);
						CLIENT.cmd("httpGet", {url: path}, function(err, text) {
							if(err) {
								console.log("openFileMaybe: Server failed to download url=" + path + " Error: " + err.message);
								alertBox("Unable to open/download the resource specified the query-string: " + path + " Error: " + err.message);
								
								if(callback) {
callback(err) 
									callback = null;
								}
								
								return;
							}
else openWebPath(path, text, function(err) {
								if(err) {
									console.log("openFileMaybe: Downloaded by server. But failed to open!");
									if(callback) {
										callback(err)
										callback = null;
									}
								}
								else {
									console.log("openFileMaybe: Successfully opened file downloaded via server");
									if(callback) {
										callback(null)
										callback = null;
									}
								}
							});
						});
					}
				}
				else {
					console.log("openFileMaybe: Sucessfully downloaded url=" + path + " via client");
					openWebPath(path, text, function(err) {
						if(err) {
							console.log("openFileMaybe: Downloaded using client. But failed to open!");
							if(callback) {
								callback(err)
								callback = null;
							}
						}
						else {
							console.log("openFileMaybe: Successfully opened file downloaded via client");
							if(callback) {
								callback(null)
								callback = null;
							}
						}
					}) ;
				}
			});
		}
		else {
			// Assume local file-system
			console.log("openFileMaybe: Trying to open right away path=" + path);
			EDITOR.openFile(path, function(err) {
				if(err) {
					console.log("openFileMaybe: Failed to open path=" + path + " Error: " + err.message);
					if(err.code == "ENOENT") {
						// Ask if user wants to create it!?
					}
					else if(callback) {
						callback(err)
						callback = null;
					}
				}
				else {
					console.log("openFileMaybe: Successfully opened local file path=" + path);
					if(callback) {
						callback(null)
						callback = null;
					}
				}
			});
		}
	}
	
	function openWebPath(url, text, cb) {
		console.log("openFileMaybe: openWebPath: url=" + url + " text.length=" + text.length);
		
		var loc = UTIL.getLocation(url);
		var filePath = "/download/" + loc.host + "/" + UTIL.getPathFromUrl(url);
		
		EDITOR.openFile(filePath, text, function(err) {
			if(err) alertBox('Unable to open url from query-string "open"=' + url + ' Error: ' + err.message)
			cb(err);
		});
	}
	
	
	
})();
