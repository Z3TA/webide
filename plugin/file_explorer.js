(function() {

var fileExplorer;
var leftColumn;	


	editor.plugin({
		desc: "File explorer window in left column",
		load: load,
		unload: unload,
		order: 300
	});
	
	function load() {
		
		leftColumn = document.getElementById("leftColumn");
		
		buildList(editor.workingDirectory, null, function() {

			editor.resizeNeeded();
		});
		
		
		
	}
	
	function unload() {
		leftColumn.removeChild(fileExplorer);
	}
	
	function buildList(dir, parent, callback) {
		
		if(!fileExplorer) {
			
			fileExplorer = document.createElement("div");
			fileExplorer.setAttribute("class", "wrap fileExplorer");
			leftColumn.appendChild(fileExplorer);
		}
		
		if(!parent) parent = fileExplorer;
		
		// Clean the parent node
		while (parent.firstChild) parent.removeChild(parent.firstChild);
		
		
		var ul = document.createElement("ul");
		
		// List files in working dir, get name of parent folder
		editor.listFiles(dir, function gotFileList(err, listItems) {
			
			if(err) throw err;
			
			// Sort the list ?
			
			listItems.forEach(showItem);
			
			parent.appendChild(ul);
			
			if(callback) callback();
		});
		
		function showItem(item) {
			
			var li = document.createElement("li");
			li.setAttribute("class", item.type); // 'd' for directory, '-' for file (or 'l' for symlink on *NIX only).
			
			li.appendChild(document.createTextNode(item.type + " " + item.name));
			
			console.log("item.name=" + item.name);
			
			ul.appendChild(li);
			
		}
		
	}
	
})();
