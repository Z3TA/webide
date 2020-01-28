/*
	Creates a new file
*/

(function() {
	
	"use strict";
	
	var menuItem;
	var newFileDashboardWidget;
	var winMenuNewFile;
	var discoveryBarIcon;
	
	EDITOR.plugin({
		desc: "Create new file option to context menu and bound to Ctrl + N",
		load: function loadNewFilePlugin() {
			
			var key_N = 78;
			var key_Enter = 13;
			
				// Ctrl+N is however protected by the browser
				// What should we use isntead?
				// https://defkey.com/search?irq=new+file
				EDITOR.bindKey({desc: "Create new file", charCode: key_Enter, combo: CTRL, fun: newFileFromKeyboardCombo});
			
			if(DISPLAY_MODE == "standalone") {
				EDITOR.bindKey({desc: "Create new file", charCode: key_N, combo: CTRL, fun: newFileFromKeyboardComboOnStandalone});
			}
			
			
			menuItem = EDITOR.ctxMenu.add("New file", newFileFromContextMenu, 1, newFileFromKeyboardCombo);
			winMenuNewFile = EDITOR.windowMenu.add("New file", [S("File"), 2], newFileFromWindowMenu, newFileFromKeyboardCombo);
			
			EDITOR.registerAltKey({char: "n", alt:1, label: S("new"), fun: newFileFromVirtualKeyboard});
			
			newFileDashboardWidget = EDITOR.dashboard.addWidget(createNewFileDashboardWidget());
			
			
			// Note: Most browsers wont let you bind Ctrl+N (so it makes sence to have a dedicated button) (more keyboards bindings are allowed once you've added the app to desktop (PWA add2desktop)
			
			discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/add-file.svg", 10,  S("new_file") + " (" + EDITOR.getKeyFor(newFileFromKeyboardCombo) + ")", "new", newFileFromDiscoveryBar);
			
		},
		unload: function unloadNewFilePlugin() {
			EDITOR.ctxMenu.remove(menuItem);
			EDITOR.windowMenu.remove(winMenuNewFile);
			
			EDITOR.unbindKey(newFileFromKeyboardCombo);
			EDITOR.unbindKey(newFileFromKeyboardComboOnStandalone);

			EDITOR.unregisterAltKey(newFileFromVirtualKeyboard);
			
			EDITOR.dashboard.removeWidget(newFileDashboardWidget);
			
			EDITOR.discoveryBar.remove(discoveryBarIcon);
		},
		order: 10
	});
	
	function newFileFromDiscoveryBar() {
		EDITOR.stat("newFileFromDiscoveryBar");
		return keyboardNewFile();
	}
	
	function newFileFromKeyboardComboOnStandalone() {
		EDITOR.stat("newFileFromKeyboardComboOnStandalone");
		return keyboardNewFile();
	}
	
	function newFileFromKeyboardCombo() {
		EDITOR.stat("newFileFromKeyboardCombo");
		return keyboardNewFile();
	}
	
	function newFileFromVirtualKeyboard() {
		EDITOR.stat("newFileFromVirtualKeyboard");
		return keyboardNewFile();
	}
	
	function newFileFromWindowMenu() {
		EDITOR.stat("newFileFromWindowMenu");
		return keyboardNewFile();
	}
	
	function newFileFromContextMenu() {
		EDITOR.stat("newFileFromContextMenu");
		return keyboardNewFile();
	}
	
	function keyboardNewFile() {
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
			if(err) return alertBox("Unable to create new file: " + err.message);
			
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
		jsImg.setAttribute("alt", "JS");
		jsFile.appendChild(jsImg);
		
		jsFile.appendChild(document.createTextNode("Node.JS script (JavaScript)"));
		jsFile.onclick = function createJsFile(clickEvent) {
			createNewFile( UTIL.joinPaths(EDITOR.user ? EDITOR.user.homeDir:"/", "nodejs/main.js"), '/*\n\n\*/\n\nconsole.log("hello world!");\n\n');
			EDITOR.dashboard.hide();
		};
		newFileWidget.appendChild(jsFile);
		
		
		var htmlButton = document.createElement("button");
		htmlButton.setAttribute("class", "newfile html");
		
		var htmlImg = document.createElement("img");
		htmlImg.setAttribute("src", "gfx/icon/html.svg");
		htmlImg.setAttribute("width", "16");
		htmlImg.setAttribute("height", "16");
		htmlImg.setAttribute("alt", "HTML");
		
		htmlButton.appendChild(htmlImg);
		
		htmlButton.appendChild(document.createTextNode("Web document (HTML)"));
		htmlButton.onclick = function createHtmlFile(clickEvent) {
			createNewFile( UTIL.joinPaths(EDITOR.user ? EDITOR.user.homeDir:"/", "wwwpub/document.htm"), '<!DOCTYPE HTML>\n<html lang="en">\n<head>\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<title>Page title</title>\n<meta name="description" content="A short summary of this page">\n<meta name="author" content="' + EDITOR.user.name + '">\n</head>\n<body>\n\n<h1>Page topic</h1>\n\n<p>Some paragraph</p>\n\n</body>\n</html>\n\n');
			EDITOR.dashboard.hide();
		};
		newFileWidget.appendChild(htmlButton);
		
		
		var cssButton = document.createElement("button");
		cssButton.setAttribute("class", "newfile html");
		var cssImg = document.createElement("img");
		cssImg.setAttribute("src", "gfx/icon/css.svg");
		cssImg.setAttribute("width", "16");
		cssImg.setAttribute("height", "16");
		cssImg.setAttribute("alt", "CSS");
		cssButton.appendChild(cssImg);
		cssButton.appendChild(document.createTextNode("Stylesheet (CSS)"));
		cssButton.onclick = function createCssFile(clickEvent) {
			createNewFile( UTIL.joinPaths(EDITOR.user ? EDITOR.user.homeDir : "/", "wwwpub/stylesheet.css"), '\nbody {\ncolor: black;\nbackground: white;\n}\n\n');
			EDITOR.dashboard.hide();
		};
		newFileWidget.appendChild(cssButton);
		
		
		var anyFile = document.createElement("button");
		anyFile.setAttribute("class", "newfile anyfile");
		
		var docImg = document.createElement("img");
		docImg.setAttribute("src", "gfx/icon/doc.svg");
		docImg.setAttribute("width", "16");
		docImg.setAttribute("height", "16");
		docImg.setAttribute("alt", "txt");
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


