(function() {
	/*
		
		Show open files as tabs.
		
		This plugin should be "dumb". Let the editor or other plugins decide what file to open if one is closed
		
		Switch between last viewed file using Ctrl+T
		
		todo: Clean up global variables
		
		todo: Make into a plugin
		
	*/
	
	"use strict";
	
	//var fileList = []; // Temporary array copy of opened files!?
	
	//if(QUERY_STRING["embed"]) return;
	
	var fileTabsActive = true;
	
	if(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("file_tabs") != -1) {
		var fileTabsActive = false;
	}
	
	
	var winMenuLastTab, winMenuMoveTabLeft, winMenuMoveTabRight, winMenuTabLeft, winMenuTabRight, winMenuToggleFileTabs;
	
	EDITOR.on("start", file_tabs);
	
	function file_tabs() {
		
		winMenuToggleFileTabs = EDITOR.windowMenu.add("File tabs", ["View", 8], toggleFileTabs);
		
		if(!fileTabsActive) return;
		winMenuToggleFileTabs.activate();
		
		console.log("Loading file_tabs ...");
		
		buildTabs();
		
		EDITOR.on("fileOpen", tabFileOpen, 2);
		EDITOR.on("fileClose", closeFile_tabs, 2);
		EDITOR.on("fileChange", tabFileChange);
		EDITOR.on("afterSave", tabFileSave);
		EDITOR.on("fileShow", tabFileShow);
		
		var key_pageUP = 33;
		var key_pageDown = 34;
		
		EDITOR.bindKey({desc: "Switch tab to last active tab", charCode: 9, combo: CTRL, fun: switchTab}); // Ctrl + tab
		
		EDITOR.bindKey({desc: "Move current tab to the left", charCode: key_pageUP, combo: CTRL + SHIFT, fun: orderTabLeft});
		EDITOR.bindKey({desc: "Move current tab to the right", charCode: key_pageDown, combo: CTRL + SHIFT, fun: orderTabRight});
		// todo: implement tab drag and drop to change order
		
		EDITOR.bindKey({desc: "Switch tab to the tab to the left", charCode: key_pageUP, combo: CTRL, fun: switchTabLeft});
		EDITOR.bindKey({desc: "Switch tab to the tab to the right", charCode: key_pageDown, combo: CTRL, fun: switchTabRight});
		
		winMenuLastTab = EDITOR.windowMenu.add("Switch to last active file", ["View", 5], switchTab);
		winMenuMoveTabLeft = EDITOR.windowMenu.add("Move tab left", ["View", 5], orderTabLeft, "top");
		winMenuMoveTabRight = EDITOR.windowMenu.add("Move tab right", ["View", 5], switchTabRight);
		winMenuTabLeft = EDITOR.windowMenu.add("Switch to left tab", ["View", 5], switchTabLeft);
		winMenuTabRight = EDITOR.windowMenu.add("Switch to right tab", ["View", 5], switchTabRight, "bottom");
		
		EDITOR.registerAltKey({char: "space", alt:1, label: "Previous file/tab", fun: switchTab});
		
		EDITOR.resizeNeeded(); // Resize at least once after the editor has loaded, or we wont have data for screen with etc.
		
	}
	
	function toggleFileTabs() {
		if(fileTabsActive) hideFileTabs();
		else showFileTabs();
	}
	
	function hideFileTabs() {
		var header = document.getElementById("header");
		var tabList = document.getElementById("tabList");
		
		if(tabList && tabList.parentNode == header) header.removeChild(tabList);
		fileTabsActive = false;
		
		winMenuToggleFileTabs.deactivate();
		
		EDITOR.resizeNeeded();
	}
	
	function showFileTabs() {
		buildTabs();
		fileTabsActive = true;
		winMenuToggleFileTabs.activate();
		EDITOR.resizeNeeded();
	}
	
	function switchTabLeft() {
		var list = EDITOR.sortFileList(); // Array sorted by file.order
		list.sort(sortListByFolder);
		if(EDITOR.currentFile.order == 0) {
			EDITOR.showFile(list[list.length-1]); // Show the last file
		}
		else if(list.length > 0) {
			for(var i=0; i<list.length; i++) {
				if(list[i] == EDITOR.currentFile) break;
			}
			EDITOR.showFile(list[i-1]); // Show the file to the left
		}
		return false;
	}
	
	function switchTabRight() {
		var list = EDITOR.sortFileList(); // Array sorted by file.order
		/*
			for(var i=0; i<list.length; i++) {
			console.log(i + ": " + list[i].path);
			}
			console.log("efter");
		*/
		list.sort(sortListByFolder);
		if(EDITOR.currentFile.order == (list.length-1)) {
			EDITOR.showFile(list[0]); // Show the first file
		}
		else if(list.length > 0) {
			for(var i=0; i<list.length; i++) {
				//console.log(i + ": " + list[i].path);
				if(list[i] == EDITOR.currentFile) break;
			}
			console.log(" i=" + i + " / " + (list.length-1));
			EDITOR.showFile(list[i+1]); // Show the file to the right
		}
		return false;
	}
	
	function sortListByFolder(a, b) {
		var fA = getFolder(a.path);
		var fB = getFolder(b.path);
		if(!document.getElementById("tab_folder_" + fA) || !document.getElementById("tab_folder_" + fB) ) {
			if(a.order > b.order) return 1
			else if(b.order > a.order) return -1
			else return 0;
		}
		if(fA > fB) return 1 + (a.order-b.order)
		else if(fB > fA) return -1 +  + (a.order-b.order)
		else return 0;
	}
	
	function getFolder(path) {
		var folderSeparator = path.indexOf("\\") > -1 ? "\\" : "/";
		var folders = path.split(folderSeparator);
		if(folders.length >= 2) { // foo/bar.txt
			return folders[folders.length-2];
		}
		else {
			return null;
		}
	}
	
	function orderTabLeft() {
		
		//orderFilesByFolder();
		
		console.log("Orderleft");
		
		EDITOR.currentFile.order-=1.5;
		/*
			var currentFileFolder = getFolder(EDITOR.currentFile.path)
			var folder;
			if(currentFileFolder) {
			for(var filePath in EDITOR.files) {
			folder = getFolder(filePath);
			if(folder && folder == currentFileFolder) EDITOR.files[filePath].order--;
			}
			}
			else {
			EDITOR.currentFile.order--;
			}
		*/
		buildTabs(); // sorts again
		
		return false;
		
	}
	
	function orderTabRight() {
		console.log("Orderright");
		
		EDITOR.currentFile.order+=1.5;
		/*
			var currentFileFolder = getFolder(EDITOR.currentFile.path)
			var folder;
			if(currentFileFolder) {
			for(var filePath in EDITOR.files) {
			folder = getFolder(filePath);
			if(folder && folder == currentFileFolder) EDITOR.files[filePath].order++;
			}
			}
			else {
			EDITOR.currentFile.order++;
			}
		*/
		buildTabs(); // sorts again
		
		return false;
	}
	
	
	
	function switchTab() {
		// Open last file
		
		if(EDITOR.lastFileShowed == EDITOR.currentFile) throw new Error("EDITOR.lastFileShowed = EDITOR.currentFile = " + EDITOR.currentFile.path);
		
		if(EDITOR.lastFileShowed) EDITOR.showFile(EDITOR.lastFileShowed);
		else console.warn("No file to switch to!");
		
		return false;
		
	}
	
	function tabFileChange(file, change, text, index, row, col) {
		
		var el = document.getElementById("tabFileItem_" + file.path);
		
		if(!el) throw new Error("Unable to find tab for file.path=" + file.path); // Possible due to tab being closed
		
		showUnsavedStatus(el);
		
	}
	
	function showUnsavedStatus(el) {
		// What will happen when the file is unsaved:
		el.style.fontWeight = "bold";
	}
	
	function tabFileSave(file) {
		var el = document.getElementById("tabFileItem_" + file.path);
		
		if(!el) {
			// Most likely the file was closed before the "finish saving" event listeners was called
			console.warn("Saving '" + file.path + "', but it doesn't exist in file tabs!");
			return true;
		}
		
		// What will happen when the file is saved:
		el.style.fontWeight = "normal";
		
		
		var closeFileButton = document.getElementById("close_" + file.path);
		
		closeFileButton.setAttribute("class", "closeFileTab");
		
		return true;
	}
	
	
	function tabFileOpen(file) {
		
		buildTabs();
		
		// Switch to the file we just loaded
		//switchToFile(file.path);
	}
	
	function tabFileShow(file) {
		buildTabs();
	}
	
	function closeFile_tabs(file) {
		
		console.log("closing " + file.path);
		
		buildTabs(file);
		
		EDITOR.renderNeeded();
		EDITOR.resizeNeeded();
		
	}
	
	
	function switchToFile(path) {
		EDITOR.ctxMenu.hide();
		EDITOR.dashboard.hide(); // Hide dashboard when switching to a file
		
		if(!EDITOR.files.hasOwnProperty(path)) {
			throw new Error("Trying to swith to a file that is not open! path=" + path);
			return;
		}
		
		console.log("Swithing to " + path);
		
		EDITOR.showFile(EDITOR.files[path]);
		
		/*
			buildTabs();
			
			EDITOR.resizeNeeded();
			EDITOR.renderNeeded();
		*/
		console.log("Switched file to: " + path);
		
		
	}
	
	
	function buildTabs(excludeFile) {
		
		console.log(UTIL.getStack("Building tabs ..."));
		
		var tabList = document.getElementById("tabList");
		
		if(tabList !== null) {
			// Empty the list
			while(tabList.firstChild ) {
				tabList.removeChild( tabList.firstChild );
			}
		}
		
		var fileList = EDITOR.sortFileList(); // An array of files sorted by file.order
		
		if(excludeFile) {
			if(fileList.indexOf(excludeFile) == -1) throw new Error("The file we want to exclude is not in the file list! excludeFile.path=" + excludeFile.path);
			
			var removed = fileList.splice(fileList.indexOf(excludeFile), 1);
			
			console.log("Excluded removed.path=" + removed.path);
		}
		else {
			console.log("No file will be excluded!");
		}
		
		// Create tabs
		for(var i=0; i<fileList.length; i++) {
			console.log("file_tab_" + i + "=" + fileList[i].path);
			openTab(fileList[i].path);
		}
		
	}
	
	
	function openTab(path) {
		
		if(path == undefined) throw new Error("Path is undefined!");
		
		console.log("openTab: " + path);
		
		var header = document.getElementById("header");
		var tabList = document.getElementById("tabList");
		var folderSeparator = path.indexOf("\\") > -1 ? "\\" : "/";
		var folders = path.split(folderSeparator);
		var folderName = "";
		var fileName = path.substring(path.lastIndexOf(folderSeparator)+1, path.lenght);
		var folderList;
		var single = ""; // Single file in tabgroup
		var tabFolderItem;
		var active = EDITOR.currentFile ? (EDITOR.currentFile.path==path) : false;
		
		
		console.log("path=" + path + " active=" + active);
		
		
		if(!tabList) createTabList();
		
		//if(fileName == "file2.txt") active = true;
		
		var tabFileItem = document.createElement("li");
		
		tabFileItem.setAttribute("class", "tabFileItem");
		tabFileItem.setAttribute("title", path);
		tabFileItem.setAttribute("id", "tabFileItem_" + path);
		
		
		if(EDITOR.files[path].isSaved == false) {
			showUnsavedStatus(tabFileItem)
		}
		
		var closeFileButton = document.createElement("button");
		closeFileButton.setAttribute("class", "closeFileTab");
		closeFileButton.setAttribute("title", "Close "+ fileName);
		closeFileButton.setAttribute("id", "close_" + path);
		closeFileButton.innerHTML = "&times;"; // x
		closeFileButton.addEventListener("click", closeTab, true); // Stop propagation so that we do not switch to this file.
		// The click goes through anyway for some weird reason ...
		
		tabFileItem.appendChild(closeFileButton);
		
		
		var tabFileText = document.createElement("a");
		tabFileText.innerText = fileName;
		
		//tabFileItem.appendChild(document.createTextNode(fileName));
		tabFileItem.appendChild(tabFileText);
		tabFileItem.addEventListener("click", clickTab, true);
		
		
		if(folders.length > 1) {
			folderName = folders[folders.length-2];
		}
		else {
			folderName = fileName;
		}
		
		folderList = document.getElementById("tab_folder_list_" + folderName);
		tabFolderItem = document.getElementById("tab_folder_" + folderName);
		
		if(!folderList) {
			createFolder(folderName);
			single = " single";
		}
		else {
			single = "";
		}
		
		folderList.appendChild(tabFileItem);
		
		if(active) {
			
			// Make last active tab inactive!??
			
			folderList.setAttribute("class", "folderFileList active");
			
			tabFileItem.setAttribute("class", "tabFileItem active");
			
			tabFolderItem.setAttribute("class", "tabFolderItem active" + single);
			
			console.log("tabFolderItem.class=" + tabFolderItem.getAttribute("class"));
			
		}
		else {
			tabFolderItem.setAttribute("class", "tabFolderItem" + single);
			tabFileItem.setAttribute("class", "tabFileItem");
			
		}
		
		/*
			If one childtab is active, the parent (tabFileItem) should also be active!
		*/
		var childNodes = folderList.childNodes;
		
		for(var i=0; i<childNodes.length; i++) {
			if(childNodes[i].getAttribute("class").indexOf("active") > -1) {
				tabFolderItem.setAttribute("class", "tabFolderItem active" + single);
			}
		}
		
		
		
		function createFolder(folderName) {
			tabFolderItem = document.createElement("li");
			tabFolderItem.setAttribute("class", "tabFolderItem");
			tabFolderItem.setAttribute("id", "tab_folder_" + folderName);
			
			folderList = document.createElement("ul");
			folderList.setAttribute("class", "folderFileList");
			folderList.setAttribute("id", "tab_folder_list_" + folderName);
			
			tabFolderItem.appendChild(document.createTextNode(folderName));
			tabFolderItem.appendChild(folderList);
			
			tabList.appendChild(tabFolderItem);
			
		}
		
		function closeTab(e) {
			var closeFileButton = e.target;
			
			console.log("Closing tab for path=" + path);
			
			console.log("saved?" + EDITOR.files[path].isSaved);
			console.log("e.ctrlKey?" + e.ctrlKey);
			console.log("closeFileButton=" + closeFileButton);
			console.log("closeFileButton.class=" + closeFileButton.getAttribute("class"));
			
			
			if(!EDITOR.files[path].isSaved && !e.ctrlKey) {
				
				closeFileButton.setAttribute("title", "Ctrl click to close "+ fileName + " without saving");
				
				//closeFileButton.setAttribute("class", "blink closeFileTab ");
				closeFileButton.setAttribute("class", "closeFileTab blink");
				
				var yes = "Ignore changes";
				var no = "Don't close!"
				confirmBox("The file is not saved. Are you sure you want to close it !?\n(Ctrl click to close without saving)", [yes, no], function(answer) {
					
					if(answer == yes) {
						EDITOR.closeFile(path);
					}
					closeFileButton.setAttribute("class", "closeFileTab blink");
					
				});
				
				//alertBox("File not saved.\nCtrl click to close without saving.");
				console.log("closeFileButton.class=" + closeFileButton.getAttribute("class"));
				
				closeFileButton.blur();
				
			}
			else {
				EDITOR.closeFile(path);
			}
			
			return false;
			
		}
		
		function clickTab() {
			switchToFile(path);
		}
		
		function createTabList() {
			tabList = document.createElement("ul");
			tabList.setAttribute("id", "tabList");
			tabList.setAttribute("class", "tabList");
			
			tabList.setAttribute("class", "noselect"); // Disable text selecting
			
			
			header.appendChild(tabList);
			
			
		}
		
	}
	
	// TEST-CODE-START
	
	// ## Tests
	
	// Run this early, so it doesn't also fail if another test fails
	EDITOR.addTest(100, function changeFileTabOrder(callback) {
		// Close all open files
		for(var path in EDITOR.files) {
			EDITOR.closeFile(path);
		}
		
		var testFiles = ["dirA/File0", "dirA/File1", "dirB/File2", "dirB/File3", "dirB/File4"];
		
		// Open test files
		EDITOR.openFile(testFiles[0], 'File0', function(err, file) {
			EDITOR.openFile(testFiles[1], 'File1', function(err, file) {
				EDITOR.openFile(testFiles[2], 'File2', function(err, file) {
					EDITOR.openFile(testFiles[3], 'File3', function(err, file) {
						EDITOR.openFile(testFiles[4], 'File4', function(err, file) {
							
							var waitCounter = 0;
							wait();
							
							function wait() {
								if(waitCounter++ > 1000) throw new Error("Waiting for other files to close before running file-order test max waitCounter=" + waitCounter + " reached! ");
								
								var list = EDITOR.sortFileList();
								for(var i=0; i<list.length; i++) {
									if(list[i].path != testFiles[i]) {
										console.log("Waiting for file to close: " + list[i].path);
										return setTimeout(wait, 100);
									}
								}
								console.log("No unknown files found. Running test ...");
								return tryOrder();
							}
							
							function tryOrder() {
								
								EDITOR.currentFile = EDITOR.files["dirB/File4"];
								
								console.log("order=" + EDITOR.currentFile.order);
								
								var list = EDITOR.sortFileList();
								
								if(list.length != 5) throw new Error("Unknow file in file list: " + JSON.stringify(  list.map(function(file){return file.path})  )); // We are insane! (JavaScript should be single threaded)
								
								EDITOR.currentFile.order-=1.5;
								var listA = EDITOR.sortFileList();
								if(listA[3].path != "dirB/File4") throw new Error("dirB/File4 should be fourh! listA=" + JSON.stringify( listA.map(function(file){return file.path}) )  );
								
								EDITOR.currentFile.order-=1.5;
								var listB = EDITOR.sortFileList();
								if(listB[2].path != "dirB/File4") throw new Error("dirB/File4 should be third! listB=" + JSON.stringify( listB.map(function(file){return file.path}) ));
								
								EDITOR.currentFile.order-=1.5;
								var listC = EDITOR.sortFileList();
								if(listC[1].path != "dirB/File4") throw new Error("dirB/File4 should be second! listC=" + JSON.stringify( listC.map(function(file){return file.path}) ));
								
								EDITOR.currentFile.order-=1.5;
								var listD = EDITOR.sortFileList();
								if(listD[0].path != "dirB/File4") throw new Error("dirB/File4 should be first! listD=" + JSON.stringify( listD.map(function(file){return file.path}) ));
								
								// Close test files
								for(var path in EDITOR.files) {
									EDITOR.closeFile(path);
								}
								
								callback(true);
							}
							
						});
					});
				});
			});
		});
	}); 
	
	// TEST-CODE-END
	
})();
