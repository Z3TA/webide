(function() {
	
	"use strict";
	
	
	
	var sites;
	var manager;
	var selectSite;
	var selectedSite;
	var editView;
	var controlVeiw;
	
	
	var path = require("path");
	var demoSite = {
		name: "My simple blog",
		source: path.join(require("dirname") + "/demo/source/"),  // Source files (when colaborating; use a source control management tool!)
		previw: path.join(require("dirname") + "/demo/preview/"), // Compiles files for review is saved here
		publish: path.join(require("dirname") + "/demo/public/"),  // Compiled files for live deployment is sent to this folder
		template: path.join(require("dirname") + "/demo/template.htm")  // A template for new pages/posts
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
		
		sites = window.localStorage.ssg_sites ? JSON.parse(window.localStorage.ssg_sites) ? [demoSite];
		
		var keyF9 = 120;
		var keyEscape = 27;
		
		editor.bindKey({desc: "Show the manager for the static site generator", fun: show, charCode: keyF9, combo: CTRL + SHIFT});
		editor.bindKey({desc: "Hide the manager for the static site generator", fun: hide, charCode: keyEscape, combo: 0});
		editor.bindKey({desc: "Compiles a preveiw for current site in the static site generator", fun: preview, charCode: keyF9, combo: 0});
		editor.bindKey({desc: "Publish/live deployment of the static-site-generator site", fun: publish, charCode: keyF9, combo: CTRL + SHIFT});
		
		build();
		
	}
	
	function unload() {
		// Cleaning up, for example when disabling a plugin
	}
	
	function build() {
		
		console.log("Building SSG manager");
		
		var footer = document.getElementById("footer");
		
		manager = document.createElement("div");
		
		buildControl();
		buildEdit();
		
		editView.style.display="none";
		
		manager.appendChild(editView);
		manager.appendChild(controlVeiw);
		
		footer.appendChild(manager);
		
		console.log("done building server manager");
	}
	
	function buildControl() {
		var footer = document.getElementById("footer");
		
		controlVeiw = document.createElement("div");
		
		selectSite = document.createElement("select");
		selectSite.setAttribute("id", "selectSite");
		selectSite.setAttribute("class", "select");
		
		if(sites.length > 0) {
			selectedSite = sites[0];
			selectSite.forEach(addSiteOption);
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
		buttonEdit.addEventListener("click", function() {
			editor.workingDirectory = selectedSite.source;
		}, false);
		
		var buttonPreview = document.createElement("input");
		buttonPreview.setAttribute("type", "button");
		buttonPreview.setAttribute("class", "button");
		buttonPreview.setAttribute("value", "Preview");
		buttonEdit.addEventListener("click", function() {
			preview(selectedSite);
		}, false);
		
		var buttonPublish = document.createElement("input");
		buttonPublish.setAttribute("type", "button");
		buttonPublish.setAttribute("class", "button");
		buttonPublish.setAttribute("value", "Preview");
		buttonPublish.addEventListener("click", function() {
			publish(selectedSite);
		}, false);
		
		var buttonSettings = document.createElement("input");
		buttonSettings.setAttribute("type", "button");
		buttonSettings.setAttribute("class", "button");
		buttonSettings.setAttribute("value", "Preview");
		buttonSettings.addEventListener("click", editSiteSettings, false);
		
		var buttonCancel = document.createElement("input");
		buttonCancel.setAttribute("type", "button");
		buttonCancel.setAttribute("class", "button");
		buttonCancel.setAttribute("id", "buttonCancel");
		buttonCancel.setAttribute("value", "Cancel");
		
		buttonCancel.addEventListener("click", function() {
			hide();
		}, false);
		
		function editSiteSettings() {
			editView.style.display="block";
			connectionView.style.display="none"; // Hide this div
			editor.resizeNeeded();
		}
		
	}
	
	function buildEdit() {
		
	}
	
	function addSiteOption(site, index) {
		
		if(!selectSite) throw new Error("selectSite not yet created!");
		
		var option = document.createElement("option");
		option.text = site.name;
		option.id = site.index;
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
		
		serverManager.style.display = "none";
		editor.resizeNeeded();
		
		return false;
	}
	
	function preview() {
		
		return false;
	}
	
	function publish() {
		
		return false;
	}

})();