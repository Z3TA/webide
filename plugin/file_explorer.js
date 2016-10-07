(function() {
	/*
		Only show the file explorer explicity. The screen cant have too much information or the brain will get burnt out
		
		todo: Append a list for each connection plus local system, so you can browse all at once
		
		todo: File watcher, update the list when file change names, or are created/removed
		
	*/
	
	var fileExplorerFolders;
	var fileExplorerWrap;
	var leftColumn, rightColumn;	
	var visible = false;
	var menuItem;
	var defaultScroll = 0;
	var fsSelect;
	var openFolders = [];
	
		editor.plugin({
			desc: "File explorer window widget",
			load: load,
			unload: unload,
			order: 500 // functionList: 200, (a higher number makes it start sooner)
		});
		
		function load() {
			
			console.log("Initiating file explorer");
			
			var key_E = 69;
			
			editor.bindKey({desc: "Toggle file explorer", charCode: key_E, combo: CTRL, fun: toggleFileExplorer});
			
			//editor.on("beforeResize", saveScrollPosition);
			//editor.on("afterResize", restoreScrollPosition);
			
			// editor.on("changeWorkingDir", exploreDir);
			
			menuItem = editor.addMenuItem("Toggle file explorer " + (visible ? "off":"on"), toggleFileExplorer);
			
			leftColumn = document.getElementById("leftColumn");
			rightColumn = document.getElementById("rightColumn");
			
			fileExplorerWrap = document.createElement("div");
			fileExplorerWrap.setAttribute("class", "wrap fileExplorer");
			fileExplorerWrap.setAttribute("id", "fileExplorer");
			
			fileExplorerFolders = document.createElement("div");
			fileExplorerFolders.setAttribute("id", "fileExplorerFolders");
			
			fsSelect = document.createElement("select");
			fsSelect.setAttribute("id", "fsSelect");
			fsSelect.onchange = changeFs;
			
			/*
				fileExplorer.addEventListener("scroll", function() {
				console.log(getStack("You scrolled"));
				});
			*/
			
			fileExplorerWrap.appendChild(fsSelect);
			fileExplorerWrap.appendChild(fileExplorerFolders);
			rightColumn.appendChild(fileExplorerWrap);
			
			//exploreDir(editor.workingDirectory);
			
			toggleFileExplorer(visible);
			
		}
		
		function unload() {
			rightColumn.removeChild(fileExplorerWrap);
		}
		
		function toggleFileExplorer(toState) {
			
			//alertBox("toState=" + toState);
			
			if(typeof toState == "boolean") visible = toState;
			else visible = visible ? false : true; // Switch
			
			menuItem.innerHTML = "Toggle file explorer " + (visible ? "off":"on");
			
			if(visible) {
				exploreDir(editor.workingDirectory)
				fileExplorerWrap.style.display="block";
				
			}
			else {
				fileExplorerWrap.style.display="none";
				editor.resizeNeeded();
				
			}
			return false;
		}
		
		function scroll() {
			// Make it center/middle ?? Whole project folder should be visible
			
		fileExplorerWrap.scrollTop = defaultScroll;
		
		console.log("Scrolled down on file explorer: defaultScroll=" + defaultScroll);
		}
		
		function exploreDir(fullPath) {
			
			while(fileExplorerFolders.firstChild) fileExplorerFolders.removeChild(fileExplorerFolders.firstChild); // Emty list
			
			while(fsSelect.firstChild) fsSelect.removeChild(fsSelect.firstChild); // Emty select options
			
			// Make a list of connected file-systems
			var option = document.createElement("option");
			option.appendChild(document.createTextNode("Local file-system"));
			option.setAttribute("id", "local");
			fsSelect.appendChild(option);
			
			var connName = "";
			for(var conn in editor.connections) {
				option = document.createElement("option");
				connName = editor.connections[conn].protocol + "://" + conn
				option.appendChild(document.createTextNode(connName));
				option.setAttribute("id", conn);
				if(fullPath.indexOf(connName) != -1) option.setAttribute("selected", "true");
				fsSelect.appendChild(option);
			}
			
			// We want to start from the root, then work our way towards the actual dir
			var folders = getFolders(fullPath, true);
			
			// Recursive 
			lookUpPath(folders, 0);
			
			function lookUpPath(folders, index, parent) {
				var dir = folders[index];
				var findDir = index < (folders.length-1) ? folders[index+1] : null;
				
				buildList(dir, parent, findDir, function(parent) {
					
					index++;
					
					if(index < folders.length) lookUpPath(folders, index, parent);
					else scrollDownToDir(fullPath);
					
				});
			}
			
			function scrollDownToDir(targetPath) {
				// Shroll down the fire explorer div so we can see the folder we are interested in
				// Go though all elements in the list and measure the height until we find target path, then scroll down the height
				
				//while(targetPath.substr(targetPath.length-1) == "/") targetPath = targetPath.substr(0, targetPath.length-1); // Remove trailing slashes
				
				//console.log("targetPath=" + targetPath);
				
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
			
			console.log("Building file explorer tree for dir=" + dir);
			
			var dirFound = null;
			
			if(!parent) parent = fileExplorerFolders;
			else {
				// Make the parent folder appear open
				
				// let (aka block scope) only solves a symtom of the bigger problem: Using varaibles from parent or global scope (dont't do that) and function scope is probably what you want (not block scope)
				parent.setAttribute("class", "folder open");
				var childNodes = parent.childNodes;
				var box = childNodes[0];
				box.removeChild(box.firstChild);
				box.appendChild(document.createTextNode("-"));
			}
			
			// Clean the parent node
			//while (parent.firstChild) parent.removeChild(parent.firstChild);
			
			
			var ul = document.createElement("ul");
			ul.setAttribute("class", "tree");
			
			// List files in working dir, get name of parent folder
			editor.listFiles(dir, function gotFileList(err, listItems) {
				
				if(err) throw err;
				
				listItems.sort(sortByNameAndType);
				
				listItems.forEach(showItem);
				
				parent.appendChild(ul);
				
				editor.resizeNeeded();
				//editor.resize();
				
				if(callback) callback(dirFound);
			});
			
			function showItem(item) {
				
				var li = document.createElement("li");
				var type = "";
				
				// 'd' for directory, '-' for file (or 'l' for symlink on *NIX only).
				if(item.type == "d") type = "folder";
				else if(item.type == "-") type = "file";
				else if(item.type == "l") type = "link";
			else if(item.type == "*") type = "problem";
			
			li.setAttribute("path", item.path);
				
				if(item.path == findDir || item.name == findDir) dirFound = li;
				
				if(type == "folder") {
					
					li.setAttribute("class", "folder closed"); 
					
					li.addEventListener("click", function(e) {
						openOrCloseFolder(li);
						
						// Try to stop event from propagating down though parents
						e = window.event || e; 
						e.stopPropagation();
						return false; 
						
					}, false);
					
					var box = document.createElement("figure");
					box.setAttribute("class", "closed box");
					
					box.appendChild(document.createTextNode("+"));
					li.appendChild(box);
				
				if(openFolders.indexOf(item.path) != -1) buildList(item.path, li);
				
				}
				else {
					li.setAttribute("class", type); 
				
					li.addEventListener("click", function() {
						openFile(li);
						
						e = window.event || e;
						e.stopPropagation();
						return false;
						
					}, false);
					
				}
				
				li.appendChild(document.createTextNode(item.name));
				
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
		
		function openOrCloseFolder(item) {
			
			//console.log(item);
			
			var childNodes = item.childNodes;
			var box = childNodes[0];
			var path = item.getAttribute("path");
			
			//console.log("path=" + path);
			
			if(childNodes.length > 2) {
				// The folder is open, close it
				
				console.log("Closing file explorer folder: " + path);
				
				for (var i=2; i<childNodes.length; i++) {
					item.removeChild(childNodes[i]);
				}
				
				box.removeChild(box.firstChild);
				box.appendChild(document.createTextNode("+"));
				
			openFolders.splice(openFolders.indexOf(path), 1);
			
				editor.resizeNeeded();
				//editor.resize();
				
			}
			else {
				
				console.log("Opening file explorer folder: " + path);
				
				buildList(path, item, function() {
					
				});
				
				box.removeChild(box.firstChild);
				box.appendChild(document.createTextNode("-"));
			
			openFolders.push(path);
			
			}
			
		}
		
		function openFile(item) {
			
			var filePath = item.getAttribute("path");
			editor.openFile(filePath);
		}
		
		function changeFs(event) {
			
			var sel = event.target;
			var host = sel.options[sel.selectedIndex].id;
			
			// Remember open folders ? 
			
			//alert("host=" + host);
			
			if(host=="local") {
				var root = getFolders(process.cwd())[0];
				exploreDir(root);
			}
			else {
				if(editor.connections.hasOwnProperty(host)) {
					var url = editor.connections[host].protocol;
					if(!url) throw new Error("url=" + url);
					url += "://" + host + "/";
					exploreDir(url);
				}
				else throw new Error("Not connected to " + host);
			}
		}
		
	})();
