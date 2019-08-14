(function() {
	"use strict";
	
	var winMenuForkWebsite;
	
EDITOR.plugin({
		desc: "Fork a web site",
		load: function() {

			// Wait until logged in
			CLIENT.on("loginSuccess", forkSiteAfterLoggedIn);
			
			winMenuForkWebsite = EDITOR.windowMenu.add("Download a website", ["Tools", 10], forkWebsite);
			
			if(typeof navigator == "object" && typeof navigator.registerProtocolHandler == "function") {
				var self = window.location.protocol + window.location.hostname + "/?fork=%s";
				
				// Possible to have links like <a href="web+edit:https://www.tutorials.com/example/">Open in editor</a>
				// todo: Add to documentation!
				navigator.registerProtocolHandler("web+edit", self, "Web IDE (editor for HTML, JavaScript, CSS");
			}
			
		},
		unload: function() {
			
			CLIENT.removeEvent("loginSuccess", forkSiteAfterLoggedIn);
			
		},
	});

	function forkWebsite() {
		winMenuForkWebsite.hide();
		var defaultValue = "https://";
		promptBox("URL of website to copy: ", false, defaultValue, 0, function(url) {
			if(url) forkSite(url)
		});
	}
	
	function forkSiteAfterLoggedIn(json) {
		if(QUERY_STRING.fork) {
			forkSite(QUERY_STRING.fork);
		}
	}
	
	function forkSite(mainUrl) {
		/*
			The server has to do the http get due to CORS !
		*/
		
		var aborted = false;
		var loc = UTIL.getLocation(mainUrl);
		var filePath = loc.pathname;
		var folder = UTIL.getFolderName(filePath);
		var urlFileName = UTIL.getFilenameFromPath(filePath);
		var filesToDownload = [];
		var filesDownloaded = [];
		var filesToOpen = 0;
		var filesOpened = 0;
		var downloadErrors = [];
		var datadirCreated = 0; // 1=creating 2=Failed 3=Created
		var thirdParty = [];
		var doneAlready = false;
		var homeDir = (EDITOR.user && EDITOR.user.home) || UTIL.homeDir(EDITOR.workingDirectory);
		var dataDir = UTIL.trailingSlash(UTIL.joinPaths([homeDir, "forked-sites", loc.host]));
		var targetDir;
		
		if(urlFileName == "") {
			filePath = UTIL.trailingSlash(filePath) + "index.htm";
		}
		
		var isHtmlFile = !!filePath.match(/\.html?$/);
		
		if( isHtmlFile ) {
			downloadFiles();
		}
		else {
			// Download it without saving
			fetchFile(mainUrl, filePath);
		}
		
		function fetchFile(url, path) {
			// Only download one file, do not save it
			CLIENT.cmd("httpGet", {url: url}, function (err, text) {
				
				if(err) {
					alertBox("Failed to get " + url);
					return downloadErrors.push({url: url, err: err, code: err.code});
				}
				
				EDITOR.openFile(path, text, function(err, file) {
					if(err) {
						return alertBox("Failed to create new file (" + path + "): " + err.message);
					}
				});
				
			});
		}
		
		function downloadFiles() {
			EDITOR.pathPickerTool({defaultPath: dataDir, instruction: "Where to save the data from " + mainUrl + " ?"}, function gotDataDir(err, path) {
				if(err) return abort(err);
				
				dataDir = path;
				
				CLIENT.cmd("createPath", {pathToCreate: dataDir}, function(err) {
					if(err) return abort(err);
					
					var folderPath = UTIL.getDirectoryFromPath(filePath);
					console.log("forksite: folderPath=" + folderPath + " filePath=" + filePath);
					targetDir = UTIL.trailingSlash( UTIL.joinPaths([dataDir, folderPath]) );
					
					filePath = UTIL.joinPaths([dataDir, filePath]);
					
					CLIENT.cmd("download", {url: mainUrl, path: filePath, createPath: true, type: "text"}, function (err, downloadResp) {
						if(err) return abort(new Error("Failed to download url=" + mainUrl + " : Error: " + err.message + " Code: " + err.code + " "));
						EDITOR.openFile(filePath, undefined, {show: true}, function(err, file) {
							if(err) return abort(new Error("Failed to open file (" + filePath + "): " + err.message));
							
							console.log("forksite: downloadResp=" + JSON.stringify(downloadResp));
							
							var arr;
							var text = file.text;
							
							// Find scripts
							var re = /<script.*src="([^"]*)"><\/script>/ig;
							while ((arr = re.exec(text)) !== null) saveFile(arr[1]);
							
							// Find stylesheets
							// <link rel="stylesheet" type="text/css" href="gfx/style.css">
							var re = /<link.*stylesheet.*href="([^"]*)"/ig;
							while ((arr = re.exec(text)) !== null) saveFile(arr[1]);
							
							// Find media
							var re = /<img.*src="([^"]*)".*>/ig;
							while ((arr = re.exec(text)) !== null) saveFile(arr[1]);
							
							doneMaybe();
						});
					});
				});
			});
		}
		
		function doneMaybe() {
			if(aborted) return;
			
			if(filesToDownload.length == filesDownloaded.length && filesToOpen == filesOpened) {
				if(doneAlready) throw new Error("forksite: Already done!");
				
				doneAlready = true;
				
				var msg = "Finished forking " + mainUrl + '.\n';
				msg = msg + 'Data have been saved in <a href="JavaScript: EDITOR.fileExplorer(\'' + dataDir + '\') ">' + dataDir + "</a>";
				
				if(thirdParty.length > 0) msg = msg + "\nThird party resources: " + thirdParty.join("\n");
				if(downloadErrors.length > 0) {
					msg = msg + "\nDownload errors:\n"
					for(var i=0; i<downloadErrors.length; i++) {
						msg = msg + downloadErrors[i].url + ": " + downloadErrors[i].err.message + "\n";
					}
				}
				
				alertBox(msg);
			}
			else console.log("forksite: filesToDownload=" + filesToDownload.length + " filesDownloaded=" + filesDownloaded.length + " filesToOpen=" + filesToOpen 
			+ " filesOpened=" + filesOpened + " Waiting for " + UTIL.compare(filesToDownload, filesDownloaded).join(", ") );
		}
		
		function abort(err) {
			aborted = true;
			if(err) alertBox("Forking canceled! " + err.message);
		}
		
		function saveFile(srcPath) {
			
			var CREATE_WAIT = 1;
			var CREATE_ERROR = 2;
			var CREATE_SUCCESS = 3;
			
			var res = resolve(srcPath);
			
			if(res == null) return thirdParty.push(srcPath);
			
			var url = res.url;
			var path = res.path;
			
			filesToDownload.push(url);
			
			console.log("forksite: Downloading url=" + url + " path=" + path + " srcPath=" + srcPath);
			
			CLIENT.cmd("download", {url: url, path: path, createPath: true, type: "text"}, function(err, downloadResp) {
				filesDownloaded.push(url);
				
				if(err) {
					downloadErrors.push({url: url, err: err, code: err.code});
				}
				else {
					var ext = UTIL.getFileExtension(path);
					if( ext.match(/css/i) ) {
						// Download media from CSS
						var text = downloadResp.text;
						var arr;
						var re= /url\((['"])?([^'"]*)\1\)/ig;
						while ((arr = re.exec(text)) !== null) saveFile(arr[2]);
					}
					
					if(  ext.match( /css|htm|html|js/i )  ) {
						// Open the file in the editor
						filesToOpen++;
						EDITOR.openFile(path, function(err, file) {
							filesOpened++;
							
							if(err) {
								abort(new Error("Failed to open file (" + path + "): " + err.message));
							}
							
							doneMaybe();
						});
					}
				}
				
				doneMaybe();
			});
			
		}
		
		function resolve(srcPath) {
			console.log("forksite: resolve: srcPath=" + srcPath + " mainUrl=" + mainUrl + " targetDir=" + targetDir + " ");
			
			if(srcPath.indexOf("://") != -1 || srcPath.slice(0,2) == "//") { // An url beginning with // (slash slash) is a valid url which means: use the same protocol as the site
				
				// It's not a relative path, most likely because it's a third party script
				return null;
				
			}
			else {
				var url = UTIL.resolvePath(mainUrl.slice(0, mainUrl.lastIndexOf(urlFileName)), srcPath);
				var path = UTIL.resolvePath(targetDir, srcPath);
			}
			
			var fileName = UTIL.getFilenameFromPath(path);
			if(fileName == "") path = path + "index.htm";
			
			return {path: path, url: url};
		}
	}
	
})();
