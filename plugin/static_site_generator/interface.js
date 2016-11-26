(function() {
	"use strict";
	
	var sites; // Array of sites
	var manager;
	var selectSite;
	var selectedSite;
	var editView;
	var controlView;
	
	var inputSiteName;
	var inputSourceFolder;
	var inputPreviewFolder;
	var inputPublishFolder;
	var inputTemplate;
	var inputAuthUser;
	var inputAuthPw;
	var inputAuthKey;
	var buttonWysiwyg;
	
	var gui = require('nw.gui'); // Load native UI library
	
	var previewWin;
	var wysiwygEnabled = false; 
	var notEditableReason = "";
	var editable = false;
	var sourceFile; // Source file that is being previewed
	var headerRows = 0;
	var footerRows = 0;
	var ignoreTransform;
	var scrollTop = 0;
	var menuItem;
	var ignoreFileChange = false; // Whether to update the preview/WYSIWYG when there is a change in the HTML source code (editor)
	var updatePreviewOnChange;
	
	if(runtime == "browser") {
		console.warn("Static site generation not yet supported in the browser!");
		return;
	}
	
	
	var path = require("path");
	var demoSite = {
		name: "Demo site",
		source: path.join(require("dirname"), "/plugin/static_site_generator/demo/source/"),  // Source files (when colaborating; use a source control management tool!)
		preview: path.join(require("dirname"), "/plugin/static_site_generator/demo/preview/"), // Compiles files for review is saved here
		publish: path.join(require("dirname"), "/plugin/static_site_generator/demo/public/"),  // Compiled files for live deployment is sent to this folder
		template: path.join(require("dirname"), "/plugin/static_site_generator/demo/template.htm"),  // A template for new pages/posts
		user: "",
		pw: "",
		key: ""
	}
	
	// Add plugin to editor
	editor.plugin({
		desc: "Static site generator management interface",
		load: load,
		unload: unload,
	});
	
	function load() {
		// Called when the module is loaded
		
		//alertBox("loading");
		
		if(!window.localStorage) throw new Error("window.localStorage not available!");
		
		sites = window.localStorage.cmsjz_sites ? JSON.parse(window.localStorage.cmsjz_sites) : [demoSite];
		
		var keyF9 = 120;
		var keyEscape = 27;
		
		editor.bindKey({desc: "Show the manager for the static site generator", fun: showSSG, charCode: keyF9, combo: 0});
		editor.bindKey({desc: "Hide the manager for the static site generator", fun: hideSSG, charCode: keyEscape, combo: 0});
		editor.bindKey({desc: "Compiles a preveiw for current site in the static site generator", fun: previewSSG, charCode: keyF9, combo: CTRL});
		editor.bindKey({desc: "WYSIWYG editor for current site in the static site generator", fun: wysiwygSSG, charCode: keyF9, combo: CTRL + SHIFT});
		editor.bindKey({desc: "Publish/live deployment of the static-site-generator site", fun: publishSSG, charCode: keyF9, combo: CTRL + ALT + SHIFT});
		
		
		//build();
		
		menuItem = editor.addMenuItem("Static site generator", function() {
			showSSG();
			editor.hideMenu();
		});
		
		editor.on("fileShow", fileShow);
		
		editor.on("exit", SSG_cleanup);
		
		editor.on("fileChange", fileChange);
		
	}
	
	function SSG_cleanup() {
		closePreview();
		return true;
	}
	
	function unload() {
		// Cleaning up, for example when disabling a plugin
		
		//alertBox("UNloading");
		
		SSG_cleanup(); // closePreview();
		
		editor.removeEvent("fileShow", fileShow);
		editor.removeEvent("exit", SSG_cleanup);
		editor.removeEvent("fileChange", fileChange);
		
		editor.removeMenuItem(menuItem);
		
		editor.unbindKey(hideSSG);
		editor.unbindKey(previewSSG);
		editor.unbindKey(publishSSG);
		editor.unbindKey(showSSG);
		editor.unbindKey(wysiwygSSG);
		
		if(manager) {
		var footer = document.getElementById("footer");
		footer.removeChild(manager);
			editor.resizeNeeded();
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
	
	function fileChange(file, type, characters, caretIndex, row, col) {
		if(file == sourceFile && previewWin && !ignoreFileChange) {
			
			console.log("Updating HTML preview ...");
			
			//if(updatePreviewOnChange) clearTimeout(updatePreviewOnChange);
			
			// Delay updating so that we do not render broken tags etc and save some battery
			//updatePreviewOnChange = setTimeout(function() {
			
			var main = previewWin.window.document.getElementsByTagName("main")[0];
			
			//var prewHTML = main.innerHTML;
			var srcHTML = getSourceCodeBody(sourceFile);
			
			main.innerHTML = srcHTML;
				
				//ignoreTransform = textDiff(srcHTML, main.innerHTML);
			
			//}, 3000);
			
		}
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
			editor.workingDirectory = selectedSite.source;
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
			
			editor.workingDirectory = selectedSite.source;
			
			editor.fileOpenDialog(selectedSite.source, function fileSelected(filePath, content) {
				
				editor.openFile(filePath, content, function after_open_file(err, file) {  // path, content, callback
					
					if(err) throw err;
					
					// Mark the file as saved, because we just opened it
					file.isSaved = true;
					file.savedAs = true;
					file.changed = false;
					
					editor.renderNeeded();
					
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
		
		var buttonPreview = document.createElement("input");
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
		controlView.appendChild(buttonPublish);
		controlView.appendChild(buttonSettings);
		controlView.appendChild(buttonCancel);
		
		
		if(sites.length > 0) changeSelectSite(); // Select the one currently selected
		
		function editSiteSettings() {
			
			if(!selectedSite) throw new Error("No selected site");
			
			editView.style.display="block";
			controlView.style.display="none"; // Hide this div
			
			editor.resizeNeeded();
		}
		
		function changeSelectSite() {
			var selectedSiteIndex = selectSite.options[selectSite.selectedIndex].id;
			selectedSite = sites[selectedSiteIndex];
			
			inputSiteName.value = selectedSite.name;
			inputSourceFolder.value = selectedSite.source;
			inputPreviewFolder.value = selectedSite.preview;
			inputPublishFolder.value = selectedSite.publish;
			inputTemplate.value = selectedSite.template;
			inputAuthUser.value = selectedSite.user;
			inputAuthPw.value = selectedSite.pw;
			inputAuthKey.value = selectedSite.key;
		}
		
	}
	
	function buildEdit() {
		
		var td, tr;
		
		editView = document.createElement("table");
		
		// Labels
		
		var labelName = document.createElement("label");
		labelName.setAttribute("for", "inputSiteName");
		labelName.appendChild(document.createTextNode("Alias:")); // Language settings!?
		
		var labelSource = document.createElement("label");
		labelSource.setAttribute("for", "inputSourceFolder");
		labelSource.appendChild(document.createTextNode("Source files:")); // Language settings!?
		
		var labelPreview = document.createElement("label");
		labelPreview.setAttribute("for", "inputPreviewFolder");
		labelPreview.appendChild(document.createTextNode("Preview directory:")); // Language settings!?
		
		var labelPublish = document.createElement("label");
		labelPublish.setAttribute("for", "inputPublishFolder");
		labelPublish.appendChild(document.createTextNode("Publish URL:")); // Language settings!?
		
		var labelTemplate = document.createElement("label");
		labelTemplate.setAttribute("for", "inputTemplate");
		labelTemplate.appendChild(document.createTextNode("Template file:")); // Language settings!?
		
		var labelAuthUser = document.createElement("label");
		labelAuthUser.setAttribute("for", "inputAuthUser");
		labelAuthUser.appendChild(document.createTextNode("Username:")); // Language settings!?
		
		var labelAuthPw = document.createElement("label");
		labelAuthPw.setAttribute("for", "inputAuthPw");
		labelAuthPw.appendChild(document.createTextNode("Password:")); // Language settings!?
		
		var labelAuthKey = document.createElement("label");
		labelAuthKey.setAttribute("for", "inputAuthKey");
		labelAuthKey.appendChild(document.createTextNode("Key:")); // Language settings!?
		
		// Inputs
		
		inputSiteName = document.createElement("input");
		inputSiteName.setAttribute("type", "text");
		inputSiteName.setAttribute("id", "inputSiteName");
		inputSiteName.setAttribute("class", "inputtext");
		inputSiteName.setAttribute("size", "30");
		
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
		
		inputPublishFolder = document.createElement("input");
		inputPublishFolder.setAttribute("type", "text");
		inputPublishFolder.setAttribute("id", "inputPublishFolder");
		inputPublishFolder.setAttribute("class", "inputtext path");
		inputPublishFolder.setAttribute("size", "69");
		inputPublishFolder.setAttribute("title", "A file system path or an URL to FTP/FTPS/FTPS");
		
		inputTemplate = document.createElement("input");
		inputTemplate.setAttribute("type", "text");
		inputTemplate.setAttribute("id", "inputTemplate");
		inputTemplate.setAttribute("class", "inputtext path");
		inputTemplate.setAttribute("size", "69");
		inputTemplate.setAttribute("title", "Template file for new page/post on this site");
		
		inputAuthUser = document.createElement("input");
		inputAuthUser.setAttribute("type", "text");
		inputAuthUser.setAttribute("id", "inputAuthUser");
		inputAuthUser.setAttribute("class", "inputtext");
		inputAuthUser.setAttribute("size", "20");
		inputAuthUser.setAttribute("title", "Username if needed for the publish URL");
		
		inputAuthPw = document.createElement("input");
		inputAuthPw.setAttribute("type", "password");
		inputAuthPw.setAttribute("id", "inputAuthPw");
		inputAuthPw.setAttribute("class", "inputtext");
		inputAuthPw.setAttribute("size", "20");
		inputAuthPw.setAttribute("title", "Password if needed for the publish URL")
		
		inputAuthKey = document.createElement("input");
		inputAuthKey.setAttribute("type", "text");
		inputAuthKey.setAttribute("id", "inputAuthKey");
		inputAuthKey.setAttribute("class", "inputtext");
		inputAuthKey.setAttribute("size", "40");
		inputAuthKey.setAttribute("title", "SSH Key")
		
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
		
		
		// Auth username
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelAuthUser);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputAuthUser);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		// Auth password
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelAuthPw);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputAuthPw);
		tr.appendChild(td);
		
		editView.appendChild(tr);
		
		// Auth key
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelAuthKey);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.appendChild(inputAuthKey);
		td.appendChild(buttonBrowseKey);
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
			
			if(!window.localStorage) throw new Error("window.localStorage not available!");
			
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
				source: inputSourceFolder.value,
				preview: inputPreviewFolder.value,
				publish: inputPublishFolder.value,
				template:  inputTemplate.value
			}) - 1;
			
			selectedSite = sites[index];
			
			var selectedIndex = addSiteOption(selectedSite, index); // Add new option
			
			selectSite.selectedIndex = selectedIndex;// Select the new option
			
			window.localStorage.cmsjz_sites = JSON.stringify(sites); // Save all sites in local-storage
			
			editView.style.display = "none"; // Hide the edit view
			controlView.style.display = "block"; // Show the connection view
			editor.resizeNeeded();
			
		}
		
		function browseKey() {
			editor.fileOpenDialog(undefined, function selectKey(path) {
				inputAuthKey.value = path;
			});
		}
		
		function cancelEdit() {
			
			if(!selectedSite) throw new Error("No site selected!");
			
			// Reset the values
			inputSiteName.value = selectedSite.name;
			inputSourceFolder.value = selectedSite.source;
			inputPreviewFolder.value = selectedSite.preview;
			inputPublishFolder.value = selectedSite.publish;
			inputTemplate.value = selectedSite.template;
			inputAuthUser.value = selectedSite.user;
			inputAuthPw.value = selectedSite.pw;
			inputAuthKey.value = selectedSite.key;
			
			
			editView.style.display = "none"; // Hide the edit view
			controlView.style.display = "block"; // Show the connection view
			editor.resizeNeeded();
			
		}
		
		function saveSiteSettings() {
			
			if(!window.localStorage) throw new Error("window.localStorage not available!");
			if(!selectedSite) throw new Error("No site selected!");
			
			if(selectedSite.name != inputSiteName.value) {
				selectSite.options[selectSite.selectedIndex].text = inputSiteName.value;
			}
			
			selectedSite.name = inputSiteName.value;
			selectedSite.source = inputSourceFolder.value;
			selectedSite.preview = inputPreviewFolder.value;
			selectedSite.publish = inputPublishFolder.value;
			selectedSite.template = inputTemplate.value;
			selectedSite.user = inputAuthUser.value;
			selectedSite.pw = inputAuthPw.value;
			selectedSite.key = inputAuthKey.value;
			
			window.localStorage.cmsjz_sites = JSON.stringify(sites);
			
			editView.style.display = "none";
			controlView.style.display = "block";
			editor.resizeNeeded();
			
		}
		
		
		function deleteSite() {
			if(!window.localStorage) throw new Error("window.localStorage not available!");
			
			selectSite.remove(selectSite.selectedIndex);
			
			// Does it fire onChange events? 
			
			
			
		}
		
	}
	
	function addSiteOption(site, index) {
		
		if(!selectSite) throw new Error("selectSite not yet created!");
		
		var option = document.createElement("option");
		option.text = site.name;
		option.id = index;
		selectSite.appendChild(option);
		
		return selectSite.options.length -1;
	}
	
	function showSSG() {
		editor.input = false; // Steal focus from the file
		
		if(!manager) build(); // Build the GUI if it's not already built
		
		manager.style.display = "block";
		
		editor.resizeNeeded();
		
		return false;
	}
	
	function hideSSG() {
		if(editor.currentFile) editor.input = true; // Bring back focus to the current file
		
		// Only need to hide if the object is created!
		if(manager) {
			manager.style.display = "none";
			editor.resizeNeeded();
		}
		if(previewWin) closePreview() ;
		
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
		
		compile(site.source, site.preview, false, function compiled_static() {
			
			var path = require('path');
			
			var previewWinOpened = false;
			
			if(editor.currentFile) {
				var fileName = editor.currentFile.name;
				var fileType = editor.currentFile.fileExtension;
				
				if(editor.currentFile.path.indexOf(site.source) != -1 // Inside source path?
				&& (fileType == "htm" || fileType=="html") // We only like HTML code! :P
				&& fileName != "header" && fileName != "footer") { 
					
					// Preview the current file opened in the editor !
					
					// url needs to have / instead of \ for path delimiter
					var url = "file://" + editor.currentFile.path.replace(site.source, site.preview).replace(/\\/g, "/");
					
					openPreviewWin(url, callback)
					
					previewWinOpened = true;
					
				}
				else {
					console.log("Not showing preview window because:\neditor.currentFile.path=" + editor.currentFile.path + "\nfileType=" + fileType + "fileName=" + fileName);
				}
			}
			
			if(!previewWinOpened) {
				// Open the index page
				var url = "file://" + site.preview.replace(/\\/g, "/");
				
				notEditableReason = "No file open";
				editable = false;
				
				editor.listFiles(site.preview, function(err, list) {
					
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
					
					openPreviewWin(url, callback);
					
				});
			}
			
			return false;
		});
	}
	
	function openPreviewWin(url, callback) {
		
		var previewWinOpen = false;
		
		if(previewWin) {
			previewWinOpen = true;
			try {
				var foo = previewWin.window.location;
			}
			catch(e) {
				previewWinOpen = false;
			}
		}
		
		if(!previewWinOpen) {
			//closePreview(); // Just in case
			
			previewWin = gui.Window.open(url, {toolbar:true}); // Show the toolbar so you can see the URL, and open dev tools
			
			previewWin.on('focus', previewWinFocus);
			previewWin.on('blur', previewWinBlur);
			previewWin.on("loaded", previewWinLoaded);
			
		}
		else {
			
			// Handle inconsitent file:// and file:/// (sometimes it has two slashes and sometimes three)
			var previewLocation = previewWin.window.location.href;
			previewLocation = previewLocation.replace("file://", "");
			while(previewLocation.substr(0,1) == "/") previewLocation = previewLocation.substr(1);
			url = url.replace("file://", "");
			while(url.substr(0,1) == "/") url = url.substr(1);
			
			//alertBox("previewLocation=" + previewLocation + "\nurl=" + url);
			
			if(previewLocation == url || previewWin.window.location == "swappedout://") {
				scrollTop = previewWin.window.scrollTop; // Get the scroll position
				console.log("scrollTop=" + scrollTop);
				if(previewLocation == url) previewWin.reload();
				else previewWin.window.location = "file://" + url;
				}
			else {
				alertBox("url=" + url + " != " + previewLocation);
				previewWin.window.location = "file://" + url;
			}
			
			previewWin.focus();
			
		}
		
		// If 404 !?
		//previewIframe.src = path.join(site.preview, "index.htm");
		
		function previewWinLoaded() {
			
			previewWin.focus();
			
			console.log("PreviewWin loaded!");
			
			previewWin.window.scrollTop = scrollTop; // Set the scroll position again
			
			if(callback) callback(previewWin);
		}
		
		
		function previewWinFocus() {
			console.log('preview window is focused');
			editor.input = false;
			ignoreFileChange = true;
		}
		
		function previewWinBlur() {
			
			ignoreFileChange = false;
			
			if(editor.currentFile) editor.input = true;
		}
		
	}
	
	
	function sanitizeOfficeDoc(html) {
		
		console.log("Before sanitizeOfficeDoc:" + html);
		
		html = html.replace(/\n|\r\n/ig, " "); // Prevent line breaks in the middle of html tag
		
		// Remove <o:p></o:p>
		html = html.replace(/<o:p>/ig, "");
		html = html.replace(/<\/o:p>/ig, "");
		
		// Remove style attributes
		html = html.replace(/ style="[^"]+"/ig, "");
		
		// Remove class attributes
		html = html.replace(/ class="[^"]+"/ig, "");
		
		// Remove onmouseover and onmouseout attributes
		
		
		// Get rid of span elements
		html = html.replace(/<span>/ig, "");
		html = html.replace(/<\/span>/ig, "");
		
		// Remove emty p elements
		html = html.replace(/<p>\s*<\/p>/gi, "");
		
		// Remove space between tags
		html = html.replace(/>\s*</gi, "><");
		
		// Remove space before tags
		html = html.replace(/\s*</gi, "<");
		
		// Remove all attributes from td elements
		html = html.replace(/<td[^>]*>/ig, "<td>");
		
		// Remove all attributes from p elements
		html = html.replace(/<p[^>]*>/ig, "<p>");
		
		// Remove p inside td
		html = html.replace(/<td><p>(.*?)<\/p><\/td>/gi, "<td>$1</td>");
		
		// Remove br inside td
		html = html.replace(/<td><br><\/td>/gi, "<td></td>");
		
		// Fix multible spaces
		html = html.replace(/\s\s+/g, " ");
		
		// Remove emty html elements
		html = html.replace(/<(.*?)><\/\1>/g, "");
		
		// Remove <del> elements
		html = html.replace(/<del[^>]*>.*?<\/del>/g, "");
		
		
		//console.log("After sanitizeOfficeDoc:" + html);
		
		return html;
	}
	
	function fixMessups(html) {
		// Fix messed up headings: <h1><span style="font-size: 3em;">Fakta om APL</span><br></h1>
		html = html.replace(/<h1><span style="font-size: 3em;">(.*)<\/span><br><\/h1>/ig, "<h1>$1</h1>");
		// Maybe this should be done before ? when detected ?
		
		return html;
		
	}
	
	function insertLineBreaks(html) {
		
		// Add line breaks so the source code gets easier to read
		
		console.time("insertLineBreaks");
		
		// Remove space between tags
		html = html.replace(/>\s*</gi, "><");
		
		// Remove space before tags
		html = html.replace(/\s*</gi, "<");
		
		
		// Line breaks between p tags
		html = html.replace(/>\s*<p/gi, ">" + sourceFile.lineBreak + sourceFile.lineBreak + "<p");
		html = html.replace(/<\/p>\s*</gi, "</p>" + sourceFile.lineBreak + sourceFile.lineBreak + "<");
		
		// Line breaks between h# tags
		html = html.replace(/>\s*<h/gi, ">" + sourceFile.lineBreak + sourceFile.lineBreak + "<h");
		html = html.replace(/<\/h(.)>\s*</gi, "</h$1>" + sourceFile.lineBreak + sourceFile.lineBreak + "<");
		
		// Line breaks between div tags
		html = html.replace(/>\s*<div/gi, ">" + sourceFile.lineBreak + sourceFile.lineBreak + "<div");
		html = html.replace(/<\/div>\s*</gi, "</div>" + sourceFile.lineBreak + sourceFile.lineBreak + "<");
		
		// Line breaks between tbody
		html = html.replace(/>\s*<tbody/gi, ">" + sourceFile.lineBreak + "<tbody");
		html = html.replace(/<\/tbody>\s*</gi, "</tbody>" + sourceFile.lineBreak + "<");
		
		// Line breaks between tr
		html = html.replace(/>\s*<tr/gi, ">" + sourceFile.lineBreak + "<tr");
		html = html.replace(/<\/tr>\s*</gi, "</tr>" + sourceFile.lineBreak + "<");
		
		// Line breaks between td
		html = html.replace(/>\s*<td/gi, ">" + sourceFile.lineBreak + "<td");
		html = html.replace(/<\/td>\s*</gi, "</td>" + sourceFile.lineBreak + "<");
		
		// Line breaks between th
		html = html.replace(/>\s*<th/gi, ">" + sourceFile.lineBreak + "<th");
		html = html.replace(/<\/th>\s*</gi, "</th>" + sourceFile.lineBreak + "<");
		
		
		// Word-wrap p elements
		//html = html.replace(/<p.*>(.*)<\/p>/ig, "<p>" + wordWrapText("$1") + "</p>");
		
		console.timeEnd("insertLineBreaks");
		
		return html;
		
	}
	
	
	function contentEdit(target, type, bubbles, cancelable) {
		// Called every time the contenteditable is updated
		console.time("contentEdit");
		
		if(!sourceFile) throw new Error("sourceFile is gone!")
		else if(!editor.files.hasOwnProperty(sourceFile.path)) alertBox("The source for the file being previewed is not opened!")
		else {
			
			if(sourceFile != editor.currentFile) {
				// alertBox("The file in the editor is not the same as the file being previewed! sourceFile=" + sourceFile.path + " editor.currentFile=" + editor.currentFile.path)
				editor.showFile(sourceFile, false);
			}
			
			//console.log("target=" + objInfo(target));
			console.log("type=" + type);
			
			// Compare the source codes
			var srcHTML = getSourceCodeBody(sourceFile);
			
			if(srcHTML) {
				var main = previewWin.window.document.getElementsByTagName("main")[0];
				var prewHTML = main.innerHTML; //previewWin.window.document.body.innerHTML;
				
				/*
				problem 1: Contenteditable produce mangled/garbled HTML code. 
				Contenteditbale change stuff all over the place, for example inserts <tbody> in tables
				
					solution: Beautify the code!
				
					problem 2: The beautifier touches even more stuff, amplifying the nr 1 problem
					solution 2: insert stuff like <tbody> *before* going into WYSIWYG mode
					
				*/
				
				var sanitized = insertLineBreaks(prewHTML);
				
				if(sanitized != prewHTML) {
					
					/*
					Problem: contenteditable will lose the caret when the html is updated, 
					this is verry annoying when typing as the cursor jumps
						
						solution: Set the caret again using the selection API 
						problem2: Getting the caret is close to impossible and setting it is even harder
						
						 document.elementFromPoint(x, y);
						
						
						
					
					*/
					
					var doc = previewWin.window.document;
					
					console.log("get position");
					if(doc.getSelection()) {
						if(doc.getSelection().anchorNode) {
							var node = document.getSelection().anchorNode;
							var position = node.getBoundingClientRect();
							console.log("position=" + JSON.stringify(position, null, 2));
						} else console.warn("no anchorNode");
						
						if(doc.getSelection().baseNode) {
							var node = doc.getSelection().baseNode.parentNode;
							var position = node.getBoundingClientRect();
							console.log("position=" + JSON.stringify(position, null, 2));
						}
						else console.log("no baseNode");
					}
					else console.log("no selection");
					
					
					function getSelectionStart() {
						if(
						
						return (node.nodeType == 3 ? node.parentNode : node);
					}
					
					
					
					main.innerHTML = sanitized;
					
					prewHTML = main.innerHTML
					
					
					//sourceFile.replaceText(srcHTML, sanitized);
					
					//ignoreTransform = textDiff(sanitized, main.innerHTML);
					
					alertBox("Sanitized garbage from WYSIWYG");
					
				}
				
				
				// Compare the source with the editable preview
				var diff = textDiff(srcHTML, prewHTML, ignoreTransform);
				
				/*
					Problem: When ignoreTransform removes a diff ...
					
				*/
				
				var ignored = 0;
				if(ignoreTransform) {
					if(ignoreTransform.inserted.length > 0) {
						for(var i=ignoreTransform.inserted.length-1; i>=0; i--) { // Reverse for loop to not mess up array indexes
							for(var j=0; j<diff.inserted.length; j++) {
								if(diff.inserted[j].text == ignoreTransform.inserted[i].text) {
									//if(diff.inserted[j].text != ignoreTransform.inserted[i].text) throw new Error("ignoreTransform edited text on row=" + diff.inserted[j].text + " doesn't match! diff=" + diff.inserted[j].text + " ignore=" + ignoreTransform.inserted[i].text);
									diff.inserted.splice(j, 1);
									console.log("Ignoring edited text: row=" + ignoreTransform.inserted[i].row + " text=" + ignoreTransform.inserted[i].text + "");
									ignored++;
									break;
								}
							}
						}
						if(ignored != (ignoreTransform.inserted.length-1)) console.warn("Only ignored " + ignored + " out of " + (ignoreTransform.inserted.length-1) + " ignoreTransform.inserted=" + JSON.stringify(ignoreTransform.inserted, null, 2) + " diff.inserted=" + JSON.stringify(diff.inserted, null, 2));
					}
					
					if(ignoreTransform.removed.length > 0) {
						ignored = 0;
						for(var i=ignoreTransform.removed.length-1; i>=0; i--) { // Reverse for loop to not mess up array indexes
							for(var j=0; j<diff.removed.length; j++) {
								if(diff.removed[j].text == ignoreTransform.removed[i].text) {
									//if(diff.removed[j].text != ignoreTransform.removed[i].text) throw new Error("ignoreTransform original text on row=" + diff.removed[j].text + " doesn't match! diff=" + diff.removed[j].text + " ignore=" + ignoreTransform.removed[i].text);
									diff.removed.splice(j, 1);
									console.log("Ignoring original text: row=" + ignoreTransform.removed[i].row + " text=" + ignoreTransform.removed[i].text + "");
									break;
								}
							}
						}
						if(ignored != (ignoreTransform.removed.length-1)) console.warn("Only ignored " + ignored + " out of " + (ignoreTransform.removed.length-1) + " ignoreTransform.removed=" + JSON.stringify(ignoreTransform.inserted, null, 2) + " diff.removed=" + JSON.stringify(diff.inserted, null, 2));
					}
				}
				
				
				var srcStartIndex = sourceFile.text.indexOf(srcHTML);
				
				if(srcStartIndex == -1) throw new Error("The source file doesn't contain the source code ... sourceFile=" + sourceFile.path + " srcHTML=" + srcHTML);
				
				console.log("srcStartIndex=" + srcStartIndex);
				
				var tmpCaret = sourceFile.createCaret(srcStartIndex);
				
				var startRow = tmpCaret.row;
				
				console.log("source startRow=" + startRow);
				
				var replacedLine = false;
				var linesToBeRemoved = [];
				var row = -1;
				var col = -1;
				var text = "";
				
				console.log("diff.removed=" + JSON.stringify(diff.removed));
				console.log("diff.inserted=" + JSON.stringify(diff.inserted));
				
				// Apply the transformation to the source code ...
				var removedText = "";
				for(var i=0; i<diff.removed.length; i++) {
					console.log("i=" + i + " diff.removed.length=" + diff.removed.length);
					// Remove the text on the line, but do not remove the line (yet)
					row = diff.removed[i].row + startRow;
					
					if(sourceFile.rowText(row).trim() != diff.removed[i].text.trim()) {
						throw new Error("Text on row=" + row + " doesn't match!\nsource=" + sourceFile.rowText(row).trim() + "\nremove=" + diff.removed[i].text.trim() + "\ndiff=" + JSON.stringify(diff, null, 2) + "\n\nsrcHTML=" + srcHTML + "\n\nprewHTML=" + prewHTML);
					}
					
					removedText = sourceFile.removeAllTextOnRow(row);
					
					if(removedText.match(/\n|\r\n/)) throw new Error("Did not expect a new line character to be removed! removedText=" + lbChars(removedText));
					
					if(removedText.trim() != diff.removed[i].text) throw new Error("Text missmatch!\n" + lbChars(removedText) + " = removedText\n" + lbChars(diff.removed[i].text) + " = diff.removed[" + i + "].text");
					
					console.log("Removed all text on row=" + row + ": " + diff.removed[i].text);
					
					// Is there a line that will replace it?
					replacedLine = false;
					for(var j=diff.inserted.length-1; j>=0; j--) { // There can be many inserts on the same line
						console.log("i=" + i + " j=" + j + " diff.inserted.length=" + diff.inserted.length);
						if(diff.inserted[j].row == diff.removed[i].row) {
							
								// Insert the replacing line
								text = diff.inserted[j].text;
								
								if(!replacedLine) sourceFile.insertTextOnRow(text, row)
								else sourceFile.insertTextRow(text, row);
								
								console.log("Inserting (replacing) row=" + row + " text=" + text);
								
								// textLineDiff
								col= textDiffCol(diff.removed[i].text, diff.inserted[j].text);
								
							if(diff.inserted[j].text.length > diff.removed[i].text.length) col += (diff.inserted[j].text.length - diff.removed[i].text.length);
								
								// Move the file caret to the column where the actual change happened
								sourceFile.caret.row = row;
								sourceFile.caret.col = col;
								
								sourceFile.fixCaret();
								
								replacedLine= true;
								diff.inserted.splice(j, 1);
								//j--;
							}
						}
						
						if(!replacedLine) {
							linesToBeRemoved.push(diff.removed[i].row);
						}
						
						console.log("i=" + i + " diff.removed.length=" + diff.removed.length);
					}
				
					// Add lines left to be inserted before removing removed lines (backwards)
					
					for(var i=diff.inserted.length-1; i>-1; i--) {
						
						// Insert the line
						row = diff.inserted[i].row + startRow;
						text = diff.inserted[i].text;
						sourceFile.insertTextRow(text, row);
						
						// Increment linesToBeRemoved 
						for(var j=0; j<linesToBeRemoved.length; j++) {
							if(linesToBeRemoved[j] == diff.inserted[i].row) throw new Error("Insert on a line that is about the be removed! diff.inserted=" + JSON.stringify(diff.inserted) + " linesToBeRemoved=" + JSON.stringify(linesToBeRemoved));
							
							if(linesToBeRemoved[j] > diff.inserted[i].row) linesToBeRemoved[j]++;
						}
						
					}
					
					// Remove lines to be removed (backwards)
					for(var i=linesToBeRemoved.length-1; i>-1; i--) {
						sourceFile.removeRow(linesToBeRemoved[i] + startRow);
					}
					
				// after the transformation: Update what should be ignored again
				var srcHTML = getSourceCodeBody(sourceFile);
				var prewHTML = main.innerHTML;
				//ignoreTransform = textDiff(srcHTML, main.innerHTML);
				
				//alert("Transformed source document!");
				
			}
			
		}
		
		console.timeEnd("contentEdit");
	}
	
	function closePreview() {
		// Close the preview window
		try {
			previewWin.close();
			previewWin = undefined;
		}
		catch(e) {
		}
	}
	
	function getSourceCodeBody(sourceFile) {
		// Returns the body of the source HTML code
		var srcMatchBody = sourceFile.text.match(/<body.*>([\s\S]*)<\/body>/i);
		
		if(srcMatchBody == null) {
			console.warn("Could not find &lt;body element in source file<br>" + sourceFile.path);
			return sourceFile.text;
		}
		else return srcMatchBody[1];
	}
	
	function publishSSG() {
		if(selectedSite) publishSite(selectedSite)
		else {
			showSSG();
			alertBox("Select site to publish!");
		}
		return false;
	}
	
	function publishSite(site) {
		compile(site.source, site.publish, true, function buildDone() {
			alertBox(site.name + " published to " + site.publish);
		});
		return false;
	}
	
	function newPage(site) {
		
		editor.workingDirectory = site.source;
		
		editor.readFromDisk(site.template, function fileRead(err, path, text) {
			
			if(err) alertBox(err.message);
			else {
				editor.openFile("newPage.htm", text);
			}
			
		});
		
		return false;
	}
	
	
	function compile(source, destination, publish, callback) {
		
		var url = require("url");
		var parse = url.parse(destination);
		var protocol = parse.protocol;
		
		if(protocol) protocol = protocol.replace(/:/g, "").toLowerCase();
		
		console.log("protocol: " + protocol);
		
		console.log("source=" + JSON.stringify(url.parse(source), null, 2));
		console.log("destination=" + JSON.stringify(url.parse(destination), null, 2));
		
		if(editor.remoteProtocols.indexOf(protocol) != -1) {
			// We will need to connect to the remote location before uploading files
			var serverAddress = parse.host;
			var auth = parse.auth, user, passw;
			if(auth) {
				auth = auth.split(":");
				if(auth.length == 2) {
					user = auth[0];
					passw = auth[1];
				}
			}
			else if(selectedSite.user.length > 0) {
				user = selectedSite.user;
				passw = selectedSite.pw;
			}
			var keyPath = selectedSite.key;
			
			var workingDir = parse.path;
			
			editor.connect(fsReady, protocol, serverAddress, user, passw, keyPath, workingDir);
		}
		else {
			// Asume local file-system
			fsReady(null, editor.workingDirectory);
		}
		
		function fsReady(err, workingDir) {
			
			if(err) {
				alertBox(err.message);
				return true;
			};
			
			console.log("Compiling: " + source);
			
			var childProcess = require("child_process");
			var path = require('path');
			
			var buildScript = path.join(require("dirname"), "./plugin/static_site_generator/build.js");
			
			//console.log("buildScript=" + buildScript);
			console.log("source=" + source);
			var workingDir = path.join(source, "../");
			//console.log("workingDir=" + workingDir);
			var node_modules = path.join(source, "../node_modules/"); // Node runtime wont check node_modules folder, so we'll have to explicity set it in NODE_PATH enviroment variable
			//console.log("node_modules=" + node_modules);
			
			var fs = require("fs");
			
			var filesToSave = 0;
			var doneCompiling = false;
			var workerExitCode = -1;

			var foldersExist = [];
			var folderAboutToBeCreated = [];
			var waitingList = [];
			
			var args = [source, destination];
			
			if(publish) args.push( "-publish");
			
			var worker = childProcess.fork(buildScript, args, {
				cwd: workingDir,
				env: {"NODE_PATH": node_modules}, // Tell node runtime to check for modules in this folder
			});
			
			// PS. It's impossible to caputre stdout and stderr from the fork. You'll have to use process.send() to send message back here
			
			worker.on('message', function worker_message(data) {
				//alertBox(data);
				console.log("SSG: " + JSON.stringify(data));
				
				if(data.type == "file") {
					filesToSave++;
					createFile(data.path, data.text)
				}
				else if(data.type == "copy") {
					filesToSave++;
					copyFile(data.from, data.to)
				}
				else if(data.type == "debug") {
					console.log(data.msg);
				}
				else if(data.type == "error") {
					console.log(data);
					if(data.code == "ENOENT" && data.stack.indexOf("�") != -1) alertBox("File name encoding problem when opening file (try renaming it) ...\n" + data.stack);
					else if(data.code == "ENOENT") alertBox("Problem occured when opening file...\n" + data.stack);
					else alertBox(data.stack);
				}
				else throw new Error("Unknown message from worker: " + JSON.stringify(data));
				
			});
			worker.on('error', function worker_error(code) {
				console.warn("SSG: Error code=" + code);
				alertBox("SSG worker error code=" + code);
			});
			worker.on('exit', function worker_exit(code) {
				console.log("SSG: Exit! code=" + code);
				if(code != 0) throw new Error("The process exited with code=" + code + "! (It means something went wrong)");
				else {
					doneCompiling = true;
					workerExitCode= code;
					checkDone();
				}
			});
			
			function createFile(filePath, text) {
				
				var folder = getDirectoryFromPath(filePath);

				if(foldersExist.indexOf(folder) != -1) {
					console.log("Saving to disk filePath=" + filePath + " because folder exist: folder=" + folder);
					editor.saveToDisk(filePath, text, fileCreated);
				}
				else {
					waitingList.push(function() { createFile(filePath, text) });
					
					if(folderAboutToBeCreated.indexOf(folder) == -1) createPath(folder);
				}
								
				function fileCreated(err, path) {
					if(err) {
						alertBox("<b>" + err.message + "</b><br> Attempting to save: " + filePath);
						throw err;
					}
					else {
						fileSaved(filePath);
						runWaitingList();
					}
				}
			}
			
			function copyFile(from, to) {
				
				var folder = getDirectoryFromPath(to);
				
				if(foldersExist.indexOf(folder) != -1) {
					editor.copyFile(from, to, fileCopied);
				}
				else {
					waitingList.push(function() { copyFile(from, to) });
					
					if(folderAboutToBeCreated.indexOf(folder) == -1) createPath(folder);
				}

				function fileCopied(err, path) {
					if(err) {
						alertBox("Unable to copy file (" + err.message + ")\n" + path);
					}
					else {
						fileSaved(to);
						runWaitingList();
					}
				}
			}
			
			function createPath(folder, createPathCallback) {
				console.log("Creating path=" + folder);
				folderAboutToBeCreated.push(folder);
				editor.createPath(folder, function(err) {
					if(err) throw err;
					else {
						folderAboutToBeCreated.splice(folderAboutToBeCreated.indexOf(folder, 1));
						foldersExist.push(folder);
						
						//createPathCallback();
						
						runWaitingList();
					}
				});	
			}
			
			function runWaitingList() {
				console.log("Items in waiting list: waitingList.length=" + waitingList.length);
				if(waitingList.length > 0) waitingList.shift()();
			}
			
			function fileSaved(path) {
				console.log("Saved file path=" + path);
				filesToSave--;
				
				console.log("Files left to be saved: filesToSave=" + filesToSave);
				
				if(filesToSave == 0) checkDone();
			}
			
			function checkDone(exitCode) {
				if(filesToSave == 0 && doneCompiling) {
					
					callback(workerExitCode);
				}
				else console.log("filesToSave=" + filesToSave + " exitCode=" + exitCode);
			}
			

		}
	}
	
	function computeIgnoreTransform(srcHTML, rawMainHtml) {
		
		// Make sure they end with a line break
		
		
		ignoreTransform = textDiff(srcHTML, rawMainHtml);
		
		// Make sure there are no errors
		var lbSrc = occurrences(srcHTML, "\n");
		var lbMain = occurrences(rawMainHtml, "\n");
		var removed = ignoreTransform.removed.length;
		var inserted = ignoreTransform.inserted.length;
		
		if( (lbSrc - removed) != (lbMain - inserted) ) {
			throw new Error("Not same amount of rows! lbSrc=" + lbSrc + " lbMain=" + lbMain + " removed=" + removed + " inserted=" + inserted + "  diff=" + JSON.stringify(ignoreTransform, null, 2));
		}
		
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
		
		if(wysiwygEnabled) {
			if(previewWin) enableContentEdit(previewWin);
			else previewPage(site, enableContentEdit);
		}
		else {
			if(previewWin) disableContentEdit(previewWin);
		}
		
		return false;
		
		function enableContentEdit(previewWin) {
			
			// Get the URL of the page/file in preview
			var url = previewWin.window.location.href;
			var previePath = url;
			var rawMainHtml = "";
			var srcHTML = "";
			var systemPathDelimiter = getPathDelimiter(process.cwd());
			var sourceFilePath = url.replace("file://", "");
			while(sourceFilePath.substr(0,1) == "/") sourceFilePath = sourceFilePath.substr(1); // In Windows there are three slashes in file:/// but in Linux it's only two!
			sourceFilePath = sourceFilePath.replace(/\//g, systemPathDelimiter);
			if(site.source.substr(0,1) == "/") sourceFilePath = "/" + sourceFilePath; // Add the root slash
			sourceFilePath = sourceFilePath.replace(site.preview, site.source);
			
			console.log("url=" + url);
			console.log("sourceFilePath=" + sourceFilePath);
			console.log("site.preview=" + site.preview);
			console.log("site.source=" + site.source);
			
			if(sourceFilePath.match(/index\.htm./i)) {
				alertBox("Unable to edit index file in WYSIWYG mode");
				return;
			}
			
			// Get the source code for the compiled page in review, in order to compute ignoreTransform
			editor.readFromDisk(previePath, function gotPreviewSource(err, path, txt) {
				
				if(err) throw err;
				
				var matchMain = txt.match(/<main.*>([\s\S]*)<\/main>/i);
				
				if(matchMain == null) {
					alertBox("Could not find &lt;main element in preview source file\n" + path);
					rawMainHtml = "";
				}
				else rawMainHtml = matchMain[1];
				
				if(srcHTML && rawMainHtml) computeIgnoreTransform(srcHTML, rawMainHtml);
				
			});
			
			
			// Open the file in the editor if it's not already open
			if(editor.files.hasOwnProperty(sourceFilePath)) {
				sourceFile = editor.files[sourceFilePath];
				editor.showFile(sourceFile); // Make sure it's the current one open
				
				makeItEditable(null, sourceFile);
			}
			else {
				editor.openFile(sourceFilePath, undefined, makeItEditable);
			}
			
			function makeItEditable(err, file) {
				
				if(err) throw err;
				
				sourceFile = file;
				
				srcHTML = getSourceCodeBody(sourceFile);
				//var body = previewWin.window.getElementsByTagName("body")[0];
				var body = previewWin.window.document.body;
				var mainElements = previewWin.window.document.getElementsByTagName("main");
				var contentEditor = previewWin.window.document;
				
				if(mainElements.length > 1) {
					alertBox("Document contains more then one &lt;main&gt; element!");
					return;
				}
				if(mainElements.length == 0) {
					alertBox("Document has no &lt;main&gt; element!");
					return;
				}
				
				var main = mainElements[0];
				
				// make sure it's saved, and that the preview is from the last save
				if(!sourceFile.isSaved ) {
					var diff = textDiff(srcHTML, main.innerHTML);
					if(diff.inserted.length > 0 || diff.removed.length > 0) {
						alertBox("The page (" + getFilenameFromPath(sourceFile.path) + ") will not be editable from WYSIWYG mode because there are unsaved changes in the source file!");
						return;
					}
				}
				
				// ### Insert toolbar
				var aShowDefaultUI = true;
				
				var buttonStyle = `border-radius: 3px;
				border: 1px solid rgba(19, 19, 19, 0.5);
				box-shadow: 0px 2px 5px #505050, inset 0px 1px 1px #888888;
				color: #f6f6f3;
				min-width: 120px;
				background-color: #414141;
				background: linear-gradient(#545657, #434343, #454545);
				cursor: default;
				text-shadow: 0px -1px 0px #1f2020;
				padding: 4px;
				margin: 4px;`;
				
				var toolbar = document.createElement("div");
				toolbar.setAttribute("id", "toolbar");
				toolbar.setAttribute("class", "wysiwygtoolbar");
				toolbar.setAttribute("style", "position: fixed; top: 0px; left: 0px; width: 100%; padding: 5px; background: linear-gradient(#595959, #555555); box-shadow: outset 0px 4px 10px #888888; border-bottom: 2px solid #767676; ");
				
				var buttonH1 = document.createElement("button");
				buttonH1.appendChild(document.createTextNode("Huvudrubrik"));
				buttonH1.setAttribute("style", buttonStyle);
				buttonH1.onclick = function insertH1() {
					//contentEditor.execCommand("heading", aShowDefaultUI, "h1");
					contentEditor.execCommand('formatBlock', false, '<h1>');
				}
				toolbar.appendChild(buttonH1);
				
				var buttonItalic = document.createElement("button");
				buttonItalic.appendChild(document.createTextNode("kursiv"));
				buttonItalic.setAttribute("style", buttonStyle);
				buttonItalic.onclick = function makeItalic() {
					contentEditor.execCommand("italic", aShowDefaultUI);
				}
				toolbar.appendChild(buttonItalic);
				
				var buttonBold = document.createElement("button");
				buttonBold.appendChild(document.createTextNode("fetstil"));
				buttonBold.setAttribute("style", buttonStyle);
				buttonBold.onclick = function makeBold() {
					contentEditor.execCommand("bold", aShowDefaultUI);
				}
				toolbar.appendChild(buttonBold);
				
				// insertImage
				
				// insertOrderedList
				
				// insertUnorderedList
				
				// justifyCenter, justifyLeft, justifyRight
				
				// subscript, superscript
				
				// createLink, unlink
				
				
				
				
				body.insertBefore(toolbar, body.firstChild); // Insert the toolbar at the top
				
				body.setAttribute("style", "padding-top: 60px; transition: transform 0.4s ease;"); // Make sure the toolbar doesn't cover layout
				
				
				contentEditor.execCommand("enableInlineTableEditing");
				contentEditor.execCommand("enableObjectResizing");
				contentEditor.execCommand("insertBrOnReturn");
				
				
				// Change buttonWysiwyg state to "active"
				if(buttonWysiwyg) buttonWysiwyg.style.fontWeight="bold";
				
				
				main.contentEditable = "true";
				
				previewWin.window.addEventListener("input", contentEdit);
				
				main.addEventListener("paste", contentPaste);
				
				
				// Find stuff that should be ignored when comparing edits in preview
				if(srcHTML) {
					/*
					problem: scripts found in <body> are placed after <main>
					also: Extra stuff might be added to <main>
					solution: ignoreTransform needs to be recalculated after each transformation
					
						problem2: contenteditable does not use the original HTML code, it changes it! For example adding <tbody> in tables ... resulting in ignoreTransform ignoring important updates
						solution2: Only compare the raw HTML when computing ignoreTransform! Then clean up the contenteditable content when pasting it into the source
					*/
					
					if(srcHTML && rawMainHtml) computeIgnoreTransform(rawMainHtml);
					
				}
				
				previewWin.focus();
				
				function contentPaste(e) {
					var html = e.clipboardData.getData('text/html');
					
					e.preventDefault();
					
					var cleaned = html;
					
					cleaned = sanitizeOfficeDoc(cleaned);
					
					cleaned = insertLineBreaks(cleaned);
					
					
					contentEditor.execCommand("insertHTML", aShowDefaultUI, cleaned);
					
				}
				
			}
		}
		
		
		function disableContentEdit(previewWin) {
			
			// Change buttonWysiwyg state to "normal"
			if(buttonWysiwyg) buttonWysiwyg.style.fontWeight="normal";
			
			var body = previewWin.window.document.body;
			body.contentEditable = "false";
			previewWin.window.removeEventListener("input", contentEdit);
			
		}
		
	}
	
	
})();