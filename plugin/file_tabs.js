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
		
		var key_pageUP = 33;
		var key_pageDown = 34;
		
		editor.bindKey({desc: "Switch tab to last active tab", charCode: 9, combo: CTRL, fun: switchTab}); // Ctrl + tab
		
		editor.bindKey({desc: "Move current tab to the left", charCode: key_pageUP, combo: CTRL + SHIFT, fun: orderTabLeft});
		editor.bindKey({desc: "Move current tab to the right", charCode: key_pageDown, combo: CTRL + SHIFT, fun: orderTabRight});
		// todo: implement tab drag and drop to change order
		
		editor.bindKey({desc: "Switch tab to the tab to the left", charCode: key_pageUP, combo: CTRL, fun: switchTabLeft});
		editor.bindKey({desc: "Switch tab to the tab to the right", charCode: key_pageDown, combo: CTRL, fun: switchTabRight});
		
		
		
		editor.resizeNeeded(); // Resize at least once after the editor has loaded, or we wont have data for screen with etc.
		
	}
	
	function switchTabLeft() {
		var list = editor.sortFileList(); // Array sorted by file.order
		list.sort(sortListByFolder);
		if(editor.currentFile.order == 0) {
			editor.showFile(list[list.length-1]); // Show the last file
		}
		else if(list.length > 0) {
			for(var i=0; i<list.length; i++) {
				if(list[i] == editor.currentFile) break;
			}
			editor.showFile(list[i-1]); // Show the file to the left
		}
		return false;
	}
	
	function switchTabRight() {
		var list = editor.sortFileList(); // Array sorted by file.order
		/*
for(var i=0; i<list.length; i++) {
			console.log(i + ": " + list[i].path);
			}
		console.log("efter");
		*/
		list.sort(sortListByFolder);
		if(editor.currentFile.order == (list.length-1)) {
			editor.showFile(list[0]); // Show the first file
		}
		else if(list.length > 0) {
			for(var i=0; i<list.length; i++) {
				//console.log(i + ": " + list[i].path);
				if(list[i] == editor.currentFile) break;
			}
			console.log(" i=" + i + " / " + (list.length-1));
			editor.showFile(list[i+1]); // Show the file to the right
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
		
		editor.currentFile.order-=1.5;
		/*
		var currentFileFolder = getFolder(editor.currentFile.path)
		var folder;
		if(currentFileFolder) {
			for(var filePath in editor.files) {
				folder = getFolder(filePath);
				if(folder && folder == currentFileFolder) editor.files[filePath].order--;
			}
		}
		else {
			editor.currentFile.order--;
		}
		*/
		buildTabs(); // sorts again
		
		return false;
		
	}
	
	function orderTabRight() {
		console.log("Orderright");
		
		editor.currentFile.order+=1.5;
		/*
		var currentFileFolder = getFolder(editor.currentFile.path)
		var folder;
		if(currentFileFolder) {
			for(var filePath in editor.files) {
				folder = getFolder(filePath);
				if(folder && folder == currentFileFolder) editor.files[filePath].order++;
			}
		}
		else {
			editor.currentFile.order++;
		}
		*/
		buildTabs(); // sorts again
		
		return false;
	}
	
	
	
	function switchTab() {
		// Open last file
		
		if(editor.lastFile == editor.currentFile) throw new Error("editor.lastFile = editor.currentFile = " + editor.currentFile.path);
		
		if(editor.lastFile) editor.showFile(editor.lastFile);
		else console.warn("No file to switch to!");
		
		return false;
		
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
		
		if(!el) {
			// Most likely the file was closed before the "finish saving" event listeners was called
			console.warn("Saving '" + file.path + "', but it doesn't exist in file tabs!");
			return true;
		}
		
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
			throw new Error("Trying to swith to a file that is not open! path=" + path);
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
		
		console.log(UTIL.getStack("Building tabs ..."));
		
		var tabList = document.getElementById("tabList");
		
		if(tabList !== null) {
			// Empty the list
			while(tabList.firstChild ) {
			  tabList.removeChild( tabList.firstChild );
			}
		}
		
		var fileList = editor.sortFileList(); // An array of files sorted by file.order
		
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
	
	// ## Tests
	
	editor.addTest(function changeFileTabOrder(callback) {
		// Close all open files
		for(var path in editor.files) {
			editor.closeFile(path);
		}
		
		// Open test files
		editor.openFile("dirA/File1", 'File1', function(err, file) {
			editor.openFile("dirA/File2", 'File2', function(err, file) {
				editor.openFile("dirB/File3", 'File3', function(err, file) {
					editor.openFile("dirB/File4", 'File4', function(err, file) {
						editor.openFile("dirB/File5", 'File5', function(err, file) {
							var list;
							
							editor.currentFile = editor.files["dirB/File5"];
							
							console.log("order=" + editor.currentFile.order);
							
							editor.currentFile.order-=1.5;
							list = editor.sortFileList();
							if(list[3].path != "dirB/File5") throw new Error("dirB/File5 should be fourh! list=" + JSON.stringify( list.map(function(file){return file.path}) )  );
					
					editor.currentFile.order-=1.5;
					list = editor.sortFileList();
							if(list[2].path != "dirB/File5") throw new Error("dirB/File5 should be third! list=" + JSON.stringify( list.map(function(file){return file.path}) ));
							
							editor.currentFile.order-=1.5;
							list = editor.sortFileList();
							if(list[1].path != "dirB/File5") throw new Error("dirB/File5 should be second! list=" + JSON.stringify( list.map(function(file){return file.path}) ));
							
							editor.currentFile.order-=1.5;
							list = editor.sortFileList();
							if(list[0].path != "dirB/File5") throw new Error("dirB/File5 should be first! list=" + JSON.stringify( list.map(function(file){return file.path}) ));
							
					// Close test files
					for(var path in editor.files) {
						editor.closeFile(path);
					}
					
					callback(true);
					
				});
				});
			});
		});
		});
		
	});
	
	
})();