(function() {
	
	var fileInput;
	var windowMenu;
	
	EDITOR.plugin({
		desc: "Upload file from URL",
		load: function loadUpload() {
			
			windowMenu = EDITOR.windowMenu.add(S("upload_from_url"), [S("File"), S("Upload"), 10], uploadFromUrl);
			
			//EDITOR.registerAltKey({char: "u", alt:2, label: S("Upload"), fun: uploadFile});
			
		},
		unload: function unloadUpload() {
			
			EDITOR.windowMenu.remove(windowMenu);
			
			//EDITOR.unregisterAltKey(uploadFile);
			
			//if(fileInput) document.documentElement.removeChild(fileInput)
			
		}
	});

	function uploadFromUrl() {
		
		EDITOR.getClipboardContent(function(err, clipboardContent, pseudoClipboard) {
			
			//console.log("uploadFromUrl: clipboardContent=" + clipboardContent);
			
			if(clipboardContent) {
				
				var reProtocol = /^(\w+):\/\//;
				var matchProtocol = clipboardContent.match(reProtocol);
				
				if(matchProtocol) {
					var protocol = matchProtocol[1].toLowerCase();
					//console.log("uploadFromUrl: protocol=" + protocol);
					if(protocol == "http" || protocol == "https") {
						var defaultUrl = clipboardContent;
					}
				}
				//else {console.log("uploadFromUrl: clipboardContent=" + clipboardContent + " does not match reProtocol=" + reProtocol);}
			}
			
			promptBox("URL to download from: ", {defaultValue: defaultUrl}, function(url) {
				if(!url) return;
				
				var fileName = UTIL.getFilenameFromPath(url);
				var uploadDir = UTIL.trailingSlash(UTIL.joinPaths(EDITOR.user.homeDir, "upload"));
				var uploadPath =  UTIL.joinPaths(uploadDir, fileName);
				var options = {url: url, createPath: true, path: uploadPath};
				CLIENT.cmd("download", options, function(err, resp) {
					if(err) {
						alertBox("Failed to get " + fileName + ": " + err.message);
						return;
					}
					
					EDITOR.fileExplorer(uploadDir);
					
				});
				
			});
			
		});
		
	}
	
	
})();