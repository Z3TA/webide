(function() {
	"use strict";
	
	
	var sites;
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
	
	
	var previewView;
	var preview;
	
	
	var path = require("path");
	var demoSite = {
		name: "Demo site",
		source: path.join(require("dirname"), "/plugin/static_site_generator/demo/source/"),  // Source files (when colaborating; use a source control management tool!)
		preview: path.join(require("dirname"), "/plugin/static_site_generator/demo/preview/"), // Compiles files for review is saved here
		publish: path.join(require("dirname"), "/plugin/static_site_generator/demo/public/"),  // Compiled files for live deployment is sent to this folder
		template: path.join(require("dirname"), "/plugin/static_site_generator/demo/template.htm")  // A template for new pages/posts
	}
	
	// Add plugin to editor
	editor.plugin({
		desc: "Static site generator management interface",
		load: load,
		unload: unload,
	});
	
	function load() {
		// Called when the module is loaded
		
		if(!window.localStorage) throw new Error("window.localStorage not available!");
		
		sites = window.localStorage.cmsjz_sites ? JSON.parse(window.localStorage.cmsjz_sites) : [demoSite];
		
		var keyF9 = 120;
		var keyEscape = 27;
		
		editor.bindKey({desc: "Show the manager for the static site generator", fun: show, charCode: keyF9, combo: CTRL});
		editor.bindKey({desc: "Hide the manager for the static site generator", fun: hide, charCode: keyEscape, combo: 0});
		editor.bindKey({desc: "Compiles a preveiw for current site in the static site generator", fun: previewButtonClick, charCode: keyF9, combo: 0});
		editor.bindKey({desc: "Publish/live deployment of the static-site-generator site", fun: publish, charCode: keyF9, combo: CTRL + SHIFT});
		
		//build();
		
	}
	
	function unload() {
		// Cleaning up, for example when disabling a plugin
	}
	
	function build() {
		
		console.log("Building SSG manager");
		
		var footer = document.getElementById("footer");
		
		manager = document.createElement("div");
		
		buildEdit();
		buildControl();
		buildPreview();
		
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
		
		var buttonSetWorkingDirectory = document.createElement("input");
		buttonSetWorkingDirectory.setAttribute("type", "button");
		buttonSetWorkingDirectory.setAttribute("class", "button");
		buttonSetWorkingDirectory.setAttribute("value", "Set working directory");
		buttonSetWorkingDirectory.setAttribute("title", "Sets the editors working directory to the source directory of the selected site.");
		buttonSetWorkingDirectory.addEventListener("click", function() {
			if(!selectedSite) throw new Error("No site selected!");
			editor.workingDirectory = selectedSite.source;
			hide();
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
		
		var buttonPublish = document.createElement("input");
		buttonPublish.setAttribute("type", "button");
		buttonPublish.setAttribute("class", "button");
		buttonPublish.setAttribute("value", "Publish");
		buttonPublish.addEventListener("click", function() {
			publish(selectedSite);
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
			hide();
		}, false);
		
		
		controlView.appendChild(labelSite); // Includes selectSite
		controlView.appendChild(buttonSetWorkingDirectory);
		controlView.appendChild(buttonNewPage);
		controlView.appendChild(buttonPreview);
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
		labelPublish.appendChild(document.createTextNode("Publish directory:")); // Language settings!?
		
		var labelTemplate = document.createElement("label");
		labelTemplate.setAttribute("for", "inputTemplate");
		labelTemplate.appendChild(document.createTextNode("Template file:")); // Language settings!?
		
		
		// Inputs
		
		inputSiteName = document.createElement("input");
		inputSiteName.setAttribute("type", "text");
		inputSiteName.setAttribute("id", "inputSiteName");
		inputSiteName.setAttribute("class", "inputtext");
		inputSiteName.setAttribute("size", "51");
		
		inputSourceFolder = document.createElement("input");
		inputSourceFolder.setAttribute("type", "text");
		inputSourceFolder.setAttribute("id", "inputSourceFolder");
		inputSourceFolder.setAttribute("class", "inputtext path");
		inputSourceFolder.setAttribute("title", "Folder where the source files are located");
		inputSourceFolder.setAttribute("size", "51");
		
		inputPreviewFolder = document.createElement("input");
		inputPreviewFolder.setAttribute("type", "text");
		inputPreviewFolder.setAttribute("id", "inputPreviewFolder");
		inputPreviewFolder.setAttribute("class", "inputtext path");
		inputPreviewFolder.setAttribute("size", "51");
		
		inputPublishFolder = document.createElement("input");
		inputPublishFolder.setAttribute("type", "text");
		inputPublishFolder.setAttribute("id", "inputPublishFolder");
		inputPublishFolder.setAttribute("class", "inputtext path");
		inputPublishFolder.setAttribute("size", "51");
		
		inputTemplate = document.createElement("input");
		inputTemplate.setAttribute("type", "text");
		inputTemplate.setAttribute("id", "inputTemplate");
		inputTemplate.setAttribute("class", "inputtext path");
		inputTemplate.setAttribute("size", "51");
		inputTemplate.setAttribute("title", "Template file for new page/post on this site");
		
		
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
		
		
		// Name
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("align", "right");
		td.appendChild(labelName);
		tr.appendChild(td);
		
		td = document.createElement("td");
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
					alert(name + " alias already used!");
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
		
		
		function cancelEdit() {
			
			if(!selectedSite) throw new Error("No site selected!");
			
			// Reset the values
			inputSiteName.value = selectedSite.name;
			inputSourceFolder.value = selectedSite.source;
			inputPreviewFolder.value = selectedSite.preview;
			inputPublishFolder.value = selectedSite.publish;
			inputTemplate.value = selectedSite.template;
			
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
	
	function buildPreview() {
		
		var rightColumn = document.getElementById("rightColumn");
		
		previewView = document.createElement("div");
		previewView.setAttribute("style", "display: none;"); 
		
		preview = document.createElement("iframe");
		preview.setAttribute("width", "500");
		preview.setAttribute("height", "100%"); 
		
		previewView.appendChild(preview);
		
		rightColumn.appendChild(previewView);
		
	}
	
	function addSiteOption(site, index) {
		
		if(!selectSite) throw new Error("selectSite not yet created!");
		
		var option = document.createElement("option");
		option.text = site.name;
		option.id = index;
		selectSite.appendChild(option);
		
		return selectSite.options.length -1;
	}
	
	function show() {
		editor.input = false; // Steal focus from the file
		
		if(!manager) build(); // Build the GUI if it's not already built
		
		manager.style.display = "block";
		
		editor.resizeNeeded();
		
		return false;
	}
	
	function hide() {
		if(editor.currentFile) editor.input = true; // Bring back focus to the current file
		
		if(manager) { // Only need to hide if the object is created!
			manager.style.display = "none";
			previewView.style.display="none";
			
			editor.resizeNeeded();
		}
		return false;
	}
	
	function previewButtonClick(file, combo, character, charCode, keyPushDirection, targetElementClass) {
		if(!selectedSite) alert("No site selected!");
		else previewPage(selectedSite);
		
		return false;
	}
	
	function previewPage(site) {
		
		compile(site.source, site.preview, function buildDone() {
			var path = require('path');
			
			if(!editor.currentFile) preview.src = path.join(site.preview, "index.htm");
			else {
				var fileName = editor.currentFile.name;
				var fileType = editor.currentFile.fileExtension;
				
				
				if(editor.currentFile.path.indexOf(site.source) != -1 // Inside source path?
				&& (fileType == "htm" || fileType=="html" || fileType=="md") // Right file type
				&& fileName != "header" && fileName != "footer") { 
					
					var url = path.join(site.preview, editor.currentFile.name);
					try {
						preview.src = url
					}
					catch(e) {
						console.warn(err.message);
						alert("Unable to load: " + url);
					}
					
				}
				else {
					preview.src = path.join(site.preview, "index.htm");
				}
			}
			
			
			
			preview.setAttribute("width", Math.floor(editor.view.canvasWidth / 2));
			preview.setAttribute("height", Math.floor(editor.view.canvasHeight));
			
			previewView.style.display="block";
			editor.resizeNeeded();
			
		});
		
		return false;
		
	}
	
	function publish() {
		if(selectedSite) publishSite(selectedSite)
		else {
			show();
			alert("Select site to publish!");
		}
		return false;
	}
	
	function publishSite(site) {
		compile(site.source, site.publish, function buildDone() {
			alert(site.name + " published to " + site.publish);
});
		return false;
	}
	
	function newPage(site) {
		
		editor.readFromDisk(site.template, function fileRead(err, path, text) {
			
			if(err) alert(err.message);
			else {
				editor.openFile("newPage.htm", text);
			}
			
		});
		
		return false;
	}
	
	
	function compile(source, destination, callback) {
		var childProcess = require("child_process");
		var path = require('path');
		
		var buildScript = path.join(require("dirname"), "./plugin/static_site_generator/build.js");
		
		//console.log("buildScript=" + buildScript);
		console.log("source=" + source);
		var workingDir = path.join(source, "../");
		//console.log("workingDir=" + workingDir);
		var node_modules = path.join(source, "../node_modules/"); // Node runtime wont check node_modules folder, so we'll have to explicity set it in NODE_PATH enviroment variable
		//console.log("node_modules=" + node_modules);
		
		var worker = childProcess.fork(buildScript, [source, destination], {
			cwd: workingDir,
			env: {"NODE_PATH": node_modules} // Tell node runtime to check for modules in this folder
		});
		
		/*
		worker.stdout.on('data', function(data) {
			console.log("SSG stdout: " + data);  
		});
		*/
		
		worker.on('message', function worker_message(data) {
			alert(data);
			//console.log("SSG:" + data);
		});
		worker.on('error', function worker_error(code) {
			console.warn("SSG: Error code=" + code);
		});
		worker.on('exit', function worker_exit(code) {
			console.log("SSG: Exit! code=" + code);
			callback();
		});
	}
	
	
})();