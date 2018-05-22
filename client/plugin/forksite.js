(function() {
	"use strict";
	
EDITOR.plugin({
		desc: "Fork a web site",
		load: function() {

			// Wait until logged in
			CLIENT.on("loginSuccess", forkSiteAfterLoggedIn);
			
		},
		unload: function() {
			
			CLIENT.removeEvent("loginSuccess", forkSiteAfterLoggedIn);
			
		},
	});

	function forkSiteAfterLoggedIn(json) {
		if(QUERY_STRING.fork) {
			forkSite(QUERY_STRING.fork);
		}
	}
	
	function forkSite(mainUrl) {
		/*
			The server has to do the http get due to CORS !
		*/
		
		var loc = UTIL.getLocation(mainUrl);
		var filePath = loc.pathname;
		var folder = UTIL.getFolderName(filePath);
		var fileName = UTIL.getFilenameFromPath(filePath);
		var filesToDownload = 0;
		var filesDownloaded = 0;
		var downloadErrors = [];
		
		if(fileName == "") {
			filePath = UTIL.trailingSlash(filePath) + fileName;
		}
		
		filePath = UTIL.joinPaths([loc.host, filePath]); 
		
		CLIENT.cmd("httpGet", {url: mainUrl}, function (err, text) {
			if(err) return alertBox("Failed to fetch url=" + mainUrl + " : Error: " + err.message + " Code: " + err.code + " ");
			EDITOR.openFile(filePath, text, function(err, file) {
				if(err) return alertBox("Failed to create new file (" + filePath + "): " + err.message);
				
				// Find scripts
				var reScripts = /<script.*src="([^"]*)"><\/script>/g;
				var scripts = [];
				var arr;
				while ((arr = reScripts.exec(text)) !== null) {
					downloadFile(arr[1]);
				}
				
				// Find stylesheets
				// <link rel="stylesheet" type="text/css" href="gfx/style.css">
				var reStylesheets = /<link.*stylesheet.*href="([^"]*)">/g;
				var stylesheets = [];
				var arr;
				while ((arr = reStylesheets.exec(text)) !== null) {
					downloadFile(arr[1]);
				}
				
			});
			
		});
		
		function downloadFile(srcPath) {
			if(srcPath.indexOf("://") != -1 || srcPath.slice(0,2) == "//") return console.log("Not relative srcPath: " + srcPath);
			// An url beginning with // (slash slash) is a vaild url which means: use the same protocol as the site
			
			var url = UTIL.resolvePath(mainUrl.slice(0, mainUrl.lastIndexOf(fileName)), srcPath);
			var path = UTIL.resolvePath(folder, srcPath);
			
			path = UTIL.joinPaths([loc.host, path]);
			
			console.log("Downloading url=" + url + " path=" + path + " srcPath=" + srcPath);
			
			CLIENT.cmd("httpGet", {url: url}, function (err, text) {
				filesDownloaded++;
				if(err) {
					return downloadErrors.push({url: url, err: err, code: err.code});
				}
				EDITOR.openFile(path, text, function(err, file) {
					if(err) {
return alertBox("Failed to create new file (" + path + "): " + err.message);
					}
					
					
				});
			});
		}
		
	}
	
	
})();
