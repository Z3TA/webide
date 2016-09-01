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
	
	// Load native UI library
	var gui = require('nw.gui');
	var previewWin;
	var editContent = false;
	var sourceFile; // Source file that is being previewed
	var headerRows = 0;
	var footerRows = 0;
	
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
		
		editor.addMenuItem("Static site generator", function() {
			show();
			editor.hideMenu();
		});
		
		editor.on("fileShow", fileChanged);
		
		editor.on("exit", function SSG_cleanup() {
			closePreview();
			return true;
		});
		
	}
	
	function fileChanged(file) {
		
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
	
	
	function unload() {
		// Cleaning up, for example when disabling a plugin
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
			hide();
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
		controlView.appendChild(buttonOpenEdit);
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
		
		// Only need to hide if the object is created!
		if(manager) {
			manager.style.display = "none";
			editor.resizeNeeded();
		}
		if(previewWin) closePreview() ;
		
		return false;
	}
	
	function previewButtonClick(file, combo, character, charCode, keyPushDirection, targetElementClass) {
		if(!selectedSite) alert("No site selected!");
		else previewPage(selectedSite);
		
		return false;
	}
	
	function previewPage(site) {
		
		console.log("Previewing " + site.name);
		
		var errorOccured = false;
		
		compile(site.source, site.preview, function compiled_static() {
			
			var path = require('path');
			
			var previewWinOpened = false;
			
			if(editor.currentFile) {
				var fileName = editor.currentFile.name;
				var fileType = editor.currentFile.fileExtension;
				
				if(editor.currentFile.path.indexOf(site.source) != -1 // Inside source path?
				&& (fileType == "htm" || fileType=="html") // We only like HTML code! :P
				&& fileName != "header" && fileName != "footer") { 
					
					// Save the src file so we edit the right file
					sourceFile = editor.currentFile;
					
					if(!sourceFile.isSaved) {
						alert("The page (" + getFilenameFromPath(sourceFile.path) + ") will not be editable from WYSIWYG mode because there are unsaved changes in the source file!");
						editContent = false;
					}
					else {
						editContent = true;
					} 
					
					
					//var url = path.join(site.preview, editor.currentFile.name);
					
					// url needs to have / instead of \ for path delimiter
					var url = "file:///" + editor.currentFile.path.replace(site.source, site.preview).replace(/\\/g, "/");
					
					openPreviewWin(url)
					
					previewWinOpened = true;
					
				}
				else {
					console.log("Not showing preview window because:\neditor.currentFile.path=" + editor.currentFile.path + "\nfileType=" + fileType + "fileName=" + fileName);
				}
			}
			
			if(!previewWinOpened) {
				// Open the index page
				var url = "file:///" + site.preview.replace(/\\/g, "/");
				
				editContent = false;
				
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
					
					openPreviewWin(url);
					
				});
			}
			
			return false;
		});
	}
	
	function openPreviewWin(url) {
		
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
			
			previewWin = gui.Window.open(url);
			
			previewWin.on('focus', previewWinFocus);
			previewWin.on('focus', previewWinUnFocus);
			previewWin.on("loaded", previewWinLoaded);
			
		}
		else {
			
			if(previewWin.window.location == url || previewWin.window.location == "swappedout://") {
				var scrollTop = previewWin.window.scrollTop; // Get the scroll position
				console.log("scrollTop=" + scrollTop);
				if(previewWin.window.location == url) previewWin.reload()
				else previewWin.window.location = url;
				previewWin.window.scrollTop = scrollTop; // Set the scroll position again
			}
			else {
				console.log("url=" + url + " != " + previewWin.window.location);
				previewWin.window.location = url;
			}
			
			previewWin.focus();
			
		}
		
		// If 404 !?
		//previewIframe.src = path.join(site.preview, "index.htm");
		
	}
	
	function previewWinLoaded() {
		
		previewWin.focus();
		
		console.log("PreviewWin loaded!");
		
		
		headerRows = 0;
		footerRows = 0;
		if(editContent) {
			
			//var body = previewWin.window.getElementsByTagName("body")[0];
			var body = previewWin.window.document.body;
			
			body.contentEditable = "true";
			
			previewWin.window.addEventListener("input", previewInput);
			
			// Find stuff that should be ignored when comparing edits in preview
			
			var srcHTML = getSourceCodeBody();
			if(srcHTML) {
				var diff = textDiff(srcHTML, body.innerHTML);
				var row = -1;
				for (var i=0; i<diff.inserted.length; i++) {
					if(row == -1) row = diff.inserted[i].row;
					
					if(row < diff.inserted[i].row) footerRows++
					else headerRows++;
				}
			}
		}
		else {
			previewWin.window.removeEventListener("input", previewInput);
		}
	}
	
	
	function previewWinFocus() {
		console.log('preview window is focused');
		editor.input = false;
	}
	
	function previewWinUnFocus() {
		if(editor.currentFile) editor.input = true;
	}
	
	function previewInput(target, type, bubbles, cancelable) {
		console.log("previewInput!");
		
		if(!sourceFile) throw new Error("sourceFile is gone!")
		if(!editor.files.hasOwnProperty(sourceFile.path)) alert("The source for the file being previewed is not opened!")
		if(sourceFile != editor.currentFile) alert("The file in the editor is not the same as the file being previewed! sourceFile=" + sourceFile.path + " editor.currentFile=" + editor.currentFile.path)
		else {
			//console.log("target=" + objInfo(target));
			console.log("type=" + type);
			
			// Compare the source codes
			var srcHTML = getSourceCodeBody();
			
			if(srcHTML) {
				// Compare the source with the editable preview
				var prewHTML = previewWin.window.document.body.innerHTML;
				
				var diff = textDiff(srcHTML, prewHTML, headerRows, footerRows);
				
				var srcStartIndex = sourceFile.text.indexOf(srcHTML);
				
				if(srcStartIndex == -1) throw new Error("The source file doesn't contain the source code ... sourceFile=" + sourceFile.path + " srcHTML=" + srcHTML);
				
				console.log("srcStartIndex=" + srcStartIndex);
				
				var tmpCaret = sourceFile.createCaret(srcStartIndex);
				
				var startRow = tmpCaret.row;
				
				console.log("startRow=" + startRow);
				
				var replacedLine = false;
				var linesToBeRemoved = [];
				var row = -1;
				var col = -1;
				var text = "";
				
				console.log("diff.removed=" + JSON.stringify(diff.removed));
				console.log("diff.inserted=" + JSON.stringify(diff.inserted));
				
				for(var i=0; i<diff.removed.length; i++) {
					console.log("i=" + i + " diff.removed.length=" + diff.removed.length);
					// Remove the text on the line, but do not remove the line (yet)
					row = diff.removed[i].row + startRow;
					
					if(sourceFile.rowText(row).trim() != diff.removed[i].text.trim()) throw new Error("Text on row=" + row + " doesn't match!\nsource=" + sourceFile.rowText(row).trim() + "\nremove=" + diff.removed[i].text.trim());
					
					sourceFile.removeAllTextOnRow(row); 
					
					console.log("Removed all text on row=" + row);
					
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
							
							if(diff.inserted[j].text.length > diff.removed[i].text.length) col++;
							
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
				
			}
			
		}
		
		
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
	
	function getSourceCodeBody() {
		// Returns the body of the source HTML code
		var srcMatchBody = sourceFile.text.match(/<body.*>([\s\S]*)<\/body>/i);
		
		if(srcMatchBody == null) alert("Could not find &lt;body element in source file<br>" + sourceFile.path);
		else return srcMatchBody[1];
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
		
		editor.workingDirectory = site.source;
		
		editor.readFromDisk(site.template, function fileRead(err, path, text) {
			
			if(err) alert(err.message);
			else {
				editor.openFile("newPage.htm", text);
			}
			
		});
		
		return false;
	}
	
	
	function compile(source, destination, callback) {
		
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
			var auth = parse.auth, user, passw, keyPath;
			if(auth) {
				auth = auth.split(":");
				if(auth.length == 2) {
					user = auth[0];
					passw = auth[1];
				}
			}
			var workingDir = parse.path;
			
			editor.connect(fsReady, protocol, serverAddress, user, passw, keyPath, workingDir);
		}
		else {
			// Asume local file-system
			fsReady(null, editor.workingDirectory);
		}
		
		function fsReady(err, workingDir) {
			
			if(err) {
				alert(err.message);
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
			
			var worker = childProcess.fork(buildScript, [source, destination], {
				cwd: workingDir,
				env: {"NODE_PATH": node_modules}, // Tell node runtime to check for modules in this folder
			});
			
			// PS. It's impossible to caputre stdout and stderr from the fork. You'll have to use process.send() to send message back here
			
			worker.on('message', function worker_message(data) {
				//alert(data);
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
					alert(data.stack);
				}
				else throw new Error("Unknown message from worker: " + JSON.stringify(data));
				
			});
			worker.on('error', function worker_error(code) {
				console.warn("SSG: Error code=" + code);
				alert("SSG worker error code=" + code);
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
					if(err) throw err;
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
					if(err) throw err;
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
	
})();