
(function() {
	
	window.addEventListener("load", main, false);

	var shift = 1,
		ctrl = 2,
		alt = 4,
		leftColumn,
		fileList;
		
		
	function main() {
		
		console.log("file_list.js loaded!");
		
		editor.on("fileLoad", onFileOpen);
		editor.on("fileClose", onFileClose);

		leftColumn = document.getElementById("leftColumn");
		fileList = document.getElementById("fileList");

		// Crete the file list
		if(!fileList) {
			
			var div = document.createElement("div");
			div.setAttribute("class", "fileList");
			
			fileList = document.createElement("ul");
			fileList.setAttribute("class", "fileList")
			fileList.setAttribute("id", "fileList");
			
			div.appendChild(fileList);
			
			leftColumn.appendChild(div);
			
			console.log("fileList appended to left column")
			
		}
	
	}
	
	function onFileOpen(file) {
		
		console.time("onFileOpen (file_list.js)");
		
		var text = file.text, 
			name = file.name;
			
		var li = document.createElement("li"),
			a = document.createElement("a");
		
		a.appendChild(document.createTextNode(name));
		a.setAttribute("name", name);
		a.addEventListener("mousedown", switchFile, true); // Do not bubble to parent li!

		li.appendChild(a);
		
		fileList.appendChild(li);
		
		function switchFile(e) {
			global.render = true;
			
			var target = e.target,
				name = target.getAttribute("name");
				
			console.log("Swithing to " + name);
			
			if(global.currentFile) {
				global.currentFile.hide();
			}
			
			global.currentFile = global.files[name];
			
			global.currentFile.show();
			
			
			
		}
	}
	
	function onFileClose() {
		
	}

	
})();