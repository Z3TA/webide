(function() {
	/*
		
		todo: Select box: Make it possible to switch beteen local and remote file-systems (show local + any connected systems)
		
		
	*/
	
	var fileExplorer;
	var leftColumn;	
	
	
	editor.plugin({
		desc: "File explorer window in left column",
		load: load,
		unload: unload,
		order: 100
	});
	
	function load() {
		
		console.log("Initiating file explorer");
		
		editor.on("changeWorkingDir", exploreDir);
		
		leftColumn = document.getElementById("leftColumn");
		
		buildList(editor.workingDirectory);
		
	}
	
	function unload() {
		leftColumn.removeChild(fileExplorer);
	}
	
	function exploreDir(dir) {
		
		while(fileExplorer.firstChild) fileExplorer.removeChild(fileExplorer.firstChild); // Emty list
		
		// We want to start from the root, then work our way towards the actual dir
		
		
		buildList(dir);
	}
	
	function buildList(dir, parent, findDir, callback) {
		
		var dirFound = null;
		
		if(!fileExplorer) {
			
			fileExplorer = document.createElement("div");
			fileExplorer.setAttribute("class", "wrap fileExplorer");
			leftColumn.appendChild(fileExplorer);
		}
		
		if(!parent) parent = fileExplorer;
		
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
			editor.resize();
			
			if(callback) callback(dirFound);
		});
		
		function showItem(item) {
			
			var li = document.createElement("li");
			var type = "";
			
			if(item.type == "d") type = "folder";
			else if(item.type == "-") type = "file";
			else if(item.type == "l") type = "link";
			
			li.setAttribute("class", type); // 'd' for directory, '-' for file (or 'l' for symlink on *NIX only).
			li.setAttribute("path", item.path);
			
			if(item.path == findDir || item.name == findDir) dirFound = li;
			
			if(type == "folder") {
				
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
			}
			else {
				
				li.addEventListener("click", function() {
					openFile(li);
					
					e = window.event || e;
					e.stopPropagation();
					return false;
					
				}, false);
				
			}
			
			li.appendChild(document.createTextNode(item.name));
			
			console.log("item.name=" + item.name);
			
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
	function sortByType(a, b) {
		if(a.type == b.type) return 0;
			else if(a.type == "d") return -1;
		else if(b.type == "d") return 1;
		else return 0;
	}
	
	function sortByName(a, b) {
		var nameA = a.name.toLowerCase();
		var nameB = b.name.toLowerCase();
		
		console.log(nameA + " > " + nameB + " ? " + (nameA > nameB));
		
		if(nameA < nameB) return -1;
		else if(nameA > nameB) return 1;
		else return 0;
		
	}
	
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
		
		console.log(item);
		
		var childNodes = item.childNodes;
		var box = childNodes[0];
		var path = item.getAttribute("path");
		
		console.log("path=" + path);
		
		if(childNodes.length > 2) {
			// The folder is open, close it
			
			console.log("Closing folder: " + path);
			
			for (var i=2; i<childNodes.length; i++) {
				item.removeChild(childNodes[i]);
			}
			
			box.removeChild(box.firstChild);
			box.appendChild(document.createTextNode("+"));
			
			editor.resizeNeeded();
			editor.resize();
			
		}
		else {
			
			console.log("Opening folder: " + path);
			
			buildList(path, item, function() {
				
			});
			
			box.removeChild(box.firstChild);
			box.appendChild(document.createTextNode("-"));
		}
		
	}
	
	function openFile(item) {
		
		var filePath = item.getAttribute("path");
		editor.openFile(filePath);
	}
	
})();
