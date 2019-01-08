(function() {
	"use strict";
	
	var sites= []; // Array of sites
	var manager;
	var selectSite;
	var selectedSite;
	var editView; // Edit site settings
	var controlView; // Stardard interface view
	
	var inputSiteName;
	var inputProjectFolder;
	var inputSourceFolder;
	var inputPreviewFolder;
	var inputPublishFolder;
	var inputTemplate;
	var inputPubAuthUser;
	var inputPubAuthPw;
	var inputPubAuthKey;
	var buttonWysiwyg;
	var buttonPreview;
	var inputRepoAuthUser;
	var inputRepoAuthPw;
	var inputRepository;
	var inputUrl;
	
	var previewWin;
	var wysiwygEnabled = false; 
	var notEditableReason = "";
	var editable = false;
	
	var menuItem;
	
	var previewBaseUrl;
	
	var progressBar;
	
	var askToOpenSourceFileIfOpenedPreviewFile = true;
	
	// Add plugin to editor
	EDITOR.plugin({
		desc: "Static site generator management interface",
		load: load,
		unload: unload
	});
	
	function getSites() {
		
		console.log("Getting SSG sites ...");
		
		var storageSites = EDITOR.storage.getItem("cmsjz_sites");
		var filePath; // File to be opened via quickedit
		
		if(storageSites) {
			try {
				sites = JSON.parse(storageSites);
			}
			catch(err) {
				throw new Error("Unable to parse sites from storage! " + err.message);
			}
		}
		
		if(!sites) {
			console.warn("Failed to get any sites from the static site generator!\n\
			storageSites=" + storageSites + " ... " + (storageSites ? "Truthy" : "Falsy") + "\n\
			sites=" + JSON.stringify(sites, null, 2));
			//alertBox("You have no configurated static-site-generator sites.");
		}
		else {
			console.log("sites: " + JSON.stringify(sites, null, 2));
			
			// Show some quick nav in the dashboard !?
			
			
			if(QUERY_STRING.editPage) {
				// ### quickedit.js ...
				var url = QUERY_STRING.editPage;
				var nodes = QUERY_STRING.nodes.split(",");
				
				var site = isSite(url);
				
				console.log("quickedit: url=" + url + " site=" + site); 
				
				if(site) {
					filePath = UTIL.getPathFromUrl(url);
					var pubUrlPath = site.url ? UTIL.getDirectoryFromPath(site.url) : "/";
					
					// If the site is published in a folder eg /foo/ remove /foo/ from filePath
					if(filePath.indexOf(pubUrlPath) == 0) filePath = filePath.slice(pubUrlPath.length);
					
					filePath = UTIL.trailingSlash(resolvePath(site, site.source)) + filePath;
					while(filePath.indexOf("//") != -1) filePath = filePath.replace("//", "/");
					
					console.log("filePath=" + filePath + " pubUrlPath=" + pubUrlPath + " ");
					
					/*
						else {
						alertBox("Unable to figure out which file this is:\n" + path);
						console.log("site.source=" + site.source);
						console.log("site.publish=" + site.publish);
						console.log("path=" + path);
						
						}
					*/
					
					if(filePath.slice(filePath.length-1) == "/") filePath = filePath + "index.htm";
					
					EDITOR.openFile(filePath, undefined, {show: true}, quickeditFileOpened);
					
					
				}
				else {
					console.warn("Couln't determine what site the url belongs to: " + url);
				}
			}
		}
		
		function quickeditFileOpened(err, file) {
			if(err) {
				if(err.code == "ENOENT" && filePath.match(/index\.htm$/i)) {
					// Try with index.html instead of index.htm (some servers only allow the index file to be .html !)
					EDITOR.openFile(filePath.replace(/index\.htm$/i, "index.html"), undefined, quickeditFileOpened);
				}
				else alertBox("Unable to open " + filePath + " " + err.message + "");
			}
			else {
				// Find where to edit
				if(QUERY_STRING.nodes) {
					
					var element = QUERY_STRING.nodes.split(",");
					
					element.reverse();
					
					var i = 0;
					var index = -1;
					
					console.log("Finding where to put caret ...");
					for(; i<element.length-1; i++) {
						//console.log(element[i]);
						if(element[i] == "main") {
							element[i] = "body";
							break;
						}
					}
					
					
					
					for(; i<element.length; i++) {
						if(element[i] !== "") {
							console.log(element[i]);
							index = file.text.indexOf(element[i], index);
						}
					}
					
					console.log("i=" + i);
					console.log("index=" + index + " (" + file.text.substr(index, 30) + " ...)");
					console.log("element=" + JSON.stringify(element));
					
					if(index != -1) {
						/*
							If the file was open when the editor last closed, the reopen_files.js plugin will place
							the caret. So wait some time ...
						*/
						setTimeout(function placeCaretAfterReopenFiles() {
							file.moveCaret(index);
							file.scrollToCaret();
							
							EDITOR.showFile(file);
							
							//  We can't open the WYSIWYG editor automatically, or it would be stopped by the popup-blocker
							
							if(like(site, file) && buttonWysiwyg) buttonWysiwyg.setAttribute("class", "button highlighted");
							
						}, 100);
						
					}
				}
				
			}
		}
		
		function isSite(url) {
			// Figure out if the url belongs to any of our sites ...
			console.log("sites.length=" + sites.length);
			for(var i=0, site; i<sites.length; i++) {
				site = sites[i];
				
				console.log(url + " == " + site.url + " ??");
				
				if(url.indexOf(site.url) != -1) {
					console.log("A site.url=" + site.url + " is in url=" + url);
					return site;
				}
				else if(site.url.indexOf(url) != -1) {
					console.log("B url=" + url + " is in site.url=" + site.url + "");
					return site;
				}
				else if(url.indexOf(resolvePath(site, site.publish)) == 0) {
					console.log("C site.publish=" + site.publish + " is in url=" + url + "");
					return site;
				}
				else if(url.indexOf(resolvePath(site, site.preview)) == 0) {
					console.log("D site.preview=" + site.preview + " is in url=" + url + "");
					return site;
				}
			}
			console.log("E Unable to determine which or if the url belongs to any SSG-site: url=" + url);
			return null;
		}
	}
	
	function load() {
		// Called when the module is loaded
		
		//alertBox("loading");
		
		if(EDITOR.storage.ready()) getSites();
		else EDITOR.on("storageReady", getSites);
		
		var keyF9 = 120;
		var keyEscape = 27;
		
		EDITOR.bindKey({desc: "Show the manager for the static site generator", fun: showSSG, charCode: keyF9, combo: 0});
		EDITOR.bindKey({desc: "Hide the manager for the static site generator", fun: hideSSG, charCode: keyEscape, combo: 0});
		EDITOR.bindKey({desc: "Compiles a preveiw for current site in the static site generator", fun: previewSSG, charCode: keyF9, combo: CTRL});
		EDITOR.bindKey({desc: "WYSIWYG editor for current site in the static site generator", fun: wysiwygSSG, charCode: keyF9, combo: CTRL + SHIFT});
		EDITOR.bindKey({desc: "Publish/live deployment of the static-site-generator site", fun: publishSSG, charCode: keyF9, combo: CTRL + ALT + SHIFT});
		
		
		//build();
		
		menuItem = EDITOR.addMenuItem("Static site generator", showSSG, 11);
		
		EDITOR.on("fileShow", fileShow);
		
		EDITOR.on("exit", SSG_cleanup);
		
		EDITOR.on("fileOpen", fileOpen);
		
		EDITOR.on("fileDrop", fileDrop);
		
		EDITOR.on("previewTool", ssgPreviewTool, 1000); // Run before web_preview.js
		
		CLIENT.on("ssgBuildMessage", ssgBuildMessage);
		
		CLIENT.on("ssgProgressStatus", ssgProgressStatus);
		
		// if document.location.href.indexOf("ssg") ... open that site and page in edit mode
		
	}
	
	function SSG_cleanup() {
		closePreview();
		return true;
	}
	
	function unload() {
		// Cleaning up, for example when disabling the plugin
		
		//alertBox("UNloading");
		
		EDITOR.removeEvent("storageReady", getSites);
		
		EDITOR.removeMenuItem(menuItem);
		
		SSG_cleanup(); // closePreview();
		
		EDITOR.removeEvent("fileShow", fileShow);
		EDITOR.removeEvent("exit", SSG_cleanup);
		EDITOR.removeEvent("fileOpen", fileOpen);
		EDITOR.removeEvent("fileDrop", fileDrop);
		EDITOR.removeEvent("previewTool", ssgPreviewTool);
		
		
		EDITOR.unbindKey(hideSSG);
		EDITOR.unbindKey(previewSSG);
		EDITOR.unbindKey(publishSSG);
		EDITOR.unbindKey(showSSG);
		EDITOR.unbindKey(wysiwygSSG);
		
		CLIENT.removeEvent("ssgBuildMessage", ssgBuildMessage);
		
		if(manager) {
			var footer = document.getElementById("footer");
			footer.removeChild(manager);
			EDITOR.resizeNeeded();
		}
		
	}
	
	
	function ssgBuildMessage(msg) {
		console.log("ssgBuildMessage: " + JSON.stringify(msg));
		
		var stdOutFile = selectedSite.name + ".build.log";
		
		if(EDITOR.files.hasOwnProperty(stdOutFile)) {
			appendBuildLog(EDITOR.files[stdOutFile], msg);
		}
		else {
			EDITOR.openFile(stdOutFile, "\n\n" + (new Date()) + ": Building " + selectedSite.name + " ...", function fileOpened(err, file) {
				if(err) throw err;
				appendBuildLog(file, msg);
			});
		}
	}
	
	function ssgProgressStatus(status) {
		console.log("ssgProgressStatus: " + JSON.stringify(status));
		
		if(!progressBar) return;
		
		progressBar.max = status.max;
		progressBar.value = status.value;
		
		if(status.max == status.value) {
			progressBar.style.display = "none";
			EDITOR.resizeNeeded();
			progressBar.max = 1;
			progressBar.value = 0;
		}
		else {
			var oldStyleDisplay = progressBar.style.display;
			progressBar.style.display = "block";
			if(oldStyleDisplay != "block") EDITOR.resizeNeeded();
		}
	}
	
	function appendBuildLog(file, msg) {
		
		console.log("appendBuildLog: " + file.path + " msg=" + msg);
		
		if(msg.type == "console") file.writeLine('"' + msg.msg + '" ' + msg.location + "");
		else if(msg.type == "error") file.writeLine('ERROR: ' + msg.msg);
		else file.writeLine(JSON.stringify(msg, null, 2));
		
		//else if(msg.exit) file.writeLine(msg.scriptName + " exited with exit code " + msg.exit.code + " and signal " + msg.exit.signal);
		
		EDITOR.renderNeeded();
	}
	
	function fileShow(file) {
		
		if(sites) {
			// Change site when you change file
			// Check if the file belongs to a site
			
			var filePath = file.path;
			
			for (var i=0; i<sites.length; i++) {
				if(filePath.indexOf(resolvePath(sites[i], sites[i].source)) != -1) {
					selectedSite = sites[i];
					break;
				}
			}
		}
	}
	
	function fileOpen(file) {
		
		var filePath = file.path;
		
		if(sites) {
			
			// Check all sites to see if the file belongs to any source
			
			for(var i=0; i<sites.length; i++) {
				console.log("askToOpenSourceFileIfOpenedPreviewFile=" + askToOpenSourceFileIfOpenedPreviewFile);
				console.log("filePath=" + filePath + " sites[" + i + "].preview=" + sites[i].preview);
				
				if(filePath.indexOf(resolvePath(sites[i], sites[i].source)) != -1) {
					showSSG();
					switchSite(i);
					break;
				}
				
				/*
					Warn user when opening a file from the preview folder
				*/
				else if(filePath.indexOf(resolvePath(sites[i], sites[i].preview)) != -1 && askToOpenSourceFileIfOpenedPreviewFile) {
					var openInstead = file.path.replace(resolvePath(sites[i], sites[i].preview), resolvePath(sites[i], sites[i].source));
					
					EDITOR.doesFileExist(openInstead, function fileExistMaybe(fileExists) {
						
						if(!fileExists) return; // It's a false-posetive (the preview is probably set to /wwwpub which also has other files)
						
						showSSG();
						switchSite(i);
						
						var fileName = UTIL.getFilenameFromPath(file.path);
						var yes = "Yes, open the source file instead";
						var no = "No, not this time";
						var stop = "No, don't ask again!";
						confirmBox('You have opened the "compiled" version of ' + fileName + '. Do you want to open the source file instead ?', [yes, no, stop], function(answer) {
							if(answer == yes) {
								
								EDITOR.closeFile(file);
								EDITOR.openFile(openInstead);
							}
							else if(answer == stop) {
								askToOpenSourceFileIfOpenedPreviewFile = false;
							}
						});
					});
					
					break;
				}
			}
		}
		
	}
	
	
	function fileDrop(dataFile) {
		// When a file is dropped into the editor
		
		var currentFile = EDITOR.currentFile;
		
		if(!currentFile) return false; // No file is open so the image is probably not supposed to go into a SSG site
		
		// Check if the currently opened file belongs to a SSG project:
		for(var i=0; i<sites.length; i++) {
			if(currentFile.path.indexOf(resolvePath(sites[i], sites[i].source)) != -1) {
				handleFile(sites[i], dataFile);
				return true;
			}
		}
		
		console.log("Current file does not belong to any SSG project!");
		
		return false; // Returing true means we handled the filedrop
		
		function handleFile(site, dataFile) {
			
			console.log("Current file belongs to SSG project: " + site.name);
			
			var filePath = dataFile.path || dataFile.name;
			var fileType = dataFile.type;
			var isImage = (fileType.indexOf("image") != -1);
			
			var defaultPath;
			if(filePath.match(/\/\\/)) defaultPath = filePath;
			else defaultPath = resolvePath(site, site.source) + filePath;
			
			if(isImage) var whereToSaveMessage = "Where to save the image ?"
			else var whereToSaveMessage = "Where to save the file ?";
			
			askWhereToSave();
			
			function askWhereToSave() {
				promptBox(whereToSaveMessage, false, defaultPath, function(filePath) {
					if(filePath) {
						console.log("Saving file: " + filePath);
						saveFile(filePath, function fileSaved(err, path) {
							if(err) return alertBox(err.message);
							
							console.log("Saved file: " + path);
							
							var currentFileName = UTIL.getFilenameFromPath(currentFile.path);
							
							if(currentFileName.match(/^(header|footer).html?/)) {
								var fileSrc = path.replace(resolvePath(site, site.source), "/"); // File paths needs to be absolute!
							}
							else {
								// File paths needs to be relative!
								var relativePath = getRelativePath(currentFile.path, resolvePath(site, site.source));
								var fileSrc = relativePath + path.replace(resolvePath(site, site.source), ""); 
							}
							
							if(isImage) {
								// todo: Some sort of crop and resize tool
								currentFile.insertText('<img src="' + fileSrc + '">');
							}
							else {
								var fileName = UTIL.getFilenameFromPath(filePath);
								currentFile.insertText('<a href="' + fileSrc + '">' + fileName + '</a>');
							}
							
						});
					}
				});
			}
			
			function saveFile(filePath, callback) {
				
				var folders = UTIL.getFolders(filePath);
				
				if(folders.length > 1) {
					EDITOR.folderExistIn(folders[folders.length-2], UTIL.getFolderName(folders[folders.length-1]), function (path) {
						if(path === false) {
							console.log("Path doesn't exist!");
							var createPath = "Create the path";
							var saveElsewhere = "Save the file elsewhere";
							var dontSave = "Don't save the file";
							confirmBox("The folder does not exist: " + folders[folders.length-1] + "\n" + 
							"Do you want to create the path ?", [createPath, saveElsewhere, dontSave], function(answer) {
								if(answer == createPath) {
									EDITOR.createPath(folders[folders.length-1], function(err) {
										if(err) throw err;
										else readFile();
									});
								}
								else if(answer == saveElsewhere) {
									askWhereToSave();
								}
								else if(answer == dontSave) {
									// Do nothing
								}
								else throw new Error("Unexpected answer=" + answer);
								
							});
							
						}
						else {
							console.log("Path exist!");
							readFile();
						}
					});
				}
				else readFile(); // It will be saved in the root dir
				
				function readFile() {
					var reader = new FileReader();
					reader.onload = function (event) {
						var data = event.target.result;
						
						// Specifying encoding:base64 will magically convert to binary!
						// We do have to remove the data:image/png metadata though!
						data = data.replace("data:" + fileType + ";base64,", "");
						EDITOR.saveToDisk(filePath, data, false, "base64", callback);
					};
					reader.readAsDataURL(dataFile); // For binary files (will be base64 encoded)
				}
			}
			
		}
	}
	
	function switchSite(index) {
		// Switch to the site
		
		var site = sites[index];
		
		if(site) {
			console.log("Switching to site=" + site.name);
			
			selectedSite = site;
			selectSite.selectedIndex = index;
			
			EDITOR.storage.setItem("cmsjz_selectedSiteName", site.name);
			
		}
		else throw new Error("Failed to switch to site index=" + index);
		
	}
	
	
	function build() {
		
		console.log("Building SSG manager");
		
		var footer = document.getElementById("footer");
		
		manager = document.createElement("div");
		
		buildEdit();
		buildControl();
		
		editView.style.display="none";
		
		manager.appendChild(editView);
		manager.appendChild(controlView);
		
		footer.appendChild(manager);
		
		
		
		console.log("done building server manager");
	}
	
	
	function buildControl() {
		
		//if(!sites) return alertBox("No sites for the static-site-generator available!");
		
		controlView = document.createElement("div");
		
		progressBar = document.createElement("progress");
		progressBar.setAttribute("class", "progress ssg");
		progressBar.setAttribute("style", "display: none;");
		progressBar.setAttribute("value", "0");
		progressBar.setAttribute("max", "1");
		controlView.appendChild(progressBar);
		
		selectSite = document.createElement("select");
		selectSite.setAttribute("id", "selectSite");
		selectSite.setAttribute("class", "select");
		selectSite.addEventListener("change", changeSelectSite, false);
		
		if(sites == undefined) throw new Error("Did not detect any configured sites for the static site generator!");
		
		if(sites.length > 0) {
			sites.forEach(addSiteOption);
		}
		
		var labelSite = document.createElement("label");
		labelSite.setAttribute("for", "selectSite");
		labelSite.setAttribute("title", "Select site");
		labelSite.appendChild(document.createTextNode("Static Site Generator:")); // Language settings!?
		labelSite.appendChild(selectSite);
		
		var buttonOpenEdit = document.createElement("input");
		buttonOpenEdit.setAttribute("type", "button");
		buttonOpenEdit.setAttribute("class", "button");
		buttonOpenEdit.setAttribute("value", "Open/edit file/page");
		buttonOpenEdit.setAttribute("title", "Select a file from the source code folder");
		buttonOpenEdit.addEventListener("click", function() {
			if(!selectedSite) throw new Error("No site selected!");
			
			hideSSG(); // Sets EDITOR.input to true
			
			EDITOR.changeWorkingDir(resolvePath(selectedSite, selectedSite.source));
			
			EDITOR.openFileTool({directory: resolvePath(selectedSite, selectedSite.source)}); // Sets EDITOR.input to false
			
			
		}, false);
		
		var buttonExplore = document.createElement("input");
		buttonExplore.setAttribute("type", "button");
		buttonExplore.setAttribute("class", "button");
		buttonExplore.setAttribute("value", "Explore files");
		buttonExplore.setAttribute("title", "Show file explorer");
		buttonExplore.addEventListener("click", function() {
			if(!selectedSite) throw new Error("No site selected!");
			
			EDITOR.changeWorkingDir(resolvePath(selectedSite, selectedSite.source));
			
			EDITOR.fileExplorer(resolvePath(selectedSite, selectedSite.source));
			
		}, false);
		
		var buttonNewPage = document.createElement("input");
		buttonNewPage.setAttribute("type", "button");
		buttonNewPage.setAttribute("class", "button");
		buttonNewPage.setAttribute("value", "New Page");
		buttonNewPage.addEventListener("click", function() {
			newPage(selectedSite);
		}, false);
		
		buttonPreview = document.createElement("input");
		buttonPreview.setAttribute("type", "button");
		buttonPreview.setAttribute("class", "button");
		buttonPreview.setAttribute("value", "Preview");
		buttonPreview.setAttribute("title", "Ctrl-click to ignore (draft) files starting with _ (underscore)");
		buttonPreview.addEventListener("click", function() {
			if(!selectedSite) return alertBox("No site selected!");
			previewPage(selectedSite, undefined, false);
		}, false);
		
		buttonWysiwyg = document.createElement("input");
		buttonWysiwyg.setAttribute("type", "button");
		buttonWysiwyg.setAttribute("class", "button");
		buttonWysiwyg.setAttribute("value", "WYSIWYG");
		buttonWysiwyg.addEventListener("click", wysiwygSSG, false);
		buttonWysiwyg.setAttribute("title", 'Edit the file in "What you see is what you get" mode');
		
		var buttonSync = document.createElement("input");
		buttonSync.setAttribute("type", "button");
		buttonSync.setAttribute("class", "button");
		buttonSync.setAttribute("value", "Sync with Repo");
		buttonSync.addEventListener("click", function() {
			syncSSG(selectedSite);
		}, false);
		
		var buttonPublish = document.createElement("input");
		buttonPublish.setAttribute("type", "button");
		buttonPublish.setAttribute("class", "button");
		buttonPublish.setAttribute("value", "Publish");
		buttonPublish.addEventListener("click", function() {
			publishSSG(selectedSite);
		}, false);
		
		var buttonSettings = document.createElement("input");
		buttonSettings.setAttribute("type", "button");
		buttonSettings.setAttribute("class", "button");
		buttonSettings.setAttribute("value", "Settings / new");
		buttonSettings.addEventListener("click", editSiteSettings, false);
		
		var buttonCancel = document.createElement("input");
		buttonCancel.setAttribute("type", "button");
		buttonCancel.setAttribute("class", "button");
		buttonCancel.setAttribute("id", "buttonCancel");
		buttonCancel.setAttribute("value", "Cancel");
		
		buttonCancel.addEventListener("click", function() {
			hideSSG();
		}, false);
		
		
		controlView.appendChild(labelSite); // Includes selectSite
		controlView.appendChild(buttonOpenEdit);
		controlView.appendChild(buttonExplore);
		controlView.appendChild(buttonNewPage);
		controlView.appendChild(buttonPreview);
		controlView.appendChild(buttonWysiwyg);
		controlView.appendChild(buttonSync);
		controlView.appendChild(buttonPublish);
		controlView.appendChild(buttonSettings);
		controlView.appendChild(buttonCancel);
		
		
		if(sites.length > 0) changeSelectSite(); // Select the one currently selected
		
		
	}
	
	function changeSelectSite() {
		
		//alertBox("Fired changeSelectSite");
		
		console.log("changeSelectSite: selectSite.selectedIndex=" + selectSite.selectedIndex + " selectSite.options=", selectSite.options);
		
		var selectedSiteIndex = selectSite.options[selectSite.selectedIndex].id;
		selectedSite = sites[selectedSiteIndex];
		if(selectedSite) {
		EDITOR.storage.setItem("cmsjz_selectedSiteName", selectedSite.name);
		
		inputSiteName.value = selectedSite.name;
		inputProjectFolder.value = selectedSite.projectFolder;
		inputSourceFolder.value = selectedSite.source;
		inputPreviewFolder.value = selectedSite.preview;
		inputPublishFolder.value = selectedSite.publish;
		inputTemplate.value = selectedSite.template;
		inputPubAuthUser.value = selectedSite.pubUser;
		inputPubAuthPw.value = selectedSite.pubPw;
		inputPubAuthKey.value = selectedSite.key;
		inputRepoAuthUser.value = selectedSite.repoUser;
		inputRepoAuthPw.value = selectedSite.repoPw;
		inputRepository.value = selectedSite.repository;
		inputUrl.value = selectedSite.url;
		}
		else console.warn("selectedSite=" + selectedSite);
	}
	
	function editSiteSettings() {
		
		//if(!selectedSite) throw new Error("No selected site");
		
		editView.style.display="block";
		controlView.style.display="none"; // Hide this div
		
		EDITOR.resizeNeeded();
	}
	
	function buildEdit() {
		
		var td, tr;
		
		editView = document.createElement("table");
		
		// Labels
		
		var labelName = document.createElement("label");
		labelName.setAttribute("for", "inputSiteName");
		labelName.appendChild(document.createTextNode("Alias:")); // Language settings!?
		
		
		var labelProjectFolder = document.createElement("label");
		labelProjectFolder.setAttribute("for", "inputProjectFolder");
		labelProjectFolder.appendChild(document.createTextNode("Project folder:"));
		
		var labelSource = document.createElement("label");
		labelSource.setAttribute("for", "inputSourceFolder");
		labelSource.appendChild(document.createTextNode("Source files:")); // Language settings!?
		
		var labelPreview = document.createElement("label");
		labelPreview.setAttribute("for", "inputPreviewFolder");
		labelPreview.appendChild(document.createTextNode("Preview:")); // Language settings!?
		
		var labelPublish = document.createElement("label");
		labelPublish.setAttribute("for", "inputPublishFolder");
		labelPublish.appendChild(document.createTextNode("Publish:")); // Language settings!?
		
		var labelUrl = document.createElement("label");
		labelUrl.setAttribute("for", "inputUrl");
		labelUrl.appendChild(document.createTextNode("URL:")); // Language settings!?
		
		var labelTemplate = document.createElement("label");
		labelTemplate.setAttribute("for", "inputTemplate");
		labelTemplate.appendChild(document.createTextNode("Template file:")); // Language settings!?
		
		var labelPubAuthUser = document.createElement("label");
		labelPubAuthUser.setAttribute("for", "inputPubAuthUser");
		labelPubAuthUser.appendChild(document.createTextNode("Pub Username:")); // Language settings!?
		
		var labelPubAuthPw = document.createElement("label");
		labelPubAuthPw.setAttribute("for", "inputPubAuthPw");
		labelPubAuthPw.appendChild(document.createTextNode("Pub Password:")); // Language settings!?
		
		var labelPubAuthKey = document.createElement("label");
		labelPubAuthKey.setAttribute("for", "inputPubAuthKey");
		labelPubAuthKey.appendChild(document.createTextNode("Pub Key:")); // Language settings!?
		
		var labelRepository = document.createElement("label");
		labelRepository.setAttribute("for", "inputRepository");
		labelRepository.appendChild(document.createTextNode("Repository:"));
		
		var labelRepoAuthUser = document.createElement("label");
		labelRepoAuthUser.setAttribute("for", "repoAuthUser");
		labelRepoAuthUser.appendChild(document.createTextNode("Repo Username:")); // Language settings!?
		
		var labelRepoAuthPw = document.createElement("label");
		labelRepoAuthPw.setAttribute("for", "inputRepoAuthPw");
		labelRepoAuthPw.appendChild(document.createTextNode("Repo Password:")); // Language settings!?
		
		// Inputs
		
		inputSiteName = document.createElement("input");
		inputSiteName.setAttribute("type", "text");
		inputSiteName.setAttribute("id", "inputSiteName");
		inputSiteName.setAttribute("class", "inputtext");
		inputSiteName.setAttribute("size", "30");
		
		inputProjectFolder = document.createElement("input");
		inputProjectFolder.setAttribute("type", "text");
		inputProjectFolder.setAttribute("id", "inputProjectFolder");
		inputProjectFolder.setAttribute("class", "inputtext path");
		inputProjectFolder.setAttribute("title", "Project root folder");
		inputProjectFolder.setAttribute("size", "69");
		
		inputSourceFolder = document.createElement("input");
		inputSourceFolder.setAttribute("type", "text");
		inputSourceFolder.setAttribute("id", "inputSourceFolder");
		inputSourceFolder.setAttribute("class", "inputtext path");
		inputSourceFolder.setAttribute("title", "Folder where the source files are located");
		inputSourceFolder.setAttribute("size", "69");
		
		inputPreviewFolder = document.createElement("input");
		inputPreviewFolder.setAttribute("type", "text");
		inputPreviewFolder.setAttribute("id", "inputPreviewFolder");
		inputPreviewFolder.setAttribute("class", "inputtext path");
		inputPreviewFolder.setAttribute("size", "69");
		inputPreviewFolder.setAttribute("title", "Where files for preview are sent: A file-system path or an URL to FTP/FTPS/FTPS");
		
		inputPublishFolder = document.createElement("input");
		inputPublishFolder.setAttribute("type", "text");
		inputPublishFolder.setAttribute("id", "inputPublishFolder");
		inputPublishFolder.setAttribute("class", "inputtext path");
		inputPublishFolder.setAttribute("size", "69");
		inputPublishFolder.setAttribute("title", "Where files for publishing are sent: A file-system path or an URL to FTP/FTPS/FTPS");
		
		inputUrl = document.createElement("input");
		inputUrl.setAttribute("type", "text");
		inputUrl.setAttribute("id", "inputUrl");
		inputUrl.setAttribute("class", "inputtext url");
		inputUrl.setAttribute("size", "69");
		inputUrl.setAttribute("title", "The URL of the web site when published");
		
		inputTemplate = document.createElement("input");
		inputTemplate.setAttribute("type", "text");
		inputTemplate.setAttribute("id", "inputTemplate");
		inputTemplate.setAttribute("class", "inputtext path");
		inputTemplate.setAttribute("size", "69");
		inputTemplate.setAttribute("title", "Template file for new page/post on this site");
		
		inputPubAuthUser = document.createElement("input");
		inputPubAuthUser.setAttribute("type", "text");
		inputPubAuthUser.setAttribute("id", "inputPubAuthUser");
		inputPubAuthUser.setAttribute("class", "inputtext");
		inputPubAuthUser.setAttribute("size", "20");
		inputPubAuthUser.setAttribute("title", "Username if needed for the publish URL");
		
		inputPubAuthPw = document.createElement("input");
		inputPubAuthPw.setAttribute("type", "password");
		inputPubAuthPw.setAttribute("id", "inputPubAuthPw");
		inputPubAuthPw.setAttribute("class", "inputtext");
		inputPubAuthPw.setAttribute("size", "20");
		inputPubAuthPw.setAttribute("title", "Password if needed for the publish URL")
		
		inputPubAuthKey = document.createElement("input");
		inputPubAuthKey.setAttribute("type", "text");
		inputPubAuthKey.setAttribute("id", "inputPubAuthKey");
		inputPubAuthKey.setAttribute("class", "inputtext");
		inputPubAuthKey.setAttribute("size", "40");
		inputPubAuthKey.setAttribute("title", "SSH Key")
		
		inputRepository = document.createElement("input");
		inputRepository.setAttribute("type", "text");
		inputRepository.setAttribute("id", "inputRepository");
		inputRepository.setAttribute("class", "inputtext");
		inputRepository.setAttribute("size", "40");
		inputRepository.setAttribute("title", "Mercurial Repository")
		
		inputRepoAuthUser = document.createElement("input");
		inputRepoAuthUser.setAttribute("type", "text");
		inputRepoAuthUser.setAttribute("id", "inputRepoAuthUser");
		inputRepoAuthUser.setAttribute("class", "inputtext");
		inputRepoAuthUser.setAttribute("size", "20");
		inputRepoAuthUser.setAttribute("title", "Username if needed for the publish URL");
		
		inputRepoAuthPw = document.createElement("input");
		inputRepoAuthPw.setAttribute("type", "password");
		inputRepoAuthPw.setAttribute("id", "inputRepoAuthPw");
		inputRepoAuthPw.setAttribute("class", "inputtext");
		inputRepoAuthPw.setAttribute("size", "20");
		inputRepoAuthPw.setAttribute("title", "Password if needed for the publish URL")
		
		
		// Buttons
		
		var buttonImport = document.createElement("input");
		buttonImport.setAttribute("type", "button");
		buttonImport.setAttribute("class", "button");
		buttonImport.setAttribute("value", "Import ...");
		buttonImport.addEventListener("click", importSiteSettings, false);
		
		var buttonSave = document.createElement("input");
		buttonSave.setAttribute("type", "button");
		buttonSave.setAttribute("class", "button");
		buttonSave.setAttribute("id", "buttonSave");
		buttonSave.setAttribute("value", "Save");
		buttonSave.addEventListener("click", saveSiteSettings, false);
		
		var buttonSaveAs = document.createElement("input");
		buttonSaveAs.setAttribute("type", "button");
		buttonSaveAs.setAttribute("class", "button");
		buttonSaveAs.setAttribute("value", "Save as new");
		buttonSaveAs.addEventListener("click", saveNewSite, false);
		
		var buttonDelete = document.createElement("input");
		buttonDelete.setAttribute("type", "button");
		buttonDelete.setAttribute("class", "button");
		buttonDelete.setAttribute("value", "Delete");
		buttonDelete.addEventListener("click", deleteSite, false);
		
		var buttonCancel = document.createElement("input");
		buttonCancel.setAttribute("type", "button");
		buttonCancel.setAttribute("class", "button");
		buttonCancel.setAttribute("value", "Cancel");
		buttonCancel.addEventListener("click", cancelEdit, false);
		
		var buttonBrowseKey = document.createElement("input");
		buttonBrowseKey.setAttribute("type", "button");
		buttonBrowseKey.setAttribute("class", "button half");
		buttonBrowseKey.setAttribute("value", "Browse");
		buttonBrowseKey.addEventListener("click", browseKey, false);
		
		//editView.setAttribute("style", "border: 3px solid red;");
		
		// Name
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelName);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.setAttribute("colspan", "3");
		td.appendChild(inputSiteName);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		// Project
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelProjectFolder);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputProjectFolder);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		
		// Source
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelSource);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputSourceFolder);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		
		// Preview
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelPreview);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputPreviewFolder);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		// Template
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelTemplate);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputTemplate);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		// Publish
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelPublish);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputPublishFolder);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		// URL
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelUrl);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputUrl);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		// Auth pub username
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelPubAuthUser);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputPubAuthUser);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		// Auth pub password
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelPubAuthPw);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputPubAuthPw);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		// Auth key
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelPubAuthKey);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputPubAuthKey);
		td.appendChild(buttonBrowseKey);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		
		// Repository
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelRepository);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputRepository);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		// Auth repo username
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelRepoAuthUser);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputRepoAuthUser);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		// Repo Auth password
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelRepoAuthPw);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputRepoAuthPw);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		
		// Buttons
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("colspan", "2");
		
		td.appendChild(buttonImport);
		td.appendChild(buttonSave);
		td.appendChild(buttonSaveAs);
		td.appendChild(buttonDelete);
		td.appendChild(buttonCancel);
		
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		
		function saveNewSite() {
			
			if(!EDITOR.storage.ready()) throw new Error("EDITOR.storage not available ready!");
			
			// Make sure the name/alias is not in use
			var name = inputSiteName.value;
			for (var i=0; i<sites.length; i++) {
				if(sites[i].name == name) {
					alertBox(name + " alias already used!");
					return;
				}
			}
			
			var index = sites.push({
				name: name,
				projectFolder: inputProjectFolder.value,
				source: inputSourceFolder.value,
				preview: inputPreviewFolder.value,
				publish: inputPublishFolder.value,
				template:  inputTemplate.value,
				pubUser: inputPubAuthUser.value,
				pubPw: inputPubAuthPw.value,
				key: inputPubAuthKey.value,
				repository: inputRepository.value,
				repoUser: inputRepoAuthUser.value,
				repoPw: inputRepoAuthPw.value,
				url: inputUrl.value
			}) - 1;
			
			selectedSite = sites[index];
			EDITOR.storage.setItem("cmsjz_selectedSiteName", selectedSite.name);
			
			var selectedIndex = addSiteOption(selectedSite, index); // Add new option
			
			selectSite.selectedIndex = selectedIndex;// Select the new option
			
			EDITOR.storage.setItem("cmsjz_sites", JSON.stringify(sites, null, 2)); // Save all sites in local-storage
			
			editView.style.display = "none"; // Hide the edit view
			controlView.style.display = "block"; // Show the connection view
			EDITOR.resizeNeeded();
			
			saveCnf(selectedSite);
			
		}
		
		function browseKey() {
			EDITOR.localFileDialog(undefined, function selectKey(path) {
				inputPubAuthKey.value = path;
			});
		}
		
		function cancelEdit() {
			
			if(selectedSite) {
				// Reset the values
			inputSiteName.value = selectedSite.name;
			inputProjectFolder.value = selectedSite.projectFolder;
			inputSourceFolder.value = selectedSite.source;
			inputPreviewFolder.value = selectedSite.preview;
			inputPublishFolder.value = selectedSite.publish;
			inputTemplate.value = selectedSite.template;
			inputPubAuthUser.value = selectedSite.pubUser;
			inputPubAuthPw.value = selectedSite.pubPw;
			inputPubAuthKey.value = selectedSite.key;
			inputRepository.value = selectedSite.repository;
			inputRepoAuthUser.value = selectedSite.repoUser;
			inputRepoAuthPw.value = selectedSite.repoPw;
			inputUrl.value = selectedSite.url;
			}
			else console.warn("No site selected!");
			
			editView.style.display = "none"; // Hide the edit view
			controlView.style.display = "block"; // Show the connection view
			EDITOR.resizeNeeded();
			
		}
		
		function saveSiteSettings() {
			
			if(!EDITOR.storage.ready()) throw new Error("EDITOR.storage not ready!");
			
			if(!selectedSite) return saveNewSite();
			
			if(selectedSite.name != inputSiteName.value) {
				selectSite.options[selectSite.selectedIndex].text = inputSiteName.value;
				EDITOR.storage.setItem("cmsjz_selectedSiteName", inputSiteName.value);
			}
			
			selectedSite.name = inputSiteName.value;
			selectedSite.projectFolder = inputProjectFolder.value;
			selectedSite.source = inputSourceFolder.value;
			selectedSite.preview = inputPreviewFolder.value;
			selectedSite.publish = inputPublishFolder.value;
			selectedSite.template = inputTemplate.value;
			selectedSite.pubUser = inputPubAuthUser.value;
			selectedSite.pubPw = inputPubAuthPw.value;
			selectedSite.key = inputPubAuthKey.value;
			selectedSite.repoUser = inputRepoAuthUser.value;
			selectedSite.repoPw = inputRepoAuthPw.value;
			selectedSite.repository = inputRepository.value;
			selectedSite.url = inputUrl.value;
			
			EDITOR.storage.setItem("cmsjz_sites", JSON.stringify(sites, null, 2));
			
			editView.style.display = "none";
			controlView.style.display = "block";
			EDITOR.resizeNeeded();
			
			saveCnf(selectedSite);
			
		}
		
		
		function deleteSite() {
			if(!EDITOR.storage.ready()) throw new Error("EDITOR.storage not ready!");
			
			selectSite.remove(selectSite.selectedIndex);
			EDITOR.storage.setItem("cmsjz_selectedSiteName", "");
			// Does it fire onChange events? 
			
			editView.style.display = "none"; // Hide the edit view
			controlView.style.display = "block"; // Show the connection view
			EDITOR.resizeNeeded();
			
			sites.splice(sites.indexOf(selectedSite), 1);
			EDITOR.storage.setItem("cmsjz_sites", JSON.stringify(sites, null, 2)); // Save all sites in local-storage
			
			// Select another site
			if(sites.length > 0) {
				selectedSite = sites[0];
				changeSelectSite();
			}
			else selectedSite = undefined;
			
			//alertBox("Site deleted!");
			
		}
		
		function importSiteSettings() {
			var fileName = "ssgconf.json";
			var defaultPath = EDITOR.currentFile && UTIL.getDirectoryFromPath(EDITOR.currentFile.path);
			
			if(defaultPath.indexOf(fileName) != -1) importCfg(defaultPath);
			else EDITOR.pathPickerTool({instruction: "Select a " + fileName + " file", defaultPath: defaultPath}, function(err, path) {
				if(err) alertBox("Unable to pick a project folder: " + err.message);
				else {
					if(path.indexOf(fileName) == -1) path = UTIL.joinPaths([path, fileName]);
					importCfg(path);
				}
			});
			
			function importCfg(cfgPath) {
				EDITOR.readFromDisk(cfgPath, function(err, path, data, hash) {
					if(err) alertBox("Failed to import from " + cfgPath + ": " + err.message);
					else {
						try {
							var site = JSON.parse(data); 
						}
						catch(err) {
							return alertBox("Failed to parse " + cfgPath + ": " + err.message);
						}

						inputSiteName.value = site.name;
						inputProjectFolder.value = site.projectFolder;
						inputSourceFolder.value = site.source;
						inputPreviewFolder.value = site.preview;
						inputPublishFolder.value = site.publish;
						inputTemplate.value = site.template;
						inputPubAuthUser.value = site.pubUser;
						inputPubAuthPw.value = site.pubPw;
						inputPubAuthKey.value = site.key;
						inputRepoAuthUser.value = site.repoUser;
						inputRepoAuthPw.value = site.repoPw;
						inputRepository.value = site.repository;
						inputUrl.value = site.url;
						
						saveNewSite();
						
					} 
				});
			}
		}
		
	}
	
	function saveCnf(site) {
		if(selectedSite != site) throw new Error("site=", site, " selectedSite=", selectedSite);
		if(typeof site != "object") throw new Error("site=" + site + " need to be an object!");
		var fileName = "ssgconf.json";
		var folder = site.projectFolder;
		if(folder == undefined || folder == ".") {
			var defaultPath = EDITOR.currentFile && UTIL.getDirectoryFromPath(EDITOR.currentFile.path);
			EDITOR.pathPickerTool({instruction: "Choose a project folder", defaultPath: defaultPath}, function gotPath(err, folder) {
				if(err) alertBox("Unable to pick a project folder: " + err.message);
				else {
					// Update the project folder
					site.projectFolder = folder;
					inputProjectFolder.value = site.projectFolder;
					if(selectedSite.projectFolder != folder) throw new Error("Folder didn't update for selectedSite=" + JSON.stringify(selectedSite) + " folder=" + folder);
					
					EDITOR.storage.setItem("cmsjz_sites", JSON.stringify(sites, null, 2));
					
					save(folder);
				}
			});
		}
		else save(folder);
		
		function save(folder) {
			var path = UTIL.joinPaths([folder, fileName]);
			EDITOR.saveToDisk(path, JSON.stringify(site, null, 2), function(err, path, hash) {
				if(err) alertBox("Unable to save " + fileName + ": " + err.message);
			});
		}
	}
	
	function addSiteOption(site, index) {
		
		if(!selectSite) throw new Error("selectSite not yet created!");
		
		var option = document.createElement("option");
		option.text = site.name;
		option.id = index;
		selectSite.appendChild(option);
		
		console.log("EDITOR.storage.getItem('cmsjz_selectedSiteName')=" + EDITOR.storage.getItem('cmsjz_selectedSiteName') + " site.name=" + site.name);
		
		if(EDITOR.storage.getItem("cmsjz_selectedSiteName") == site.name) {
			// Will this trigger change !? Yep, it seems to work!
			selectSite.selectedIndex = index;
			
		}
		
		return selectSite.options.length -1;
	}
	
	function showSSG() {
		
		console.log("Showing the static site generator -interface")
		
		EDITOR.hideMenu();
		
		EDITOR.input = false; // Steal focus from the file
		
		if(!manager) build(); // Build the GUI if it's not already built
		
		manager.style.display = "block";
		
		EDITOR.resizeNeeded();
		
		return false;
	}
	
	function hideSSG() {
		if(EDITOR.currentFile) EDITOR.input = true; // Bring back focus to the current file
		
		// Only need to hide if the object is created!
		if(manager) {
			manager.style.display = "none";
			EDITOR.resizeNeeded();
		}
		
		if(previewWin) {
			closePreview() ;
			
			if(buttonWysiwyg) {
				buttonWysiwyg.setAttribute("class", "button");
				buttonPreview.setAttribute("class", "button");
			}
		}
		
		return false;
	}
	
	function ssgPreviewTool(file, combo) {
		
		// Figure out if the file belongs to the SSG
		
		console.log("ssgPreviewTool");
		
		if(!selectedSite) {
			console.log("No site selected!");
			return false;
		}
		
		if(file.path.indexOf(resolvePath(selectedSite, selectedSite.source)) == -1) {
			console.log("selectedSite.source=" + selectedSite.source + " is not in file.path=" + file.path + "");
			return false;
		}
		
		previewPage(selectedSite, undefined, false, file, combo.ctrl);
		
		return true;
		
	}
	
	function previewSSG(file, combo) {
		if(!selectedSite) alertBox("No site selected!");
		else previewPage(selectedSite, undefined, false, file, combo.ctrl);
		
		return false;
	}
	
	function resolvePath(site, relativePath) {
		return UTIL.resolvePath(site.projectFolder, relativePath);
	}
	
	function previewPage(site, callback, edit, sourceFile, ignoreDraft) {
		
		if(!site) throw new Error("site=" + site);
		
		console.log('Previewing site.name="' + site.name + '". edit=' + edit);
		
		/*
			We must create the window here, so that it get associated with the button click
			Some browsers will not let us change the window position, so we need to specify it here also.
			
			To prevent same origin policy error, the editor must be served via http or https! (not file://)
		*/
		
		var url = "about:blank";
		var newWindow;
		if(previewWin) {
			// We want to use the same window position and width/height
			try {
				var test = previewWin.previewWin.innerWidth;
			}
			catch(err) {
				console.warn("Unable to measure old window. It's most likely closed already: " + err.message);
				var options = {url: url};
			}
			
			if(!options) {
				console.log("previewWin.screenX=" + previewWin.screenX);
				console.log("previewWin.previewWin.screenX=" + previewWin.previewWin.screenX);
				console.log("previewWin.previewWin.innerWidth=" + previewWin.previewWin.innerWidth);
				
				var width = parseInt(previewWin.previewWin.innerWidth);
				var height = parseInt(previewWin.previewWin.innerHeight);
				var top = parseInt(previewWin.previewWin.screenY || previewWin.previewWin.screenTop);
				var left = parseInt(previewWin.previewWin.screenX || previewWin.previewWin.screenLeft);
				
				options = {url: url, width: width, height: height, top: top, left: left};
			}
			
			EDITOR.createWindow(options, newWindowCreated);
		}
		else EDITOR.createWindow({url: url}, newWindowCreated);
		
		function newWindowCreated(err, winOpened) {
			
			if(err) return alertBox(err.message);
			
			newWindow = winOpened;
			
			if(sourceFile == undefined) {		
				pickFileToPreview(site, function(err, file) {
					if(err) {
						newWindow.close();
						alertBox(err.message);
					}
					else compileIt(file);
				});
			}
			else if((typeof sourceFile != "object")) {
				throw new Error("sourceFile needs to be a File object! sourceFile=" + sourceFile);
			}
			else {
				
				if(sourceFile.path.indexOf(resolvePath(site, site.source)) !== 0) {
					alertBox('' + sourceFile.path + ' does not belong to "' + site.name + '". Open a file from ' + resolvePath(site, site.source) + ' and try again.\n\n(have you saved the file ?)');
					newWindow.close();
				}
				else compileIt(sourceFile);
			}
		}
		
		function compileIt(sourceFile, recursionCounter) {
			
			if(!sourceFile) throw new Error("No source file specified!");
			
			if(typeof sourceFile.text != "string") {
				console.log(sourceFile);
				throw new Error("Property text in sourceFile is not a string! sourceFile.text=" + sourceFile.text);
			}
			
			var matchAbsSrc = sourceFile.text.match(/(src|href)\s?=\s?['"]\//i);
			
			
			if(!sourceFile.isSaved) {
				newWindow.close();
				return alertBox("Save file before preview:\n" + sourceFile.path);
			}
			else if(matchAbsSrc) {
				/*
					The SSG worker replaces all absolute paths to relative paths.
					And the WysiwygEditor.js will complain if there's a diff. eg <a href="/"> was replaced with <a href="../index.htm">
					solution: Try to fix it automatically
				*/
				
				if(recursionCounter == undefined) {
					console.log("Attempt automatic fix of absolute paths in sourceFile.path=" + sourceFile.path);
					recursionCounter = 1;
					
					
					var relativePath = getRelativePath(sourceFile.path, resolvePath(site, site.source));
					
					var text = sourceFile.text; // Don't change file.text directly or we'll mess up the grid!
					
					text = text.replace(/(href\s?=\s?['"])\/(['"])/i, "$1" + relativePath + "index.htm$2");
					text = text.replace(/(href\s?=\s?['"])\//i, "$1" + relativePath);
					text = text.replace(/(src\s?=\s?['"])\//i, "$1" + relativePath);
					
					sourceFile.reload(text);
					
					EDITOR.saveFile(sourceFile, sourceFile.path, function(err, path) {
						if(err) {
							throw new Error("Got an error when trying to save " + sourceFile.path + " after automatic relative paths fix. Error: " + err.message);
						}
						else {
							compileIt(sourceFile, recursionCounter);
						}
					});
					
				}
				else {
					
					console.log("recursionCounter=" + recursionCounter);
					
					newWindow.close();
					console.log("matchAbsSrc=" + JSON.stringify(matchAbsSrc));
					alertBox("Make any src or href attributes are relative! (remove the slash from " + matchAbsSrc[0] + ")\n\n" + 
					"src and href in headers and footers needs to be absolute, but in the page/content they need to be relative.");
					
					/* 
						headers and footers need to have absolute href and src attributs because they will be concatenated from different folder depths
						Having abslute paths makes it possible to make all paths relative once all headers and footers have been inserted into the page source.
						The static site generator will concatenate every header.htm in this file hierarchy:
						|--header.htm
						|--folder1/
						|----header.htm
						|----folder2/
						|------header.htm
						|------page.htm
					*/
				}
			}
			else {
				
				console.log("ignoreDraft=" + ignoreDraft); // publish flag that ignores files starting with _ (underscore)
				compile(resolvePath(site, site.source), resolvePath(site, site.preview), ignoreDraft, function compiled_static(err) {
					if(err) throw err;
					
					var protocol = UTIL.urlProtocol(resolvePath(site, site.preview));
					
					if(protocol) {
						alertBox("Preview uploaded to: " + site.preview);
						return;
					}
					
					// If the editor is run with file:// protocol we don't have to use the serve API to view the preview
					// Provided that the preview url is not a ftp/sft/ftps url
					console.log("site.preview=" + site.preview);
					
					if(resolvePath(site, site.preview).match(/^(ftp|sftp|ftps):/i)) {
						alertBox("Preview uploaded to: " + site.preview);
						alertBox("Can not preview from remote location such as ftp, sftp or ftps. The preview location must be a local folder.");
					}
					else if(document.location.href.match(/^file:/)) {
						// Don't have to serve
						previewServed(resolvePath(site, site.preview));
					}
					else {
						
						CLIENT.cmd("serve", {folder: resolvePath(site, site.preview)}, function httpServerStarted(err, json) {
							
							if(err) throw err;
							
							var url = json.url;
							
							// Replace the hostname with the hostname we are currently on to prevent cross origin errors
							var loc = UTIL.getLocation(url);
							
							if(!loc.host) throw new Error('Did not expect "falsy" loc.host=' + loc.host);
							if(!window.location.host) throw new Error('Did not expect "falsy" window.location.host=' + window.location.host);
							
							if(loc.host != window.location.host) {
								url = url.replace(loc.host, window.location.host);
								
								alertBox("Serve host was " + loc.host + " but was replaced with " + window.location.host + " to prevent cross origin errors!");
							}
							
							console.log("loc.host=" + loc.host + " window.location.host=" + window.location.host + " url=" + url);
							
							if(!url.match(/^http(s?):/i)) url = window.location.protocol + "//" + url;
							
							previewServed(url);
							
						});
					}
					
					function previewServed(url) {
						console.log("url=" + url);
						
						if(location) {
							console.log("location.protocol=" + location.protocol);
							//if(location.protocol) url = location.protocol + "//" + url;
						}
						//else url = "http://" + url;
						
						console.log("serve url=" + url);
						
						
						previewBaseUrl = url;
						
						if(sourceFile) {
							url += sourceFile.path.replace(resolvePath(site, site.source), "").replace(/\\/g, "/"); // url needs to have / instead of \ for path delimiter
							
							openPreviewWin();
							
						}
						else {
							// Open the index page
							
							notEditableReason = "No file open";
							editable = false;
							
							EDITOR.listFiles(resolvePath(site, site.preview), function(err, list) {
								
								if(err) throw err;
								
								var page = "";
								
								for (var i=0; i<list.length; i++) {
									if(list[i].name.match(/\index\.html?/i) != null) {
										page = list[i].name;
										break;
									}
								}
								
								if(page) {
									if(url.substr(url.length-1) != "/") url += "/";
									url += page;
								}
								else throw new Error("Unable to find index page in preview directory!");
								
								openPreviewWin();
								
							});
						}
						
						function openPreviewWin() {
							
							//if(edit) {
							
							// Get the source code for the compiled page in review, in order to compute ignoreTransform
							
							var previewPath = sourceFile.path.replace(resolvePath(site, site.source), resolvePath(site, site.preview));
							
							EDITOR.readFromDisk(previewPath, function gotPreviewSource(err, path, txt) {
								
								if(err) throw err;
								
								var compiledSource = txt;
								var compliedSourceBodyTag = "main";
								
								loadWysiwygEditor(compiledSource, compliedSourceBodyTag);
								
							});
							
							//}
							//else loadWysiwygEditor();
							
							
							function loadWysiwygEditor(compiledSource, compliedSourceBodyTag) {
								
								var bodyTag = "body";
								var onlyPreview = (edit == false);
								var whenLoaded = function previewLoaded(err) {
									if(err) return alertBox(err.message);
									
									if(buttonPreview) {
										buttonPreview.setAttribute("class", "button active");
										if(edit) {
											buttonWysiwyg.setAttribute("class", "button active");
											wysiwygEnabled = true;
										}
									}
									if(callback) callback();
								}
								
								if(previewWin) previewWin.close();
								
								console.log("SSG url=" + url + " RUNTIME=" + RUNTIME + " newWindow=" + newWindow);
								previewWin = new WysiwygEditor({
									sourceFile: sourceFile,
									bodyTagSource: bodyTag, 
									onlyPreview: onlyPreview, 
									newWindow: newWindow, 
									url: url, 
									whenLoaded: whenLoaded, 
									compiledSource: compiledSource, 
									bodyTagPreview: compliedSourceBodyTag,
									top: top,
									left: left,
									width: width,
									height: height,
									reCompile: reCompile
								});
								
								previewWin.onClose = function() {
									if(buttonPreview) {
										buttonPreview.setAttribute("class", "button");
										buttonWysiwyg.setAttribute("class", "button");
										wysiwygEnabled = false;
									}
								}
								
								function reCompile(reCompileCallback) {
									compile(resolvePath(site, site.source), resolvePath(site, site.preview), ignoreDraft, function recompiled(err) {
										reCompileCallback(err);
									});
								}
								
							}
						}
					}
					
				});
			}
		}
	}
	
	
	function closePreview() {
		// Close the preview window
		
		if(previewWin) {
			previewWin.close();
			previewWin = undefined;
		}
		
	}
	
	
	function syncSSG() {
		if(selectedSite) syncRepository(selectedSite);
		else {
			showSSG();
			alertBox("Select site to sync!");
		}
		return false;
	}
	
	function publishSSG() {
		if(selectedSite) publishSite(selectedSite);
		else {
			showSSG();
			alertBox("Select site to publish!");
		}
		return false;
	}
	
	function syncRepository(site, syncRepositoryCallback) {
		/* selectedSite.source, selectedSite.repository, selectedSite.repoAuthUser, selectedSite.repoAuthPw
			
			1. Check if Mercurial is initiated in the source folder
			2. Check for uncommited changes
			3. Pull>Merge>Push
			
		*/
		
		if(site.projectFolder == undefined || site.projectFolder == "undefined") {
			alertBox("No project folder configured for site: " + site.name);
			editSiteSettings();
			return;
		}
		
		var folders = UTIL.getFolders(site.projectFolder);
		
		lookInFolder(folders.pop());
		
		function lookInFolder(folder) {
			EDITOR.folderExistIn(folder, ".hg", function(existingFolder) {
				if(existingFolder) {
					hgFolderFound(existingFolder);
			}
				else if(folders.length > 1) {
					lookInFolder(folders.pop());
				}
				else {
					noHgFolderFound();
				}
			});
		}
		
		function noHgFolderFound() {
			if(site.repository != undefined && site.repository != "undefined") {
				// .hg folder don't exist. Ask if user wants to init (using clone)
				
				console.log("site.repository=" + site.repository);
				
				var cloneInit = "Clone from repository";
				var noThanks = "No, thanks"
				confirmBox("The repository for " + site.name + " is not initiated.<br>Do you want to (clone) init the repo from repository:<br>" + site.repository, [cloneInit, noThanks], function(answer) {
					if(answer == cloneInit) doHgCloneInit();
				});
				
			}
			else {
				alertBox("No repository configured for site: " + site.name + "!");
			}
		}
		
		function hgFolderFound(existingFolder) {
			// Check if remote is the same as repository
			var hgrcFile = existingFolder + "hgrc";
			console.log("hgrcFile=" + hgrcFile);
			EDITOR.readFromDisk(hgrcFile, function(err, hgrcFile, hgrcContent) {
				if(err) throw err; // All mercurial repos should have a hgrc!
				
				var pathPartStart = hgrcContent.indexOf("[paths]");
				
				if(pathPartStart == -1) {
					// hgrc has no paths part, add [paths] and default repository
					hgrcContent = "[paths]\ndefault = " + site.repository + "\n" + hgrcContent;
					EDITOR.saveToDisk(hgrcFile, hgrcContent, function(err, hgrcFile) {
						if(err) throw err; // Unexpected
						doHgSync();
					});
				}
				else {
					var pathPartEnd = hgrcContent.indexOf("[", pathPartStart + 1);
					var pathPart;
					
					if(pathPartEnd != -1) pathPart = hgrcContent.substring(pathPartStart + 7, pathPartEnd);
					else pathPart = hgrcContent.substring(pathPartStart + 7);
					
					// Check if our repo is the default repo
					var regex = new RegExp("default\\s?=\\s?(.*)");
					var repos = pathPart.match(regex);
					
					if(repos == null) {
						// No default repo exist, add our repo as default
						hgrcContent = hgrcContent.substring(0, pathPartStart + 7) + "\ndefault = " + site.repository + "\n" + hgrcContent.substring(pathPartStart + 8);
						console.log("pathPart=" + pathPart);
						console.log("reg: " + pathPart.match(regex) + " (" + regex + ")");
						console.log("Saving hgrcContent:\n" + hgrcContent);
						EDITOR.saveToDisk(hgrcFile, hgrcContent, function(err, hgrcFile) {
							if(err) throw err; // Unexpected
							doHgSync();
						});
					}
					else {
						var defaultRepo = repos[1].trim();
						var siteRepo = site.repository.trim();
						if(defaultRepo != siteRepo) {
							
							if(siteRepo == "" && defaultRepo != "") {
								// Update settings
								site.repository = defaultRepo;
								EDITOR.storage.setItem("cmsjz_sites", JSON.stringify(sites, null, 2));
								doHgSync();
							}
							else {
								// Ask
								var useDefault = "Use hgrc default repo";
								var useSettings = "Use settings repo";
								var cancelSync = "Cancel Sync";
								
								confirmBox("Repository in SSG settings do not match with the default repository in hgrc!\nhsettings repo: " + site.repository + "\nhgrc default repo: " + defaultRepo, [changeDefault, updateSettings, cancelSync], function(answer) {
									
									if(answer == useSettings) {
										var fullString = repos[0];
										hgrcContent = hgrcContent.replace(fullString, "default = " + site.repository);
										EDITOR.saveToDisk(hgrcFile, hgrcContent, function(err, hgrcFile) {
											if(err) throw err; // Unexpected
											doHgSync();
										});
									}
									else if(answer == useDefault) {
										site.repository = defaultRepo;
										EDITOR.storage.setItem("cmsjz_sites", JSON.stringify(sites, null, 2));
										doHgSync();
									}
									//else if(answer == cancelSync) do nothing
								});
							}
						}
						else {
							// All good, our repo is the default repo!
							doHgSync();
						}
					}
				}
			});
		}
		
		function doHgCloneInit() {
			var command = "mercurial.clone";
			
			var commandOptions = {
				local: selectedSite.projectFolder,
				remote: selectedSite.repository,
				user: selectedSite.repoUser,
				pw: selectedSite.repoPw,
				save: true
			}
			
			CLIENT.cmd(command, commandOptions, function cloned(err, resp) {
				if(err) alertBox(err.message);
				else {
					alertBox("Successfully cloned to:\n" + resp.path);
				};
			});
		}
		
		function doHgSync() {
			
			/*
				1. Make sure all files opened by the editor and belongs to the repo - is saved
				Ask to save or discard (reload from disk) unsaved files. Then goto 2.
				
				2. Make sure there are no uncommited files in working rev.
				Show commit tool if there are uncommited files
				
				3. Check for unresolved files in working rev.
				Show resolve tool if there are unresolved files
				
				4. Check for multiple heads
				Show merge tool if there are multiple heads, if the merge fails goto 3
				
				5. Pull updates from remote repository
				
				6. Attempt update/merge
				
				7. Push to remote repository
				
			*/
			
			var unsavedFiles = [];
			var rootPath = resolvePath(selectedSite, selectedSite.source);
			
			for(var path in EDITOR.files) {
				if(path.indexOf(rootPath) != -1 && !EDITOR.files[path].isSaved) {
					unsavedFiles.push(EDITOR.files[path]);
				}
			}
			
			askToSaveFiles();
			
			function askToSaveFiles() {
				if(unsavedFiles.length > 0) askToSave(unsavedFiles[0]);
				else checkRepoStatus();
			}
			
			function askToSave(file) {
				
				var save = "Save";
				var saveAs = "Save backup";
				var discard = "Discard unsaved changes";
				var abort = "Abort sync";
				var msg = "The following file is not saved:\n" + file.path;
				
				confirmBox(msg, [save, discard, abort], function (answer) {
					if(answer == save) {
						EDITOR.saveFile(file, file.path, function fileSaved(err, path) {
							if(err) return alertBox("Unable to save file: " + file.path);
							else {
								unsavedFiles.splice(unsavedFiles.indexOf(file), 1);
								askToSaveFiles();
							}
						});
					}
					else if(answer == discard) {
						EDITOR.readFromDisk(file.path, function(err, path, text) {
							if(err) return alertBox("Unable to read file: " + file.path);
							
							file.reload(text);
							
							file.saved(); // Because we reloaded from disk
							
							unsavedFiles.splice(unsavedFiles.indexOf(file), 1);
							askToSaveFiles();
							
						});
					}
					
				});
			}
			
			function checkRepoStatus() {
				
				CLIENT.cmd("mercurial.status", {directory: UTIL.trailingSlash(selectedSite.projectFolder)}, function hgstatus(err, resp) {
					if(err) return alertBox(err.message);
					
					var modified = resp.modified;
					var rootDir = UTIL.trailingSlash(resp.rootDir);
					var untracked = resp.untracked;
					
					console.log("mercurial.status resp=" + JSON.stringify(resp));
					
					if(modified.length > 0) {
						if(syncRepositoryCallback) syncRepositoryCallback("MODIFIED");
						else alertBox("Commit changes before syncing!");
						EDITOR.commitTool(rootDir);
					}
					else if(untracked.length > 0) {
						if(syncRepositoryCallback) syncRepositoryCallback("UNTRACKED");
						else alertBox("There are new files. What to do with them !?");
						EDITOR.commitTool(rootDir);
					}
					else checkRepoUnresolved();
					
				});
			}
			
			function checkRepoUnresolved() {
				CLIENT.cmd("mercurial.resolvelist", {directory: UTIL.trailingSlash(selectedSite.projectFolder)}, function resolveList(err, resp) {
					if(err) throw err;
					
					if(resp.resolved.length == 0 && resp.unresolved.length == 0) {
						checkRepoMultipleHeads();
					}
					else if(resp.unresolved.length > 0) {
						if(syncRepositoryCallback) syncRepositoryCallback("UNRESOLVED");
						else alertBox("Resolve merge problems before syncing!");
						EDITOR.resolveTool(selectedSite.projectFolder);
					}
					else if(resp.resolved.length > 0) {
						if(syncRepositoryCallback) syncRepositoryCallback("COMMIT");
						else alertBox("Commit resolved files before syncing!");
						EDITOR.commitTool(selectedSite.projectFolder);
					}
					else throw new Error("resp.resolved=" + JSON.stringify(resp.resolved) + " resp.unresolved=" + JSON.stringify(resp.unresolved));
					
				});
			}
			
			function checkRepoMultipleHeads() {
				CLIENT.cmd("mercurial.heads", {directory: UTIL.trailingSlash(selectedSite.projectFolder)}, function resolveList(err, resp) {
					if(err) throw err;
					
					if(resp.heads.length == 1) {
						pullFromRepo();
					}
					else {
						
						var merge = "Merge";
						var cancel = "Cancel";
						
						confirmBox("There are multiple heads in the Mercurial repository. Do you want to merge them ?", [merge, cancel], function(answer) {
							
							if(answer == merge) {
								CLIENT.cmd("mercurial.merge", {directory: UTIL.trailingSlash(selectedSite.projectFolder)}, function resolveList(err, resp) {
									if(err) throw err;
									
									if(resp.unresolved == 0) {
										alertBox("Merge successful! " + resp.updated + " files updated, " + resp.merged + " files merged, " + resp.removed + " files removed, " + resp.unresolved + " files unresolved.");
										pullFromRepo();
									}
									else checkRepoUnresolved();
									
								});
							}
						});
					}
				});
			}
			
			function pullFromRepo() {
				CLIENT.cmd("mercurial.pull", {directory: UTIL.trailingSlash(selectedSite.projectFolder)}, hgPull);
				
				function hgPull(err, resp) {
					if(err) {
						
						var authNeeded = err.message.match(/abort: http authorization required for (.*)/);
						var authFailed = err.message.match(/abort: authorization failed/);
						
						if(authNeeded) {
							if(selectedSite.repoUser == "") {
								alertBox("The repository for " + selectedSite.name + " needs a username and password!");
								editSiteSettings();
							}
							else {
								var save = true; // Save credentials in .hgrc
								return CLIENT.cmd("mercurial.pull", {
									directory: UTIL.trailingSlash(selectedSite.projectFolder), 
									user: selectedSite.repoUser, 
									pw: selectedSite.repoPw, 
									save: save
								}, hgPull);
							}
						}
						else if(authFailed) {
							var repoUrl = authNeeded[1];
							if(syncRepositoryCallback) syncRepositoryCallback("AUTH_FAILED");
							else alertBox("Authorization failed!\nUnable to Pull from " + repoUrl);
							return;
						}
						else throw err;
					}
					else {
						
						var changes = resp.changes; // Number
						var repoUrl = resp.repo;
						var ask = false;
						var filesOpenedInEditorAndNotSaved = [];
						var filesChanged = resp.files;
						var filesOpenedInEditorThatChanged = [];
						
						if(repoUrl == undefined) throw new Error("repoUrl=" + undefined + " resp=" + JSON.stringify(resp, null, 2));
						
						if(changes === 0) {
							console.log("No incoming changes from " + repoUrl);
							
							pushToRepo();
							
							return; // No incoming changes
						}
						
						for(var i=0; i<filesChanged.length; i++) {
							
							var filePath = filesChanged[i];
							
							if(EDITOR.files.hasOwnProperty(filePath)) {
								// We only care about files opened by the editor
								
								var changedFile = EDITOR.files[filePath];
								
								filesOpenedInEditorThatChanged.push(changedFile);
								
								if(!changedFile.isSaved) filesOpenedInEditorAndNotSaved.push(filePath.replace(selectedSite.projectFolder, ""));
								
							}
						}
						
						if(filesOpenedInEditorAndNotSaved.length != 0) {
							console.warn("Files not saved (but we did check before): " + filesOpenedInEditorAndNotSaved.join("\n"));
							alertBox("Can not update files that are not saved. Save the following files and then try again:\n" + filesOpenedInEditorAndNotSaved.join("\n"));
						}
						else {
							CLIENT.cmd("mercurial.update", {directory: UTIL.trailingSlash(selectedSite.projectFolder)}, function hgUpdated(err, resp) {
								if(err) return alertBox(err.message);
								
								console.log("mercurial.update: resp=" + JSON.stringify(resp));
								
								var whenAllFilesReloaded = null;
								
								var alertMsg = resp.updated + " files updated, " + resp.merged + " files merged, " + resp.removed + " files removed and " + resp.unresolved + " files unresolved.";
								
								if(resp.unresolved > 0) {
									alertMsg += "\nAutomatic file merge fialed. You have to manually resolve conflicts!";
									whenAllFilesReloaded = function resolveFiles() {
										if(syncRepositoryCallback) syncRepositoryCallback("UNRESOLVED");
										else alertBox(alertMsg);
										
										EDITOR.resolveTool(resp.resolved, resp.unresolved, selectedSite.projectFolder);
									}
									
								}
								else {
									alertMsg = "Update successful! " + alertMsg;
									whenAllFilesReloaded = function push() {
										//alertBox(alertMsg);
										pushToRepo();
									} 
									}
								
								var filesReloaded = 0;
								if(filesOpenedInEditorThatChanged.length == 0) {
whenAllFilesReloaded();
								}
								else {
									for(var path in filesOpenedInEditorThatChanged) reloadFile(filesOpenedInEditorThatChanged[path]);
								}
								
								function reloadFile(file) {
									EDITOR.readFromDisk(file.path, fileRead);
									
									function fileRead(err, path, text) {
										if(err) return alertBox("Unable to read file: " + file.path);
										
										file.reload(text);
										
										file.saved(); // Because we reloaded from disk
										
										if(++filesReloaded == filesOpenedInEditorThatChanged.length) whenAllFilesReloaded();
									}
								}
							});
						}
					}
				}
			}
			
			function pushToRepo() {
				console.log("Calling mercurial.push!");
				CLIENT.cmd("mercurial.push", {directory: UTIL.trailingSlash(selectedSite.projectFolder)}, function pushed(err, resp) {
					
					console.log("mercurial.push: err=" + err + " syncRepositoryCallback=" + syncRepositoryCallback + " resp=" + JSON.stringify(resp));
					
					if(err) alertBox(err.message);
					else if(syncRepositoryCallback) syncRepositoryCallback(null);
					else alertBox("Sync complete!");
					
				});
			}
			
		}
	}
	
	
	function publishSite(site) {
		
		if(site.repository) {
			// First make sure it's synced
			syncRepository(site, function repoSynced(em) {
				if(em == null) publishIt();
				else if(em == "UNRESOLVED") {
					alertBox("You need to resolve SCM conflicts before publishing!");
				}
				else if(em == "AUTH_FAILED") {
					alertBox("Unable to publish because wrong repository credentials!");
				}
				else if(em == "COMMIT") {
					alertBox("You need to commit changes before publishing!");
				}
				else if(em == "UNTRACKED") {
					alertBox("You need to deal with untracked files before publishing!");
				}
				else if(em == "MODIFIED") {
					alertBox("You need to commit changes before publishing!");
				}
				else throw new Error("Unknown error messsage: " + em);
			});
		}
		else publishIt();
		
		return false;
		
		function publishIt() {
			
			if(!site.source) throw new Error("Site name=" + site.name + " has no source folder specified! site.source=" + site.source);
			if(!site.publish) throw new Error("Site name=" + site.name + " has no publish url specified! site.publish=" + site.publish);
			
			compile(resolvePath(site, site.source), resolvePath(site, site.publish), true, function buildDone(err) {
				if(err) throw err;
				
				alertBox('<b>' + site.name + '</b> published to:<br>' + site.publish + (site.url ? '<br>URL:' + urlElementString(site.url) : ''));
				
				function urlElementString(url) {
					
					if(!url.match(/^http(s?):\/\//i)) url = "http://" + url;
					
					return '<a href="' + url + '" target="blank">' + url + '</a>';
					
				}
				
			});
		}
		
	}
	
	function newPage(site) {
		
		if(!site.template) return alertBox("No template file for new file/page specified! Edit settings and set a path for template file.");
		
		EDITOR.changeWorkingDir(resolvePath(site, site.source));
		
		EDITOR.readFromDisk(resolvePath(site, site.template), function fileRead(err, path, text) {
			
			if(err) alertBox("Unable to find new file/page template! (site.template=" + site.template + "). " + err.message);
			else {
				
				// Update dates
				var date = new Date();
				var monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
				text = text.replace('<meta name="created" content="2042-03-22">', '<meta name="created" content="' + date.getFullYear() + '-' + zeroPad(date.getMonth()) + '-' + zeroPad(date.getDate()) + '">');
				text = text.replace('<meta name="author" content="Jon Doe">', '<meta name="author" content="' + EDITOR.user + '">');
				text = text.replace('<p>Written by <a href="/" rel="author">Jon Doe</a> Mars 22, 2042.</p>', '<p>Written by <a href="/" rel="author">' + EDITOR.user + '</a> ' + monthName[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear() + '.</p>');
				
				EDITOR.openFile("newPage.htm", text);
			}
			
			function zeroPad(nr) {
				nr = nr + ""; // Turn it into a string
				if(nr.length < 2) nr = "0" + nr;
				return nr;
			}
			
		});
		
		return false;
	}
	
	
	function compile(source, destination, publish, callback) {
		
		var opt = {source: source, destination: destination, publish: publish, pubUser: selectedSite.pubUser, pubPw: selectedSite.pubPw, pubKey: resolvePath(selectedSite, selectedSite.key)};
		
		CLIENT.cmd("SSG.compile", opt, function(err, json) {
			
			if(err) callback(err);
			else callback(null);
			
		});
		
	}
	
	function wysiwygSSG() {
		var site;
		
		if(selectedSite) site = selectedSite; 
		else {
			showSSG();
			alertBox("Select site to edit!");
			return false;
		}
		
		wysiwygEnabled = wysiwygEnabled ? false : true; // Toggle 
		
		if(!wysiwygEnabled && previewWin) return previewWin.disableEdit(function WysiwygEditorDisabled() {
			
			if(buttonWysiwyg) {
				buttonWysiwyg.setAttribute("class", "button");
				
				if(previewWin) buttonPreview.setAttribute("class", "button active");
				else buttonPreview.setAttribute("class", "button");
			}
			
		});
		
		// Witch file/page should we edit ?
		// If we are previewing a file, then pick the file in preview
		if(previewWin) {
			try {
				var url = previewWin.location.href;
				var sourceFilePath = url.replace(previewBaseUrl, resolvePath(site, site.source));
			}
			catch(err) {
				console.log("Unable to get previewWin url: " + err.message);
				// Unable to get the file currently being previewed.
				// The preview window has probably been closed.
				return pickFileToPreview(site, makeItEditable);
				// The current previewWin will be closed, and another opeened, when calling previewPage
			}
			
			console.log("sourceFilePath=" + sourceFilePath);
			
			
			// Open the file in the editor if it's not already open
			if(EDITOR.files.hasOwnProperty(sourceFilePath)) {
				var sourceFile = EDITOR.files[sourceFilePath];
				EDITOR.showFile(sourceFile); // Make sure it's the current one open
				
				makeItEditable(null, sourceFile);
			}
			else {
				EDITOR.openFile(sourceFilePath, undefined, makeItEditable);
			}
		}
		else pickFileToPreview(site, makeItEditable);
		
		return false; // Prevent default browser action
		
		
		function makeItEditable(err, sourceFile) {
			
			if(err) throw err;
			
			if(sourceFile.text.indexOf("<?JS") != -1) {
				alertBox('Can not edit pages containing dynamic "server side" JavaScript!');
				// previewWin never opened!
				return;
			}
			
			var edit = true;
			var callback = previewWinOpened;
			
			previewPage(site, previewWinOpened, edit, sourceFile);
			
		}
		
		function previewWinOpened() {
			
			// Change buttonWysiwyg state to "active"
			if(buttonWysiwyg) {
				buttonWysiwyg.setAttribute("class", "button active");
				buttonPreview.setAttribute("class", "button active");
			}
			
		}
		
	}
	
	
	function pickFileToPreview(site, callback) {
		
		// Calls back with (err,file)
		
		console.log("Picking suitable file to preview/edit on site.name=" + site.name + " ...");
		
		if(!site.source) throw new Error("Site name=" + site.name + " has no no source! site.source=" + site.source + " site=" + JSON.stringify(site));
		
		if(like(site, EDITOR.currentFile)) return callback(null, EDITOR.currentFile);
		
		
		// Is any of the source files opened ?
		var openedFilesArray = [];
		
		for(var path in EDITOR.files) openedFilesArray.push(EDITOR.files[path]);
		
		var sourceFilePath = chooseFilePath(openedFilesArray);
		
		if(sourceFilePath) {
			if(!EDITOR.files.hasOwnProperty(sourceFilePath)) throw new Error("Does not exist in EDITOR.files: " + sourceFilePath);
			callback(null, EDITOR.files[sourceFilePath]);
		}
		else {
			// Open any of the source files
			EDITOR.listFiles(resolvePath(site, site.source), function sourceFileList(err, list) {
				
				if(err) return callback(err);
				
				var sourceFilePath = chooseFilePath(list);
				
				if(sourceFilePath) EDITOR.openFile(sourceFilePath, undefined, callback);
				else {
					callback(new Error("Unable to pick a source file to preview/edit!"));
				}
				
			});
		}
		
		function chooseFilePath(fileList) {
			
			if(Object.prototype.toString.call( fileList ) !== '[object Array]') throw new Error("fileList must be an array!");
			
			for(var i=0; i<fileList.length; i++) {
				
				if(!fileList[i].hasOwnProperty("path")) throw new Error("fileList item " + i + " does not have a path property!nfileList=" + JSON.stringify(fileList));
				if(!fileList[i].hasOwnProperty("name")) throw new Error("fileList item " + i + " does not have a name property!nfileList=" + JSON.stringify(fileList));
				
				if(!fileList[i].path) throw new Error("filePathList[" + i + "] Does not have a path property: " + JSON.stringify(filePathList[i]));
				if(!fileList[i].name) throw new Error("filePathList[" + i + "] Does not have a name property: " + JSON.stringify(filePathList[i]));
				
				if(like(site, fileList[i])) return fileList[i].path;
				
			}
			
			return null;
		}
		
	}
	
	function like(site, file) {
		
		if(!file) {
			console.log("We don't like site=" + site + " because file=" + file);
			return false;
		}
		
		if(file.path.indexOf(resolvePath(site, site.source)) != 0) {
			console.log("We don't like " + file.path + " because it's not part of site.source=" + site.source);
			return false;
		}
		
		if(!file.name.match(/html?$/i)) {
			console.log("We don't like " + file.path + " because it's not a HTML file");
			return false;
		}
		
		if(file.name.match(/(header|footer).html?/i)) {
			console.log("We don't like " + file.path + " because it's not a header of footer file");
			return false;
		}
		
		console.log("We DO like " + file.path + " !");
		
		return true;
	}
	
	function getRelativePath(path, root) {
		
		// /foo/source/bar/file.htm => bar/file.htm (count the slashes)
		var relativePath = path.replace(root, "");
		console.log("relativePath=" + relativePath);
		var folderLevels = UTIL.occurrences(relativePath, "/", false);
		var relativePath = "";
		for (var i=0; i<folderLevels; i++) {
			relativePath += "../";
		}
		return relativePath;
	}
	
	
})();
