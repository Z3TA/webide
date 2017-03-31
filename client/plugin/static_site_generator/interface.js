(function() {
	"use strict";
	
	if(runtime == "browser") {
		console.warn("Static site generator not supported in the browser!");
		return;
	}
	
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
	
	var demoSite;

	if(EDITOR.user == "admin" && runtime == "nw.js") {
		var path = require("path");
		
		demoSite = {
			name: "Demo site",
			projectFolder: path.join(require("dirname"), "/userdirs/demo/static_site_demo/"),  // Project folder
			source: path.join(require("dirname"), "/userdirs/demo/static_site_demo/source/"),  // Source files (when colaborating; use a source control management tool!)
			preview: path.join(require("dirname"), "/userdirs/demo/static_site_demo/preview/"), // Compiles files for review is saved here
			publish: path.join(require("dirname"), "/userdirs/demo/static_site_demo/public/"),  // Compiled files for live deployment is sent to this folder, can be ftp, ftps, sftp url
			template: path.join(require("dirname"), "/userdirs/demo/static_site_demo/template.htm"),  // A template for new pages/posts
			url: "file://" + path.join(require("dirname"), "/userdirs/demo/static_site_demo/public/"),
			pubUser: "",
			pubPw: "",
			key: "", // Publish key
			repository: "",
			repoUser: "",
			repoPw: ""
		}
	}
	else if(EDITOR.user == "demo") {
		// Virtual folder
		demoSite.projectFolder = "/static_site_demo/";
		demoSite.source = "/static_site_demo/source/";
		demoSite.preview = "/static_site_demo/preview/";
		demoSite.publish = "/static_site_demo/public/";
		demoSite.template = "/static_site_demo/template.htm";
		demoSite.projectFolder = "/static_site_demo/";
	}

	
	// Add plugin to editor
	EDITOR.plugin({
		desc: "Static site generator management interface",
		load: load,
		unload: unload,
	});
	
	function getSites() {
		
		var storageSites = EDITOR.storage.getItem("cmsjz_sites");
		
		if(storageSites) {
			sites = JSON.parse(storageSites);
		}
		else if(demoSite) {
			sites = [demoSite];
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
		
		EDITOR.removeMenuItem(menuItem);
		
		SSG_cleanup(); // closePreview();
		
		EDITOR.removeEvent("fileShow", fileShow);
		EDITOR.removeEvent("exit", SSG_cleanup);
		EDITOR.removeEvent("fileOpen", fileOpen);
		
		EDITOR.unbindKey(hideSSG);
		EDITOR.unbindKey(previewSSG);
		EDITOR.unbindKey(publishSSG);
		EDITOR.unbindKey(showSSG);
		EDITOR.unbindKey(wysiwygSSG);
		
		if(manager) {
			var footer = document.getElementById("footer");
			footer.removeChild(manager);
			EDITOR.resizeNeeded();
		}
		
	}
	
	function processPost(request, response, callback) {
		var queryData = "";
		if(typeof callback !== 'function') return null;
		
		if(request.method == 'POST') {
			request.on('data', function(data) {
				queryData += data;
				if(queryData.length > 1e6) {
					queryData = "";
					response.writeHead(413, {'Content-Type': 'text/plain'}).end();
					request.connection.destroy();
				}
			});
			
			request.on('end', function() {
				request.post = querystring.parse(queryData);
				callback();
			});
			
		}
		else {
			response.writeHead(405, {'Content-Type': 'text/plain'});
			response.end();
		}
	}
	
	
	function fileShow(file) {
		
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
	
	function fileOpen(file) {
		
		var filePath = file.path;
		
		// Check all sites to see if the file belongs to any source
		
		for(var i=0; i<sites.length; i++) {
			if(filePath.indexOf(sites[i].source) != -1) {
				showSSG();
				switchSite(i)
				break;
			}
		}
		
	}
	
	
	function switchSite(index) {
		// Switch to the site
		
		var site = sites[index];
		
		if(site) {
			//alertBox("Switching to site=" + site.name);
			
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
		labelSite.appendChild(document.createTextNode("Site:")); // Language settings!?
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
			
			EDITOR.fileOpenDialog(selectedSite.source, function fileSelected(filePath, content) {
				
				EDITOR.openFile(filePath, content, function after_open_file(err, file) {  // path, content, callback
					
					if(err) throw err;
					
					// Mark the file as saved, because we just opened it
					file.isSaved = true;
					file.savedAs = true;
					file.changed = false;
					
					EDITOR.renderNeeded();
					
				});
			});
			
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
		buttonPreview.addEventListener("click", function() {
			previewPage(selectedSite);
		}, false);
		
		buttonWysiwyg = document.createElement("input");
		buttonWysiwyg.setAttribute("type", "button");
		buttonWysiwyg.setAttribute("class", "button");
		buttonWysiwyg.setAttribute("value", "WYSIWYG");
		buttonWysiwyg.addEventListener("click", wysiwygSSG, false);
		
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
		
		inputUrl = document.createElement("input");
		inputUrl.setAttribute("type", "text");
		inputUrl.setAttribute("id", "inputUrl");
		inputUrl.setAttribute("class", "inputtext");
		inputUrl.setAttribute("size", "50");
		inputUrl.setAttribute("title", "Public URL where the published site can be accessed");
		
		
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
				projectFolder: projectFolder.value,
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
			
			EDITOR.storage.setItem("cmsjz_sites", JSON.stringify(sites)); // Save all sites in local-storage
			
			editView.style.display = "none"; // Hide the edit view
			controlView.style.display = "block"; // Show the connection view
			EDITOR.resizeNeeded();
			
		}
		
		function browseKey() {
			EDITOR.fileOpenDialog(undefined, function selectKey(path) {
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
			
			EDITOR.storage.setItem("cmsjz_sites", JSON.stringify(sites));
			
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
		else previewPage(selectedSite);
		
		return false;
	}
	
	function previewPage(site, callback) {
		
		console.log("Previewing " + site.name);
		
		var errorOccured = false;
		
		// Witch file should we preview ?

		// Is any of the source files opened ?
		var openedFilesArray = [];
		
		for(var file in EDITOR.files) openedFilesArray.push(EDITOR.files[file]);
		
		var sourceFilePath = filterFiles(openedFilesArray);
		
		if(sourceFilePath) {
			if(!EDITOR.files.hasOwnProperty(sourceFile)) throw new Error("Does not exist in EDITOR.files: " + sourceFile);
			compileIt(EDITOR.files[sourceFile]);
		}
		else {
			// Open any of the source files
			EDITOR.listFiles(site.source, function sourceFileList(err, list) {
				var sourceFilePath = filterFiles(list);
				
				if(sourceFilePath) EDITOR.openFile(sourceFilePath, undefined, function(err, file) {
					if(err) throw err;
					compileIt(file);
				});
				else {
					alertBox("Unable to pick a source file!");
					compileIt(undefined);
				}

			});
		}
		
		
		function compileIt(sourceFile) {
			
			compile(site.source, site.preview, false, function compiled_static() {
				
				var protocol = UTIL.urlProtocol(site.preview);
				
				if(protocol != "file") {
					alertBox("Preview uploaded to: " + site.preview);
					return;
				}
				
				CLIENT.cmd("serve", {folder: site.preview}, function httpServerStarted(err, json) {
					
					if(err) throw err;
					
					var url = json.url;
					
					previewBaseUrl = url;
					
					if(sourceFile) {
						url += sourceFile.path.replace(site.source, "").replace(/\\/g, "/"); // url needs to have / instead of \ for path delimiter
						
						openPreviewWin(url, callback)

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
							
							openPreviewWin(url, callback);
							
						});
					}
				});
			});
		}
		
		return false;
		
		function filterFiles(fileList) {
			
			if(Object.prototype.toString.call( fileList ) !== '[object Array]') throw new Error("fileList must be an array!");
			
			for(var i=0; i<fileList.length; i++) {
				
				if(!fileList[i].path) throw new Error("filePathList[" + i + "] Does not have a path property: " + JSON.stringify(filePathList[i]));
				if(!fileList[i].name) throw new Error("filePathList[" + i + "] Does not have a name property: " + JSON.stringify(filePathList[i]));
				
				if(fileList[i].path.indexOf(site.source) == 0 // A source file
				&& fileList[i].name.match(/html?$/i) // We only like HTML code! :P
				&& !fileList[i].name.match(/(header|footer|index).html?/i) // Don't chose header footer or index.html
				) return fileList[i].path;
			}
			
			return null;
		}
		
	}
	
	function openPreviewWin(url, callback) {
		
		if(previewWin) previewWin.close();

		var sourceFile = EDITOR.currentFile;
		var bodyTag = "main";
		var onlyPreview = true;
		var whenOpened = callback;

		previewWin = new WysiwygEditor(sourceFile, url, bodyTag, onlyPreview, whenOpened);

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
	
	function syncRepository(site) {
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
							doHgPull();
						});
					}
					else {
						var pathPartEnd = hgrcContent.indexOf("[", pathPartStart + 1);
						var pathPart;
						
						if(pathPartEnd != -1) pathPart = hgrcContent.substring(pathPartStart + 7, pathPartEnd);
						else pathPart = hgrcContent.substring(pathPartStart + 7);
						
						// Check if our repo is the default repo
						var regex = new RegExp("default\s?=\s?(.*)$");
						var repos = pathPart.match(regex);
						
						if(repos == null) {
							// No default repo exist, add our repo as default
							hgrcContent = hgrcContent.substring(0, pathPartStart + 7) + "default = " + site.repository + "\n" + hgrcContent.substring(pathPartStart + 8);
							EDITOR.saveToDisk(hgrcFile, hgrcContent, function(err, hgrcFile) {
								if(err) throw err; // Unexpected
								doHgPull();
							});
						}
						else {
							var defaultRepo = repos[1];
							
							if(defaultRepo.trim() != site.repository.trim()) {
								
								var changeDefault = "Change default";
								var updateSettings = "Update settings";
								var cancelSync = "Cancel Sync";
								
								confirmBox("The repository do not match with the default repository!<br>repository: " + site.repository + "<br>default: " + defaultRepo, [], function(answer) {
									
									if(answer == changeDefault) {
										var fullString = repos[0];
										hgrcContent = hgrcContent.replace(fullString, "default = " + site.repository);
										EDITOR.saveToDisk(hgrcFile, hgrcContent, function(err, hgrcFile) {
											if(err) throw err; // Unexpected
											doHgPull();
										});
									}
									else if(answer == updateSettings) {
										site.repository = defaultRepo.trim();
										EDITOR.storage.setItem("cmsjz_sites", JSON.stringify(sites));
										doHgPull();
									}
									//else if(answer == cancelSync) do nothing
								});
							}
							else {
								// All good, our repo is the default repo!
								doHgPull();
							}
						}
					}
				});
			}
			else if(site.repository != undefined && site.repository != "undefined") {
				// .hg folder don't exist. Ask if user wants to init (using clone)
				
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
			
		}
		
		function doHgPull() {
			
		}
		
	}
	
	
	function publishSite(site) {
		compile(site.source, site.publish, true, function buildDone() {
			
			if(site.url) {
				var open_browser = "Open in browser";
				confirmBox("<b>" + site.name + "</b> published to:<br><span class=\'nobreak\'>" + site.publish + "</span><br>URL:<i>" + site.url + "</i>", [open_browser, "OK"], function(answer) {
					if(answer == open_browser) {
						var open = require(require("dirname") + "/client/plugin/static_site_generator/node_modules/open");
						open(site.url, function(err) {
							if(err) throw err;
							console.log("Browser closed");
						});
					}
				});
			}
			else alertBox(site.name + " published to " + site.publish);
			
		});
		return false;
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


		var sourceFile;
	
		// Open the file in the editor if it's not already open
		if(EDITOR.files.hasOwnProperty(sourceFilePath)) {
			sourceFile = EDITOR.files[sourceFilePath];
			EDITOR.showFile(sourceFile); // Make sure it's the current one open
			
			makeItEditable(null, sourceFile);
		}
		else {
			EDITOR.openFile(sourceFilePath, undefined, makeItEditable);
		}
	
		
		function makeItEditable(err, sourceFile) {
			
			if(err) throw err;
				
			// Get the source code for the compiled page in review, in order to compute ignoreTransform
			
			var url = previewWin.window.location.href;
			var previewPath = localFilePath(url, site);
			
			EDITOR.readFromDisk(previewPath, function gotPreviewSource(err, path, txt) {
				
				if(err) throw err;
				
				
				if(previewWin) previewWin.close();

				
				var bodyTag = "main";
				var onlyPreview = true;
				var whenOpened = null;
				var compiledSource = txt;
				var compliedSourceBodyTag = "main";

				previewWin = WysiwygEditor(sourceFile, url, bodyTag, onlyPreview, whenOpened, compiledSource, compliedSourceBodyTag);

				
				// Change buttonWysiwyg state to "active"
				if(buttonWysiwyg) {
					buttonWysiwyg.setAttribute("class", "button active");
					buttonPreview.setAttribute("class", "button active");
				}
				
				
			});
			
		}

		
		function localFilePath(path, site) {
			
			return path.replace(previewBaseUrl, site.preview);
			

		}
		
		
		
		
	}
	
	
	
	
	
	
})();
