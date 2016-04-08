(function() {
	/*
	
		Show open files as tabs.
		
		This plugin should be "dumb". Let the editor or other plugins decide what file to open if one is closed
		
		Switch between last viewed file using Ctrl+T
		
	*/
	
	"use strict";
	
	//var fileList = []; // Temporary array copy of opened files!?
	
	
	editor.on("start", file_tabs);

	
	function file_tabs() {

		buildTabs();
		
		editor.on("fileOpen", tabFileOpen, 2);
		editor.on("fileClose", closeFile_tabs, 2);
		editor.on("fileChange", tabFileChange);
		editor.on("fileSave", tabFileSave);
		editor.on("fileShow", tabFileShow);
		
		editor.keyBindings.push({charCode: 9, combo: CTRL, fun: switchTab}); // Ctrl + tab

		editor.keyBindings.push({charCode: 37, combo: CTRL + ALT, fun: orderLeft}); // Ctrl + alt + left
		editor.keyBindings.push({charCode: 39, combo: CTRL + ALT, fun: orderRight}); // Ctrl + alt + right
		// toto: implement tab drag and drop to change order
		
		editor.resizeNeeded(); // Resize at least once after the editor has loaded, or we wont have data for screen with etc.
		
	}
	
	function orderLeft() {
		
		console.log("Orderleft");
		
		editor.currentFile.order-=1.5;

		buildTabs(); // sorts again
	}
	
	function orderRight() {
		console.log("Orderright");

		editor.currentFile.order+=1.5;

		buildTabs(); // sorts again
	}
	
	
	
	function switchTab() {
		// Open last file
		
		if(editor.lastFile == editor.currentFile) console.error(new Error("editor.lastFile = editor.currentFile = " + editor.currentFile.path));
		
		if(editor.lastFile) editor.showFile(editor.lastFile);
		else console.warn("No file to switch to!");
		}
	
	function tabFileChange(file, change, text, index, row, col) {
		
		var el = document.getElementById("tabFileItem_" + file.path);
		
		showUnsavedStatus(el);
		
	}
	
	function showUnsavedStatus(el) {
		// What will happen when the file is unsaved:
		el.style.fontWeight = "bold";
	}
	
	function tabFileSave(file) {
		var el = document.getElementById("tabFileItem_" + file.path);
		
		if(!el) console.error(new Error("Saving '" + file.path + "', but it doesn't exist in file tabs!"));
		
		// What will happen when the file is saved:
		el.style.fontWeight = "normal";
		
		
		var closeFileButton = document.getElementById("close_" + file.path);
		
		closeFileButton.setAttribute("class", "closeFileTab");

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
		
		editor.renderNeeded();
		editor.resizeNeeded();
		
	}
	
	
	function switchToFile(path) {
		
		if(!editor.files.hasOwnProperty(path)) {
			console.error(new Error("Trying to swith to a file that is not open! path=" + path));
			return;
		}
		
		console.log("Swithing to " + path);
		
		editor.showFile(editor.files[path]);
		
		/*
		buildTabs();
		
		editor.resizeNeeded();
		editor.renderNeeded();
*/
		console.log("Switched file to: " + path);

		
	}
	

	function buildTabs(excludeFile) {
		
		console.log(editor.getStack("Building tabs ..."));
		
		var tabList = document.getElementById("tabList");
		
		if(tabList !== null) {
			// Empty the list
			while(tabList.firstChild ) {
			  tabList.removeChild( tabList.firstChild );
			}
		}
		
		var fileList = editor.sortFileList(); // An array of files sorted by file.order
		
		if(excludeFile) {
			if(fileList.indexOf(excludeFile) == -1) console.error(new Error("The file we want to exclude is not in the file list! excludeFile.path=" + excludeFile.path));
			
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
		
		if(path == undefined) console.error(new Error("Path is undefined!"));
		
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
		var active = editor.currentFile ? (editor.currentFile.path==path) : false;
		
	
		console.log("path=" + path + " active=" + active);

		
		if(!tabList) createTabList();
		
		//if(fileName == "file2.txt") active = true;
		
		var tabFileItem = document.createElement("li");
		
		tabFileItem.setAttribute("class", "tabFileItem");
		tabFileItem.setAttribute("title", path);
		tabFileItem.setAttribute("id", "tabFileItem_" + path);
		

		if(editor.files[path].isSaved == false) {
			showUnsavedStatus(tabFileItem)
		}
		
		
		tabFileItem.appendChild(document.createTextNode(fileName));
		tabFileItem.addEventListener("click", clickTab, true);

		var closeFileButton = document.createElement("button");
		closeFileButton.setAttribute("class", "closeFileTab");
		closeFileButton.setAttribute("title", "Close "+ fileName);
		closeFileButton.setAttribute("id", "close_" + path);
		closeFileButton.innerHTML = "&times;"; // x
		closeFileButton.addEventListener("click", closeTab, true); // Stop propagation so that we do not switch to this file.
		// The click goes through anyway for some weird reason ...
		
		tabFileItem.appendChild(closeFileButton);
		
		
		
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
			
			console.log("saved?" + editor.files[path].isSaved);
			console.log("e.ctrlKey?" + e.ctrlKey);
			console.log("closeFileButton=" + closeFileButton);
			console.log("closeFileButton.class=" + closeFileButton.getAttribute("class"));
			
			
			if(!editor.files[path].isSaved && !e.ctrlKey) {
				
				closeFileButton.setAttribute("title", "Ctrl click to close "+ fileName + " without saving");
				
				//closeFileButton.setAttribute("class", "blink closeFileTab ");
				closeFileButton.setAttribute("class", "closeFileTab blink");

				alert("File not saved.\nCtrl click to close without saving.");
				console.log("closeFileButton.class=" + closeFileButton.getAttribute("class"));

				closeFileButton.blur();
				
			}
			else {
				editor.closeFile(path);
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
	
	
})();