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
			
			EDITOR.registerAltKey({char: "n", alt:1, label: "New file", fun: keyboardNewFile});
			
			newFileDashboardWidget = EDITOR.dashboard.addWidget(createNewFileDashboardWidget());
			
		},
		unload: function unload() {
			EDITOR.ctxMenu.remove(menuItem);
			EDITOR.windowMenu.remove(winMenuNewFile);
			
			EDITOR.unbindKey(keyboardNewFile);
			
			EDITOR.unregisterAltKey(keyboardNewFile);
			
			EDITOR.dashboard.removeWidget(newFileDashboardWidget);
			
		},
		order: 10
	});
	
	function keyboardNewFile(file, combo, character, charCode, direction) {
		EDITOR.ctxMenu.hide();
		winMenuNewFile.hide();
		EDITOR.dashboard.hide();
		
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
	}
	
	function createNewFileDashboardWidget() {
		
		var newFileWidget = document.createElement("div");
		newFileWidget.setAttribute("class", "dashboardWidget newfile");
		
		var span = document.createElement("span");
		span.setAttribute("class", "description");
		var text = document.createTextNode("Create new:");
		span.appendChild(text);
		
		newFileWidget.appendChild(span);
		
		
		var jsFile = document.createElement("button");
		jsFile.setAttribute("class", "newfile js");
		
		var jsImg = document.createElement("img");
		jsImg.setAttribute("src", "gfx/icon/js.svg");
		jsImg.setAttribute("width", "16");
		jsImg.setAttribute("height", "16");
		jsFile.appendChild(jsImg);
		
		jsFile.appendChild(document.createTextNode("Node.JS script (JavaScript)"));
		jsFile.onclick = function(clickEvent) {
			createNewFile("main.js", '/*\n\n\*/\n\nconsole.log("hello world!");\n\n');
			EDITOR.dashboard.hide();
		};
		newFileWidget.appendChild(jsFile);
		
		
		var htmlButton = document.createElement("button");
		htmlButton.setAttribute("class", "newfile html");
		
		var htmlImg = document.createElement("img");
		htmlImg.setAttribute("src", "gfx/icon/html.svg");
		htmlImg.setAttribute("width", "16");
		htmlImg.setAttribute("height", "16");
		
		htmlButton.appendChild(htmlImg);
		
		htmlButton.appendChild(document.createTextNode("Web document (HTML)"));
		htmlButton.onclick = function(clickEvent) {
			createNewFile("index.htm", '<!DOCTYPE HTML>\n<html lang="en">\n<head>\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<title>Page title</title>\n<meta name="description" content="A short summary of this page">\n<meta name="author" content="' + EDITOR.user.name + '">\n</head>\n<body>\n\n<h1>Page topic</h1>\n\n<p>Some paragraph</p>\n\n</body>\n</html>\n\n');
			EDITOR.dashboard.hide();
		};
		newFileWidget.appendChild(htmlButton);
		
		
		var cssButton = document.createElement("button");
		cssButton.setAttribute("class", "newfile html");
		var cssImg = document.createElement("img");
		cssImg.setAttribute("src", "gfx/icon/css.svg");
		cssImg.setAttribute("width", "16");
		cssImg.setAttribute("height", "16");
		cssButton.appendChild(cssImg);
		cssButton.appendChild(document.createTextNode("Stylesheet (CSS)"));
		cssButton.onclick = function(clickEvent) {
			createNewFile("stylesheet.css", '\nbody {\ncolor: black;\nbackground: white;\n}\n\n');
			EDITOR.dashboard.hide();
		};
		newFileWidget.appendChild(cssButton);
		
		
		var anyFile = document.createElement("button");
		anyFile.setAttribute("class", "newfile anyfile");
		
		var docImg = document.createElement("img");
		docImg.setAttribute("src", "gfx/icon/doc.svg");
		docImg.setAttribute("width", "16");
		docImg.setAttribute("height", "16");
		anyFile.appendChild(docImg);
		
		anyFile.appendChild(document.createTextNode("Plain text (misc.)"));
		anyFile.onclick = function(clickEvent) {
			createNewFile("new file", "");
			EDITOR.dashboard.hide();
		};
		newFileWidget.appendChild(anyFile);
		
		return newFileWidget;
		
	}
	
	
	
})();


