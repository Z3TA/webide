(function() {
	/*
		Only show the file explorer explicity. The screen cant have too much information or the brain will get burnt out ...
		
		todo: File watcher, update the list when file change names, or are created/removed
		(currently you can refresh the file lists by hiding and then showing it)
		
		▶ (too big)
		▼
		► (use this)
	*/
	
	"use strict;"
	
	//if(QUERY_STRING["embed"]) return;
	
	var fileExplorerFolders;
	var fileExplorerWrap;
	var fileExplorerHeader;
	var leftColumn, rightColumn;	
	var visible = false;
	var menuItem;
	var defaultScroll = 0;
	var fsSelect;
	var openFolders = [];
	var maxNameLength = 40;
	var lastMovedFrom = "";
	var lastMovedTo = "";
	var lastPathExplored = "";
	var extractableFileTypes = ["zip", "rar", "gz", "tar.gz", "tgz"];
	var hideButton;
	var loadingSpinner;
	var winMenuFileExplorer;
	var discoveryBarImage;
	
	EDITOR.plugin({
		desc: "File explorer window widget",
		load: load,
		unload: unload,
		order: 500 // functionList: 200, (a higher number makes it start later)
	});
	
	function load() {
		
		console.log("Initiating file explorer");
		
		var key_E = 69;
		
		EDITOR.bindKey({desc: "File explorer", charCode: key_E, combo: CTRL, fun: toggleFileExplorerFromKeyboardCombo});
		
		EDITOR.on("fileExplorer", openFileExplorerTool);
		EDITOR.on("move", fileExplorerFileMoved);
		
		//EDITOR.on("beforeResize", saveScrollPosition);
		//EDITOR.on("afterResize", restoreScrollPosition);
		
		// EDITOR.on("changeWorkingDir", exploreDir);
		
		menuItem = EDITOR.ctxMenu.add("File explorer", toggleFileExplorerFromContextMenu, 9);
		
		winMenuFileExplorer = EDITOR.windowMenu.add("File explorer", ["View", 70], toggleFileExplorerFromWindowMenu);
		
		EDITOR.registerAltKey({char: "0", alt:1, label: "File Explorer", fun: toggleFileExplorerFromVirtualKeyboard});
		
		
		leftColumn = document.getElementById("leftColumn");
		rightColumn = document.getElementById("rightColumn");
		
		fileExplorerWrap = document.createElement("div");
		fileExplorerWrap.setAttribute("class", "wrap fileExplorer");
		fileExplorerWrap.setAttribute("id", "fileExplorer");
		
		fileExplorerHeader = document.createElement("div");
		fileExplorerHeader.setAttribute("class", "fileExplorer header");
		
		fileExplorerFolders = document.createElement("div");
		fileExplorerFolders.setAttribute("id", "fileExplorerFolders");
		
		fsSelect = document.createElement("select");
		fsSelect.setAttribute("id", "fsSelect");
		fsSelect.setAttribute("class", "select");
		fsSelect.onchange = changeFs;
		
		/*
			fileExplorer.addEventListener("scroll", function() {
			console.log(UTIL.getStack("You scrolled"));
			});
		*/
		

		loadingSpinner = document.createElement("div");
		loadingSpinner.setAttribute("class", "spinner fileExplorer loaderSpinner");
		
		fileExplorerHeader.appendChild(fsSelect);
		fileExplorerWrap.appendChild(fileExplorerHeader);
		
		fileExplorerWrap.appendChild(loadingSpinner);

		fileExplorerWrap.appendChild(fileExplorerFolders);
		rightColumn.appendChild(fileExplorerWrap);
		
		//exploreDir(EDITOR.workingDirectory);
		
		discoveryBarImage = document.createElement("img");
		discoveryBarImage.src = "gfx/data.svg"; // Icon created by: https://www.flaticon.com/authors/phatplus
		discoveryBarImage.title = "File explorer (" + EDITOR.getKeyFor(toggleFileExplorerFromKeyboardCombo) + ")"
		discoveryBarImage.onclick = toggleFileExplorerFromDiscoveryBar;
		EDITOR.discoveryBar.add(discoveryBarImage, 10);
		
		toggleFileExplorer(visible);
		
	}
	
	function unload() {
		
		EDITOR.exitFullScreenWidget(fileExplorerWrap);
		
		rightColumn.removeChild(fileExplorerWrap);
		
		EDITOR.ctxMenu.remove(menuItem);
		
		EDITOR.windowMenu.remove(winMenuFileExplorer);
		
		EDITOR.unregisterAltKey(toggleFileExplorerFromVirtualKeyboard);
		
		EDITOR.unbindKey(toggleFileExplorerFromKeyboardCombo);
		
		EDITOR.removeEvent("fileExplorer", openFileExplorerTool);
		EDITOR.removeEvent("move", fileExplorerFileMoved);
		
		if(typeof gapi == "object" && typeof gapi.auth2 == "object") {
gapi.auth2.getAuthInstance().signOut();
		}
	}
	
	function toggleFileExplorerFromWindowMenu() {
		toggleFileExplorer();
		EDITOR.stat("toggleFileExplorerFromWindowMenu");
	}
	
	function toggleFileExplorerFromVirtualKeyboard() {
		toggleFileExplorer();
		EDITOR.stat("toggleFileExplorerFromVirtualKeyboard");
	}
	
	function toggleFileExplorerFromKeyboardCombo() {
		toggleFileExplorer();
		EDITOR.stat("toggleFileExplorerFromKeyboardCombo");
		return PREVENT_DEFAULT;
	}
	
	function toggleFileExplorerFromDiscoveryBar() {
		toggleFileExplorer();
		EDITOR.stat("toggleFileExplorerFromDiscoveryBar");
	}
	
	function toggleFileExplorerFromContextMenu() {
		toggleFileExplorer();
		EDITOR.stat("toggleFileExplorerFromContextMenu");
	}
	
	function updateSigninStatus(isSignedIn) {
		console.log("gapi isSignedIn=" + isSignedIn);
	}
	
	function fileExplorerFileMoved(from, to) {
		
		var item = document.getElementById(from);
		
		if(item) {
			item.parentNode.removeChild(item);
		}
		// Just remove the item for now
		
		if(openFolders.indexOf(from) != -1) openFolders.splice(openFolders.indexOf(from), 1);
		
		return true;
	}
	
	function openFileExplorerTool(directory) {
		// The user wants to explore ...
		// ATM this is the only file explorer, so always take the job!
		
		console.log("openFileExplorerTool: directory=" + directory);
		
		if(typeof directory == "string") {
EDITOR.changeWorkingDir(directory);
		
		}
		toggleFileExplorer(true, directory);
		return true; 
	}
	
	function toggleFileExplorer(toState, dirToExplore) {
		
		EDITOR.ctxMenu.hide();
		
		//alertBox("toState=" + toState);
		
		if(typeof toState == "boolean") visible = toState;
		else visible = visible ? false : true; // Switch
		
		//menuItem.innerHTML = "File explorer " + (visible ? "off":"on");
		EDITOR.ctxMenu.update(menuItem, visible, "File explorer");
		
		if(visible) {
			
			if(typeof dirToExplore == "string") {
				var pathToExplore = dirToExplore;
			}
			else if(EDITOR.currentFile && EDITOR.currentFile.savedAs) {
				var pathToExplore = UTIL.getDirectoryFromPath(EDITOR.currentFile.path);
			}
			else if(lastPathExplored.indexOf(EDITOR.workingDirectory) == 0) {
				var pathToExplore = lastPathExplored;
			}
			else {
				var pathToExplore = EDITOR.workingDirectory;
			}
			
			console.log("pathToExplore=" + pathToExplore + " lastPathExplored=" + lastPathExplored + " EDITOR.workingDirectory=" + EDITOR.workingDirectory);
			
			exploreDir(pathToExplore);
			
			loadingSpinner.style.display="block";
			
			fileExplorerWrap.style.display="inline-block";
			//fileExplorerWrap.style.width="auto";
			
			var fileExplorerWidth = fileExplorerWrap.offsetWidth;
			var canvasWidth = EDITOR.view.canvasWidth;
			var pixelRatio = window.devicePixelRatio || 1; // "Retina" displays gives 2
			// Hight pixel density screens will report a bigger screen area then they actually have.
			var windowWidth = window.innerWidth / pixelRatio;
			if(windowWidth < 350) {
EDITOR.fullScreenWidget(fileExplorerWrap);
				if(!hideButton) {
					hideButton = document.createElement("button");
					hideButton.setAttribute("class", "fileExplorer hide");

					hideButton.onclick = function hideFileExplorer() {
						toggleFileExplorer(false);
					};
					hideButton.innerText = "Hide file explorer";

					fileExplorerHeader.insertBefore(hideButton, fileExplorerHeader.firstChild);
				}
			}
			else console.log("fileExplorerWidth=" + fileExplorerWidth + " windowWidth=" + windowWidth + " window.innerWidth=" + window.innerWidth + " pixelRatio=" + pixelRatio);
			
			winMenuFileExplorer.activate();
			
			discoveryBarImage.setAttribute("class", "active");
			
		}
		else {
			
			fileExplorerWrap.style.display="none";
			//fileExplorerWrap.style.width="0px";
			
			EDITOR.exitFullScreenWidget(fileExplorerWrap);
			
			EDITOR.resizeNeeded();
			
			winMenuFileExplorer.deactivate();
			
			discoveryBarImage.setAttribute("class", "");
			
		}
		return false;
	}
	
	function scroll() {
		// Make it center/middle ?? Whole project folder should be visible
		
		fileExplorerWrap.scrollTop = defaultScroll;
		
		console.log("Scrolled down on file explorer: defaultScroll=" + defaultScroll);
	}
	
	function exploreDir(fullPath) {
		
		console.warn("Exploring fullPath=" + fullPath);
		
		while(fileExplorerFolders.firstChild) fileExplorerFolders.removeChild(fileExplorerFolders.firstChild); // Emty list
		
		while(fsSelect.firstChild) fsSelect.removeChild(fsSelect.firstChild); // Emty select options
		
		openFolders.length = 0; // Reset open folders
		
		var domain = document.domain;
		if(domain == "localhost" || domain == "127.0.0.1") {
			var localName = "Local file-system";
		}
		else if(CLIENT.url) {
			// Use the hostname of the server we are connected to
			var loc = UTIL.getLocation(CLIENT.url);
			var localName = (EDITOR.user ? EDITOR.user.name : "") + "@" + loc.host;
		}
		else {
			// Use the hostname
			var localName = window.location.hostname;
		}
		
		// Make a list of connected file-systems
		var option = document.createElement("option");
		option.appendChild(document.createTextNode(localName));
		option.setAttribute("id", "local");
		fsSelect.appendChild(option);
		
		var connName = "";
		for(var conn in EDITOR.connections) {
			option = document.createElement("option");
			connName = EDITOR.connections[conn].protocol.toLowerCase() + "://" + conn
			option.appendChild(document.createTextNode(connName));
			option.setAttribute("id", conn);
			// Select the file-system that we are currently exploring
			console.log("connName=" + connName + " fullPath=" + fullPath);
			if(fullPath.indexOf(connName) == 0) option.setAttribute("selected", "true");
			fsSelect.appendChild(option);
		}
		
		
		// We want to start from the root, then work our way towards fullPath
		
		var folders = UTIL.getFolders(fullPath, true);
		
		//console.log("fullPath=" + fullPath + " folders=" + JSON.stringify(folders));
		
		// Recursive 
		lookUpPath(folders, 0);
		
		function lookUpPath(folders, index, parent) {
			var dir = folders[index];
			console.log("Looking up path dir=" + dir);
			var findDir = index < (folders.length-1) ? folders[index+1] : null;
			
			buildList(dir, parent, findDir, function listBuilt(parent) {
				
				index++;
				
				if(index < folders.length) lookUpPath(folders, index, parent);
				else scrollDownToDir(fullPath);
				
				if(index>2) loadingSpinner.style.display="none"; // Hide the spinner when some objects have loaded
				
			});
		}
		
		function scrollDownToDir(targetPath) {
			// Shroll down the fire explorer div so we can see the folder we are interested in
			// Go though all elements in the list and measure the height until we find target path, then scroll down the height
			
			//while(targetPath.substr(targetPath.length-1) == "/") targetPath = targetPath.substr(0, targetPath.length-1); // Remove trailing slashes
			
			//console.log("targetPath=" + targetPath);
			
			loadingSpinner.style.display="none";
			
			var totalHeight = 0;
			var measuredElements = 0;
			var defaultHeight = 14;
			
			measure(fileExplorerFolders);
			
			function measure(el) {
				//console.log("measuring el=" + el);
				
				var childNodes = el.childNodes;
				if(!childNodes) return false;
				
				var elClass;
				var path;
				var computedStyle;
				var found = false;
				
				for (var i=0; i<childNodes.length; i++) {
					
					if(childNodes[i].nodeType != 1) continue; // Only bother with HTML elements, not text nodes
					
					//console.log("checking childNodes[" + i + "]=" + childNodes[i] + " nodeType=" + childNodes[i].nodeType);
					
					//console.log(childNodes[i]);
					
					elClass = childNodes[i].getAttribute("class");
					
					path = childNodes[i].getAttribute("path");
					
					console.log(targetPath + " == " + path + " ? " + (targetPath == path));
					
					if(path == targetPath) {
						defaultScroll = totalHeight;
						setTimeout(scroll, 100);
						return true; 
					}
					
					if(elClass == "folder open") {
						
						totalHeight += (measuredElements > 0 ? Math.round(totalHeight / ++measuredElements) : defaultHeight);
						//console.log("totalHeight=" + totalHeight);
					}
					
					if(elClass == "tree" || elClass == "folder open") found = measure(childNodes[i])
					else {
						
						if(path == null) continue; // Only measure elements that have path in their attribute
						
						if(elClass != "folder open") {
							computedStyle = window.getComputedStyle(childNodes[i], null);
							
							totalHeight += parseInt(computedStyle.height);
							measuredElements++;
							
							//console.log("totalHeight=" + totalHeight);
						}
					}
					
					if(found) return true;
				}
				return false; // Not found
			}
			
		}
		
	}
	
	function buildList(dir, parent, findDir, callback) {
		
		console.warn("Building file explorer tree for dir=" + dir + " in parent.path=" + (parent ? parent.getAttribute("path") : "(no parent)"));
		
		var dirFound = null;
		
		if(!parent) parent = fileExplorerFolders;
		else {
			// Make the parent folder appear open
			
			// let (aka block scope) only solves a symtom of the bigger problem: 
			// Using varaibles from parent or global scope (dont't do that) 
			// and function scope is probably what you want (not block scope)
			parent.setAttribute("class", "folder open");
			var childNodes = parent.childNodes;
			var box = childNodes[0];
			box.removeChild(box.firstChild);
			box.appendChild(document.createTextNode("▼"));
		}
		
		// Clean the parent node
		//while (parent.firstChild) parent.removeChild(parent.firstChild);
		
		
		var ul = document.createElement("ul");
		ul.setAttribute("class", "tree");
		ul.setAttribute("id", dir + "_items");
		
		// List files in working dir, get name of parent folder
		EDITOR.listFiles(dir, function gotFileList(err, listItems) {
			if(err) {
				// The Google Drive folder can give a bunch of wierd errors when it's not connected
				if(dir.indexOf("/googleDrive") == 0 && openFolders.indexOf(dir) != -1) {
					openFolders.splice(openFolders.indexOf(dir), 1);
					return alertBox("Google Drive error: " + err.message);
				}
				else if(err.code == "EACCES") {
					console.warn("Unable to access " + dir);
					if(callback) callback(dirFound);
return;
				}
				else if(err.code == "LOGIN_NEEDED") {
					alertBox("You need to identify (login) to the server in order to see files.");
					return;
				}
				else {
					console.log("err.code=" + err.code);
					throw err;
				}
			}
			
			listItems.sort(sortByNameAndType);
			
			listItems.forEach(showItem);
			
			parent.appendChild(ul);
			
			EDITOR.resizeNeeded();
			//EDITOR.resize();
			
			
			if(callback) callback(dirFound);
		});
		
		function showItem(item) {
			
			console.log("item.type=" + item.type + " item.name=" + item.name);
			
			var li = document.createElement("li");
			var icon = document.createElement("img");
			var type = "";
			var filetype = UTIL.getFileExtension(item.path) || UTIL.getFileExtension(item.name);
			
			icon.setAttribute("width", "22");
			icon.setAttribute("height", "22");
			icon.setAttribute("draggable", "false");
			
			icon.onerror = function() {
				icon.src = 'gfx/icon/doc.svg';
			}
			
			// 'd' for directory, '-' for file (or 'l' for symlink on *NIX only).
			if(item.type == "d") type = "folder";
			else if(item.type == "-") type = "file";
			else if(item.type == "l") type = "link";
			else if(item.type == "*") type = "problem";
			
			li.setAttribute("path", item.path);
			li.setAttribute("id", item.path);
			
			li.setAttribute("draggable", "true");
			li.ondragstart = dragItem;
			
			if(item.path == findDir || item.name == findDir) dirFound = li;
			
			if(type == "folder") {
				
				li.setAttribute("class", "folder closed");
				
				li.ondrop = dropItem;
				li.ondragover = dragOverItem;
				
				icon.setAttribute("src", "gfx/icon/folder.svg");
				icon.setAttribute("alt", "Folder");
				
				li.addEventListener("click", function(e) {
					openOrCloseFolder(li);
					
					// Try to stop event from propagating down though parents
					e = window.event || e; 
					e.stopPropagation();
					return false; 
					
				}, false);
				
				var box = document.createElement("figure");
				box.setAttribute("class", "closed box");
				
				box.appendChild(document.createTextNode("►"));
				li.appendChild(box);
				
				if(openFolders.indexOf(item.path) != -1) buildList(item.path, li);
				
			}
			else {
				li.setAttribute("class", type); 
				
				var iconName = filetype;
				if(iconName == "htm") iconName = "html";
				
				icon.setAttribute("src", "gfx/icon/" + iconName + ".svg");
				icon.setAttribute("alt", iconName);
				
				if(EDITOR.parseFileExtensionAsCode.indexOf(filetype.toLowerCase()) == -1) {
					icon.style.opacity = 0.5;
				}
				
				//icon.setAttribute("width", "22");
				//icon.setAttribute("height", "22");
				
				li.addEventListener("click", function(e) {
					openFile(li);
					
					e = window.event || e;
					e.stopPropagation();
					e.preventDefault();
					return false;
					
				}, false);
				
			}
			
			li.oncontextmenu = function contextmenu(contextMenuEvent) {
				contextMenuEvent.preventDefault();
				contextMenuEvent.stopPropagation(); // Prevent from bubbling to parent node
				
				showFileItemMenu(li, item);
				
			};
			
			
			var displayName = item.name;
			if(displayName.length > maxNameLength) {
				li.setAttribute("title", displayName);
				displayName = displayName.substr(0, 37) + "...";
			}
			
			li.appendChild(icon);
			
			li.appendChild(document.createTextNode(displayName));
			
			//console.log("item.name=" + item.name);
			
			ul.appendChild(li);
			
		}
		
	}
	
	
	/*
		### Sorting:
		If compareFunction(a, b) is less than 0, sort a to a lower index than b, i.e. a comes first.
		If compareFunction(a, b) returns 0, leave a and b unchanged with respect to each other, but sorted with respect to all different elements. Note: the ECMAscript standard does not guarantee this behaviour, and thus not all browsers (e.g. Mozilla versions dating back to at least 2003) respect this.
		If compareFunction(a, b) is greater than 0, sort b to a lower index than a.
		compareFunction(a, b) must always return the same value when given a specific pair of elements a and b as its two arguments. If inconsistent results are returned then the sort order is undefined.
		
	*/
	
	function sortByNameAndType(a, b) {
		if(a.type == b.type) {
			// Both are the same type, sort alpabetically
			//var aName = a.name.toLowerCase(); // Ignore capitals
			//var bName = b.name.toLowerCase();
			var aName = a.name;
			var bName = b.name;
			if(aName < bName) return -1;
			else if(aName > bName) return 1;
			else return 0;
		}
		else if(a.type == "d") return -1;
		else if(b.type == "d") return 1;
		else return 0;
	}
	
	function showFileItemMenu(el, fsFileItem) {
		
		console.log("showFileItemMenu el=" + el);
		console.log(el);
		
		var fileItemMenuHolder = el;
		var path = el.getAttribute("path");
		var isFolder = UTIL.isDirectory(path);
		
		var fileItemMenu = document.getElementById("fileItemMenu");
		
		hideMenu(); // Hide old one if one exist
		
		fileItemMenu = document.createElement("ul");
		fileItemMenu.setAttribute("id", "fileItemMenu");
		fileItemMenu.setAttribute("class", "fileContextMenu");
		
		var optCancel = document.createElement("li");
		optCancel.innerText = "Cancel";
		optCancel.onclick = hideMenu;
		fileItemMenu.appendChild(optCancel);
		
		if(isFolder) {
			var optCreateFolder = document.createElement("li");
			optCreateFolder.innerText = "new Folder";
			fileItemMenu.appendChild(optCreateFolder);
			optCreateFolder.onclick = function createFolder(clickEvent) {
				clickEvent.preventDefault();
				clickEvent.stopPropagation();

				promptBox("Create new folder (path):", false, path, function(newFolderPath) {
					if(newFolderPath == path) return;
					newFolderPath = UTIL.trailingSlash(newFolderPath);
					if(newFolderPath) CLIENT.cmd("createPath", {pathToCreate: newFolderPath}, function folderCreatedMaybe(err, json) {
						if(err) alertBox(err.message);
						else exploreDir(json.path);
					});
				});
				
				return false;
			}
		}
		
		var optDelete = document.createElement("li");
		optDelete.innerText = "Delete";
		fileItemMenu.appendChild(optDelete);
		optDelete.onclick = function deleteFile(clickEvent) {
			clickEvent.preventDefault();
			clickEvent.stopPropagation();
			
			if(!clickEvent.ctrlKey && isFolder) {
				
				var msg = "Are you sure you want to Delete the entire folder ?\n" + path + "\n\n(Ctrl-click to not show this confirmation next time)";
				var yes = "Yes, delete it";
				var no = "No, do not";
				
				confirmBox(msg, [yes, no], function deleteAnswer(answer) {
					
					if(answer == yes) deleteIt();
					
				});
				
			} else deleteIt();
			
			function deleteIt() {
				el.parentNode.removeChild(el);
				
				if(isFolder) CLIENT.cmd("deleteDirectory", {directory: path, recursive: true}, function(err, json) {
					if(err) alertBox(err.message);
				});
				else EDITOR.deleteFile(path);
			}
			
			return false;
		};
		
		
		var optRename = document.createElement("li");
		optRename.innerText = "Rename";
		fileItemMenu.appendChild(optRename);
		optRename.onclick = function renameFile(clickEvent) {
			clickEvent.preventDefault();
			clickEvent.stopPropagation();
			
			var oldPath = el.getAttribute("path");
			
			promptBox("Rename file:", false, oldPath, function(newPath) {
				if(newPath) EDITOR.move(oldPath, newPath, function fileRenamed(err, newPath) {
					if(err) alertBox(err.message);
					else {
						
						updateItemPaths(path, newPath); // Update elements id and path attribute, and do it recursively for childs if it's an open folder
						
						fileItemMenuHolder.removeChild(fileItemMenu); // Hide the menu
						
						var basePath = UTIL.getDirectoryFromPath(oldPath.replace(/[/\\]$/, ""));
						if(newPath.indexOf(basePath) != 0) {
// The file or folder was moved into another directory
							el.parentElement.removeChild(el);
						}
						
						// Change the name text node!
						else if(el != fileItemMenuHolder) {
							// It's a folder that is open!
							el.removeChild(el.childNodes[2]); // hopefully the text node
							var displayName = UTIL.getFolderName(newPath);
							
							if(displayName.length > maxNameLength) {
								el.setAttribute("title", displayName);
								displayName = displayName.substr(0, 37) + "...";
							}
							console.log("Inserting new folder name=" + displayName);
							el.insertBefore(document.createTextNode(displayName), el.childNodes[2]);
						}
						else {
							// It's a file or closed folder
							el.removeChild(el.lastChild); // hopefully the text node
							
							var displayName = UTIL.getFilenameFromPath(newPath) || UTIL.getFolderName(newPath);
							if(displayName.length > maxNameLength) {
								el.setAttribute("title", displayName);
								displayName = displayName.substr(0, 37) + "...";
							}
							el.appendChild(document.createTextNode(displayName));
						}
						
					}
				});
			});
			
			return false;
		};
		
		if(extractableFileTypes.indexOf(UTIL.getFileExtension(path)) != -1) {
			
			var optExtract = document.createElement("li");
			optExtract.innerText = "Extract";
			fileItemMenu.appendChild(optExtract);
			optExtract.onclick = function extractFile(clickEvent) {
				clickEvent.preventDefault();
				clickEvent.stopPropagation();
				
				CLIENT.cmd("extract", {source: path}, function(err, json) {
					if(err) alertBox(err.message);
					else {
						exploreDir(json.destination);
					}
				});
				
				return hideMenu();
			};
			
		}
		
		
		// Open the menu after the item.
		// If it's a folder item that is extended (has child nodes) we need to add the menu as the first child
		var childElements = document.getElementById(path + "_items");
		if(childElements) {
			fileItemMenuHolder = childElements;
			childElements.insertBefore(fileItemMenu, childElements.childNodes[0]);
		}
		else el.appendChild(fileItemMenu);
		
		
		return false;
		
		function hideMenu(e) {
			if(e) {
				e.preventDefault()
				e.stopPropagation();
			}
			if(fileItemMenu && fileItemMenu.parentNode) fileItemMenu.parentNode.removeChild(fileItemMenu);
			return false;
		}
		
	}
	
	function openOrCloseFolder(item) {
		
		//console.log(item);
		
		var childNodes = item.childNodes;
		var box = childNodes[0];
		var path = item.getAttribute("path");
		
		//console.log("path=" + path);
		
		var elementsToCheck = 3;
		
		if(childNodes.length > elementsToCheck) {
			// The folder is open, close it
			
			console.log("Closing file explorer folder: " + path);
			
			for (var i=elementsToCheck; i<childNodes.length; i++) {
				console.log("removeChild: " + childNodes[i]);
				item.removeChild(childNodes[i]);
			}
			
			box.removeChild(box.firstChild);
			box.appendChild(document.createTextNode("►"));
			
			openFolders.splice(openFolders.indexOf(path), 1);
			
			EDITOR.resizeNeeded();
			//EDITOR.resize();
			
		}
		else {
			
			console.log("Opening file explorer folder: " + path);
			
			lastPathExplored = path;
			
			buildList(path, item, function() {
				
			});
			
			box.removeChild(box.firstChild);
			box.appendChild(document.createTextNode("▼"));
			
			openFolders.push(path);
			
		}
		
	}
	
	function openFile(item) {
		
		var filePath = item.getAttribute("path");
		EDITOR.openFile(filePath);
		
		EDITOR.dashboard.hide();
		
		if(hideButton) toggleFileExplorer(false);
	}
	
	function changeFs(selectChangeEvent) {
		
		var sel = selectChangeEvent.target;
		var host = sel.options[sel.selectedIndex].id;
		
		// Remember open folders ? 
		
		//alert("host=" + host);
		
		console.log("Changing fs host=" + host);
		
		if(host=="local") {
			// Find a local folder to explore
			var files = EDITOR.sortFileList();
			for (var i=0; i<files.length; i++) {
				if(UTIL.isLocalPath(files[i].path)) {
					return exploreDir(files[i].path);
				}
			}
			exploreDir("/"); // root folder (todo: Check if this works on Windows)
		}
		else {
			if(EDITOR.connections.hasOwnProperty(host)) {
				var url = EDITOR.connections[host].protocol;
				if(!url) throw new Error("url=" + url);
				url = url.toLowerCase() + "://" + host + "/";
				exploreDir(url);
			}
			else throw new Error("Not connected to " + host);
		}
		
	}
	
	function dragItem(dragEvent) {
		console.log("dragstart:");
		console.log(dragEvent);
		dragEvent.dataTransfer.setData("text", dragEvent.target.getAttribute("id"));
	}
	
	function dropItem(dragEvent) {
		dragEvent.preventDefault();
		
		console.log("drop:");
		// We will get a drag event for every folder
		console.log(dragEvent);
		var fromPath = dragEvent.dataTransfer.getData("text");
		if(fromPath == null || fromPath == "null") {
			console.log(dragEvent);
			throw new Error("Unable to get text data from drop event!");
		}
		
		var dropOnPath = dragEvent.target.getAttribute("path");
		
		// We are always dropping into a folder. So if the user dropped on a file, we want to place it in that file's folder
		var toFolder = UTIL.getDirectoryFromPath(dropOnPath);
		
		// For some reason the drop event is called many times ... Ignore repeated moves
		if(fromPath == lastMovedFrom && toFolder == lastMovedTo) {
console.warn("Already moved: fromPath=" + fromPath + " toFolder=" + toFolder);
		return;
		}
		lastMovedFrom = fromPath;
		lastMovedTo = toFolder;
		
		setTimeout(function reseLastMoved() {
			// If the move fails, or if the user moves the same file again,
			// we don't want to silently cancel (due to drop event being called many times)
			lastMovedFrom = null;
			lastMovedTo = null;
		}, 500);
		
		// Ignore when dropping at the same place
		var fromFolder = UTIL.getDirectoryFromPath(fromPath);
		if(fromPath == dropOnPath) {
console.warn("Dropped at itself: fromPath=" + fromPath + " dropOnPath=" + dropOnPath);
		return;
		}
		if(fromFolder == toFolder) {
console.warn("Dropped in same folder: fromFolder=" + fromFolder + " toFolder=" + toFolder);
		return;
		}
		
		var droppedOnFile = dropOnPath != toFolder;
		var itemIsFolder = (fromFolder == fromPath);
		
		var fromElement = document.getElementById(fromPath); // id is the path
		var toElement = document.getElementById(toFolder);
		var toUlEl = document.getElementById(toFolder + "_items");
		
		var oldPath = fromPath;
		var newPath = UTIL.trailingSlash(toFolder) + (UTIL.getFilenameFromPath(oldPath) || UTIL.getFolderName(oldPath));
		console.log("fromPath=" + fromPath + " toFolder=" + toFolder + " newPath=" + newPath);
		
		EDITOR.move(oldPath, newPath, function fileRenamed(err, newPath) {
			if(err) return alertBox(err.message);
			
			updateItemPaths(fromPath, newPath);
			
			fromElement.parentNode.removeChild(fromElement);
			
			if(toUlEl) {
				if(toUlEl.childNodes.length > 0 && itemIsFolder) {
					// Place it first
					toUlEl.insertBefore(fromElement, toUlEl.childNodes[0]);
				}
				else if(droppedOnFile) {
					// Place the item where it was dropped
					var fileEl = document.getElementById(dropOnPath);
					toUlEl.insertBefore(fromElement, fileEl);
				}
				else toUlEl.appendChild(fromElement); // Place item last
				
			}
			
			
		});
		
		return false; // Prevent drop event from firing many times
		
	}
	
	function dragOverItem(dragEvent) {
		console.log("dragOver:");
		console.log(dragEvent);
		dragEvent.preventDefault();
	}
	
	function updateItemPaths(fromPath, newPath) {
		// Updates the id and path attribute for an item
		// If it's a folder: Recursively update the path of the folder and all of it's child elements
		
		console.log("Updating fromPath=" + fromPath + " to newPath=" + newPath);
		
		var element = document.getElementById(fromPath);
		if(!element) throw new Error("Did not find element for path=" + fromPath);
		
		var itemUl = document.getElementById(fromPath + "_items");
		// Only opened folders will have an itemUl element !
		if(itemUl) {
			var itemChilds = itemUl.childNodes;
			for(var i=0, childPath, newChildPath; i<itemChilds.length; i++) {
				childPath = itemChilds[i].getAttribute("id");
				newChildPath = getNewChildPath(childPath, newPath)
				updateItemPaths(childPath, newChildPath); // Recursive
			}
		}
		
		element.setAttribute("id", newPath);
		element.setAttribute("path", newPath);
	}
	
	function getNewChildPath(childPath, folder) {
		// Returns the new path for a child item in the moved folder
		
		// Sanity check
		if(typeof folder != "string") throw new Error("Expected folder=" + folder + " to be a string!");
		var lastCharOfFolder = folder.slice(folder.length-1);
		if(lastCharOfFolder != "/" && lastCharOfFolder != "\\") throw new Error("folder=" + folder + " is not a directory!");
		
		// Get the name of the child file or folder
		var isFolder = UTIL.isDirectory(childPath);
		var name = isFolder ? UTIL.getFolderName(childPath) : UTIL.getFilenameFromPath(childPath);
		
		var newPath = folder + name;
		
		if(isFolder) newPath = UTIL.trailingSlash(newPath);
		
		return newPath;
	}
	
})();
