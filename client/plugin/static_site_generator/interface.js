(function() {
	"use strict";
	
	var sites; // Array of sites
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
	
	// Add plugin to editor
	EDITOR.plugin({
		desc: "Static site generator management interface",
		load: load,
		unload: unload,
		order: 1100 // So that "quickedit" don't open the file before reopen_files.js plugin does
	});
	
	function getSites() {
		
		console.log("Getting SSG sites ...");
		
		var storageSites = EDITOR.storage.getItem("cmsjz_sites");
		
		if(storageSites) {
			try {
				sites = JSON.parse(storageSites);
			}
			catch(err) {
				throw new Error("Unable to parse sites from storage! " + err.message);
			}
		}
		
		if(!sites) {console.warn("Failed to get any sites from the static site generator!\n\
			storageSites=" + storageSites + " ... " + (storageSites ? "Truthy" : "Falsy") + "\n\
			sites=" + JSON.stringify(sites, null, 2));
			//alertBox("You have no configurated static-site-generator sites.");
		}
		
		// quickedit.js ...
		if(QueryString.editPage) {
			
			var url = QueryString.editPage;
			var nodes = QueryString.nodes.split(",");
			
			var site = isSite(url);
			
			if(site) {
				var path = UTIL.getPathFromUrl(url);
				var dir = UTIL.getDirectoryFromPath(path);
				
				if(path.indexOf(site.publish) != -1) {
					path = path.substr(path.indexOf(site.publish)); // Remove hostname and stuff
					
					path = path.replace(site.publish, site.source);
					
					EDITOR.openFile(path, undefined, function fileOpened(err, file) {
						if(err) {
							alertBox("Unable to open this file:\n" + path);
						}
						else {
							// Find where to edit
							if(QueryString.nodes) {
								
								var element = QueryString.nodes.split(",");
								
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
						
					});
					
				}
				else {
					alertBox("Unable to figure out witch file this is:\n" + path);
					console.log("site.source=" + site.source);
					console.log("site.publish=" + site.publish);
					console.log("path=" + path);
					
				}
				
				
				// Figure out wich file ...
				
				
			}
			else {
				console.warn("Couln't determine what site the url belongs to: " + url);
			}
			
			function isSite(url) {
				// Figure out if the url belongs to any of our sites ...
				for(var i=0, site; i<sites.length; i++) {
					site = sites[i];
					
					if(url.indexOf(site.url) == 0) return site;
					if(url.indexOf(site.publish) == 0) return site;
					if(url.indexOf(site.preview) == 0) return site;
					
				}
			}
			
		}
		
		
	}
	
	function load() {
		// Called when the module is loaded
		
		//alertBox("loading");
		
		EDITOR.on("storageReady", getSites);
		
		
		var keyF9 = 120;
		var keyEscape = 27;
		
		EDITOR.bindKey({desc: "Show the manager for the static site generator", fun: showSSG, charCode: keyF9, combo: 0});
		EDITOR.bindKey({desc: "Hide the manager for the static site generator", fun: hideSSG, charCode: keyEscape, combo: 0});
		EDITOR.bindKey({desc: "Compiles a preveiw for current site in the static site generator", fun: previewSSG, charCode: keyF9, combo: CTRL});
		EDITOR.bindKey({desc: "WYSIWYG editor for current site in the static site generator", fun: wysiwygSSG, charCode: keyF9, combo: CTRL + SHIFT});
		EDITOR.bindKey({desc: "Publish/live deployment of the static-site-generator site", fun: publishSSG, charCode: keyF9, combo: CTRL + ALT + SHIFT});
		
		
		//build();
		
		menuItem = EDITOR.addMenuItem("Static site generator", function() {
			showSSG();
			EDITOR.hideMenu();
		});
		
		EDITOR.on("fileShow", fileShow);
		
		EDITOR.on("exit", SSG_cleanup);
		
		EDITOR.on("fileOpen", fileOpen);
		
		EDITOR.on("fileDrop", fileDrop);
		
		CLIENT.on("ssgBuildMessage", ssgBuildMessage);
		
		// if document.location.href.indexOf("ssg") ... open that site and page in edit mode
		
		if(EDITOR.user == "demo") {
			// Open demo site if no file is open
			var timer = 1000; // Milliseconds
			setTimeout(function () {
				
				var openFiles = Object.keys(EDITOR.files).length;
				
				if(openFiles === 0) {
					
					var filePath = path.join(require("dirname") + "/userdirs/demo/static_site_demo/source/about.htm");
					
					EDITOR.openFile(filePath);
					
				}
			}, timer);
		}
		
	}
	
	function SSG_cleanup() {
		closePreview();
		return true;
	}
	
	function unload() {
		// Cleaning up, for example when disabling a plugin
		
		//alertBox("UNloading");
		
		EDITOR.removeEvent("storageReady", getSites);
		
		EDITOR.removeMenuItem(menuItem);
		
		SSG_cleanup(); // closePreview();
		
		EDITOR.removeEvent("fileShow", fileShow);
		EDITOR.removeEvent("exit", SSG_cleanup);
		EDITOR.removeEvent("fileOpen", fileOpen);
		EDITOR.removeEvent("fileDrop", fileDrop);
		
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
				if(filePath.indexOf(sites[i].source) != -1) {
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
				if(filePath.indexOf(sites[i].source) != -1) {
					showSSG();
					switchSite(i)
					break;
				}
			}
		}
		
	}
	
	
	function fileDrop(dataFile) {
		// When a file is dropped into the editor
		
		var file = EDITOR.currentFile;
		
		// Check if the current file belongs to a SSG project:
		for(var i=0; i<sites.length; i++) {
			if(EDITOR.currentFile.path.indexOf(sites[i].source) != -1) {
				handleFile(sites[i], dataFile);
				return true;
			}
		}
		
		return false; // Returing true means we handled the filedrop
		
		function handleFile(site, dataFile) {
			
			var filePath = dataFile.path || dataFile.name;
			var fileType = dataFile.type;
			var isImage = (fileType.indexOf("image") != -1);
			
			var defaultPath;
			if(filePath.match(/\/\\/)) defaultPath = filePath;
			//else if(isImage) defaultPath = site.source + "gfx/" + filePath;
			else defaultPath = site.source + filePath;
			
			var msg;
			if(isImage) var msg = "Where to save the image ?"
			else msg = "Where to save the file ?";
			
			promptBox(msg, false, defaultPath, function(filePath) {
				if(filePath) {
					saveFile(filePath, function fileSaved(err, path) {
						if(err) return alertBox(err.message);
						
						var currentFileName = UTIL.getFilenameFromPath(file.path);
						
						
						
						if(currentFileName.match(/^(header|footer).html?/)) {
							var fileSrc = path.replace(site.source, "/"); // File paths needs to be absolute!
						}
						else {
							var fileSrc = path.replace(site.source, ""); // File paths needs to be relative!
						}
						
						if(isImage) {
							// todo: Some sort of crop and resize tool
							file.insertText('<img src="' + fileSrc + '">');
						}
						else {
							var fileName = UTIL.getFilenameFromPath(filePath);
							file.insertText('<a href="' + fileSrc + '">' + fileName + '</a>');
						}
						
					});
				}
			});
			
			function saveFile(filePath, callback) {
				var reader = new FileReader();
				reader.onload = function (event) {
					var data = event.target.result;
					
					// Specifying encoding:base64 will magically convert to binary!
					// We do have to remove the data:image/png metadata though!
					data = data.replace("data:" + fileType + ";base64,", "");
					EDITOR.saveToDisk(filePath, data, callback, false, "base64");
				};
				reader.readAsDataURL(dataFile); // For binary files (will be base64 encoded)
				
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
		
		selectSite = document.createElement("select");
		selectSite.setAttribute("id", "selectSite");
		selectSite.setAttribute("class", "select");
		selectSite.addEventListener("change", changeSelectSite, false);
		
		if(sites.length > 0) {
			sites.forEach(addSiteOption);
		}
		
		var labelSite = document.createElement("label");
		labelSite.setAttribute("for", "selectSite");
		labelSite.setAttribute("title", "Select site");
		labelSite.appendChild(document.createTextNode("Static Site Generator:")); // Language settings!?
		labelSite.appendChild(selectSite);
		
		/*
			var buttonSetWorkingDirectory = document.createElement("input");
			buttonSetWorkingDirectory.setAttribute("type", "button");
			buttonSetWorkingDirectory.setAttribute("class", "button");
			buttonSetWorkingDirectory.setAttribute("value", "Set working directory");
			buttonSetWorkingDirectory.setAttribute("title", "Sets the editors working directory to the source directory of the selected site.");
			buttonSetWorkingDirectory.addEventListener("click", function() {
			if(!selectedSite) throw new Error("No site selected!");
			EDITOR.changeWorkingDir(selectedSite.source);
			hideSSG();
			}, false);
		*/
		
		var buttonOpenEdit = document.createElement("input");
		buttonOpenEdit.setAttribute("type", "button");
		buttonOpenEdit.setAttribute("class", "button");
		buttonOpenEdit.setAttribute("value", "Open/edit file/page");
		buttonOpenEdit.setAttribute("title", "Select a file from the source code folder");
		buttonOpenEdit.addEventListener("click", function() {
			if(!selectedSite) throw new Error("No site selected!");
			
			EDITOR.changeWorkingDir(selectedSite.source);
			
			EDITOR.openFileTool(selectedSite.source);
			
			hideSSG();
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
		controlView.appendChild(buttonNewPage);
		controlView.appendChild(buttonPreview);
		controlView.appendChild(buttonWysiwyg);
		controlView.appendChild(buttonSync);
		controlView.appendChild(buttonPublish);
		controlView.appendChild(buttonSettings);
		controlView.appendChild(buttonCancel);
		
		
		if(sites.length > 0) changeSelectSite(); // Select the one currently selected
		
		function changeSelectSite() {
			
			//alertBox("Fired changeSelectSite");
			
			var selectedSiteIndex = selectSite.options[selectSite.selectedIndex].id;
			selectedSite = sites[selectedSiteIndex];
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
		
	}
	
	
	function editSiteSettings() {
		
		if(!selectedSite) throw new Error("No selected site");
		
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
			
		}
		
		function browseKey() {
			EDITOR.localFileDialog(undefined, function selectKey(path) {
				inputPubAuthKey.value = path;
			});
		}
		
		function cancelEdit() {
			
			if(!selectedSite) throw new Error("No site selected!");
			
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
			
			
			editView.style.display = "none"; // Hide the edit view
			controlView.style.display = "block"; // Show the connection view
			EDITOR.resizeNeeded();
			
		}
		
		function saveSiteSettings() {
			
			if(!EDITOR.storage.ready()) throw new Error("EDITOR.storage not ready!");
			if(!selectedSite) throw new Error("No site selected!");
			
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
			
		}
		
		
		function deleteSite() {
			if(!EDITOR.storage.ready()) throw new Error("EDITOR.storage not ready!");
			
			selectSite.remove(selectSite.selectedIndex);
			EDITOR.storage.setItem("cmsjz_selectedSiteName", "");
			// Does it fire onChange events? 
			
			
			
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
	
	function previewSSG(file, combo, character, charCode, keyPushDirection, targetElementClass) {
		if(!selectedSite) alertBox("No site selected!");
		else previewPage(selectedSite, undefined, false, file, combo.ctrl);
		
		return false;
	}
	
	function previewPage(site, callback, edit, sourceFile, ignoreDraft) {
		
		console.log('Previewing site.name="' + site.name + '". edit=' + edit);
		
		/*
			We must create the window here, so that it get asociated with the button click
			Some browsers will not let us change the window position, so we need to specify it here also.
			To prevent same origin policy error, the editor must be served via http or https! (not file://)
		*/
		var newWindow = EDITOR.createWindow();
		
		
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
			
			if(sourceFile.path.indexOf(site.source) !== 0) {
				//throw new Error('Source file does not belong to "' + site.name + '"!\nsourceFile.path=' + sourceFile.path + '\nsite.source=' + site.source);
				alertBox('' + sourceFile.path + ' does not belong to "' + site.name + '". Open a file from ' + site.source + ' and try again.');
			}
			else compileIt(sourceFile);
		}
		
		return false;
		
		function compileIt(sourceFile) {
			
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
				newWindow.close();
				console.log("matchAbsSrc=" + JSON.stringify(matchAbsSrc));
				alertBox("Make any src or href attributes relative! (remove the slash from " + matchAbsSrc[0] + ")\n\nsrc and href in headers and footers needs to be absolute, but in the page/content they need to be relative.");
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
			else {
				
				console.log("ignoreDraft=" + ignoreDraft); // publish flag that ignores files starting with _ (underscore)
				compile(site.source, site.preview, ignoreDraft, function compiled_static() {
					
					var protocol = UTIL.urlProtocol(site.preview);
					
					if(protocol != "file") {
						alertBox("Preview uploaded to: " + site.preview);
						return;
					}
					
					CLIENT.cmd("serve", {folder: site.preview}, function httpServerStarted(err, json) {
						
						if(err) throw err;
						
						var url = json.url;
						
						if(location) {
							if(location.protocol) url = location.protocol + "//" + url;
						}
						else url = "http://" + url;
						
						console.log("serve url=" + url);
						
						if(runtime != "nw.js") {
							// Replace the hostname with the hostname we are currently on to prevent cross origin errors
							var host = UTIL.getLocation(url).host;
							
							if(!host) throw new Error('Did not expect "falsy" host=' + host);
							if(!window.location.host) throw new Error('Did not expect "falsy" window.location.host=' + window.location.host);
							
							url = url.replace(host, window.location.host);
							
							console.log("host=" + host + " window.location.host=" + window.location.host + " url=" + url);
						}
						
						previewBaseUrl = url;
						
						if(sourceFile) {
							url += sourceFile.path.replace(site.source, "").replace(/\\/g, "/"); // url needs to have / instead of \ for path delimiter
							
							openPreviewWin();
							
						}
						else {
							// Open the index page
							
							notEditableReason = "No file open";
							editable = false;
							
							EDITOR.listFiles(site.preview, function(err, list) {
								
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
							
							var previewPath = sourceFile.path.replace(site.source, site.preview);
							
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
								var whenLoaded = function previewLoaded() {
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
								
								
								console.log("SSG url=" + url);
								previewWin = new WysiwygEditor(sourceFile, bodyTag, onlyPreview, newWindow, url, whenLoaded, compiledSource, compliedSourceBodyTag);
								
								previewWin.onClose = function() {
									if(buttonPreview) {
										buttonPreview.setAttribute("class", "button");
										buttonWysiwyg.setAttribute("class", "button");
										wysiwygEnabled = false;
									}
								}
							}
						}
					});
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
		
		
		EDITOR.folderExistIn(site.projectFolder, ".hg", function(exist) {
			if(exist) {
				// Check if remote is the same as repository
				var hgrcFile = exist + "hgrc";
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
			else if(site.repository != undefined && site.repository != "undefined") {
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
		});
		
		
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
			var rootPath = selectedSite.source;
			
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
						
						var changes = resp.changes;
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
								for(var path in filesOpenedInEditorThatChanged) reloadFile(filesOpenedInEditorThatChanged[path]);
								
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
				CLIENT.cmd("mercurial.push", {directory: UTIL.trailingSlash(selectedSite.projectFolder)}, function pushed(err, resp) {
					
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
			compile(site.source, site.publish, true, function buildDone() {
				
				alertBox('<b>' + site.name + '</b> published to:<br>' + site.publish + (site.url ? '<br>URL:' + urlElementString(site.url) : ''));
				
				function urlElementString(url) {
					
					if(!url.match(/^http(s?):\/\//i)) url = "http://" + url;
					
					return '<a href="' + url + '" target="blank">' + url + '</a>';
					
				}
				
			});
		}
		
	}
	
	function newPage(site) {
		
		EDITOR.changeWorkingDir(site.source);
		
		EDITOR.readFromDisk(site.template, function fileRead(err, path, text) {
			
			if(err) alertBox(err.message);
			else {
				EDITOR.openFile("newPage.htm", text);
			}
			
		});
		
		return false;
	}
	
	
	function compile(source, destination, publish, callback) {
		
		CLIENT.cmd("SSG.compile", {source: source, destination: destination, publish: publish}, function(err, json) {
			
			if(err) throw err;
			else callback(json.ssgWorkerExitCode);
			
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
		
		if(!wysiwygEnabled && previewWin) return previewWin.disableEdit(function() {
			
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
				var sourceFilePath = url.replace(previewBaseUrl, site.source);
			}
			catch(err) {
				console.error(err);
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
			EDITOR.listFiles(site.source, function sourceFileList(err, list) {
				
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
	
	function like(site, fileListItem) {
		
		console.log("Like ? " + JSON.stringify(fileListItem) + " site.source=" + site.source);
		
		if(!fileListItem) return false;
		
		return (fileListItem.path.indexOf(site.source) == 0 // A source file
		&& fileListItem.name.match(/html?$/i) // We only like HTML code! :P
		&& !fileListItem.name.match(/(header|footer|index).html?/i) // Don't chose header footer or index.html
		);
		
	}
	
	
})();
