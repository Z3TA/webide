/*
	Creates a new file
*/

(function() {
	
	"use strict";
	
	var menuItem;
	var newFileDashboardWidget;
	var winMenuNewFile;
	
	EDITOR.plugin({
		desc: "Create new file option to context menu and bound to Ctrl + N",
		load: function load() {
			// Bind to ctrl + N
			EDITOR.bindKey({desc: "Create new file", charCode: 78, combo: CTRL, fun: keyboardNewFile});
			
			menuItem = EDITOR.ctxMenu.add("New file", keyboardNewFile, 1);
			winMenuNewFile = EDITOR.windowMenu.add("New file", ["File", 2], keyboardNewFile);
			
			//newFileDashboardWidget = EDITOR.dashboard.addWidget(createNewFileDashboardWidget());
			
		},
		unload: function unload() {
			EDITOR.ctxMenu.remove(menuItem);
			EDITOR.windowMenu.remove(winMenuNewFile);
			
			EDITOR.unbindKey(keyboardNewFile);
			
			//EDITOR.dashboard.removeWidget(newFileDashboardWidget);
			
		},
		order: 10
	});
	
	function keyboardNewFile(file, combo, character, charCode, direction) {
		EDITOR.ctxMenu.hide();
		winMenuNewFile.hide();
		createNewFile("new file", "");
		return false;
	}
	
	function createNewFile(path, content) {
		
		if(path == undefined) path = "new file";
		if(content == undefined) content = "";
		
		
		
		EDITOR.openFile(path, content, function(err, file) {
			// Mark the file as NOT saved, because its a NEW file
			file.isSaved = false;
			file.savedAs = false;
		});
				
		EDITOR.renderNeeded();
		EDITOR.resizeNeeded();
		
		
		
	}
	
	function createNewFileDashboardWidget() {
		
		var newFileWidget = document.createElement("div");
		newFileWidget.setAttribute("class", "dashboardWidget newfile");
		
		var span = document.createElement("span");
		var text = document.createTextNode("Create new file:");
		span.appendChild(text);
		
		newFileWidget.appendChild(span);
		
		
		var jsFile = document.createElement("button");
		jsFile.setAttribute("class", "newfile js");
		
		var jsImg = document.createElement("img");
		jsImg.setAttribute("src", "gfx/icon/js.svg");
		jsImg.setAttribute("width", "16");
		jsImg.setAttribute("height", "16");
		jsFile.appendChild(jsImg);
		
		jsFile.appendChild(document.createTextNode("JavaScript"));
		jsFile.onclick = function(clickEvent) {
			createNewFile("file.js", '/*\n\n\*/\n\n"use strict";\n\n');
			EDITOR.hideDashboard();
		};
		newFileWidget.appendChild(jsFile);
		
		
		var htmlButton = document.createElement("button");
		htmlButton.setAttribute("class", "newfile html");
		
		var htmlImg = document.createElement("img");
		htmlImg.setAttribute("src", "gfx/icon/html.svg");
		htmlImg.setAttribute("width", "16");
		htmlImg.setAttribute("height", "16");
		htmlButton.appendChild(htmlImg);
		
		htmlButton.appendChild(document.createTextNode("HTML"));
		htmlButton.onclick = function(clickEvent) {
			createNewFile("file.htm", '<!DOCTYPE HTML>\n<html lang="en">\n<head>\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<title>Page title</title>\n<meta name="description" content="A short summary of this page">\n<meta name="author" content="' + EDITOR.user.name + '">\n</head>\n<body>\n\n<h1>Page topic</h1>\n\n<p>Some paragraph</p>\n\n</body>\n</html>\n\n');
			EDITOR.hideDashboard();
		};
		newFileWidget.appendChild(htmlButton);
		
		var anyFile = document.createElement("button");
		anyFile.setAttribute("class", "newfile anyfile");
		
		var docImg = document.createElement("img");
		docImg.setAttribute("src", "gfx/icon/doc.svg");
		docImg.setAttribute("width", "16");
		docImg.setAttribute("height", "16");
		anyFile.appendChild(docImg);
		
		anyFile.appendChild(document.createTextNode("Other"));
		anyFile.onclick = function(clickEvent) {
			createNewFile("new file", "");
			EDITOR.hideDashboard();
		};
		newFileWidget.appendChild(anyFile);
		
		return newFileWidget;
		
	}
	
	
	
})();


