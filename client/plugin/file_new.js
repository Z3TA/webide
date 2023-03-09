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
			
			//console.log("createNewFile: DISPLAY_MODE=" + DISPLAY_MODE + " typeof Keyboard = " + (typeof Keyboard));
			
			if(DISPLAY_MODE == "standalone") {
				EDITOR.bindKey({desc: "Create new file", charCode: key_N, combo: CTRL, fun: newFileFromKeyboardComboOnStandalone});
			}
			else if(typeof navigator.keyboard == "object" && typeof navigator.keyboard.lock == "function") {
				//console.log("createNewFile: Acquiring lock on KeyN ...");
				navigator.keyboard.lock(["KeyN"]).then(function(obj) {
					// note: Locked keys only works in fullscreen!
					//console.log("createNewFile: Allowed to bind to KeyN! obj=" + JSON.stringify(obj));
					CB(EDITOR.bindKey, {desc: "Create new file", key: "n", combo: CTRL, fun: newFileFromKeyboardComboViaKeyboardLock});
				}).catch(function(err) {
					console.log("createNewFile: Not allowed to use KeyN! " + (err.message || err));
				});
			}
			else {
				// Ctrl+N is protected by the browser
				// What should we use isntead?
				// https://defkey.com/search?irq=new+file
				EDITOR.bindKey({desc: "Create new file", charCode: key_Enter, combo: CTRL, fun: newFileFromKeyboardCombo});
			}
			
			
			menuItem = EDITOR.ctxMenu.add("New file", newFileFromContextMenu, 1, newFileFromKeyboardCombo);
			winMenuNewFile = EDITOR.windowMenu.add("New file", [S("File"), 2], newFileFromWindowMenu, newFileFromKeyboardCombo);
			
			EDITOR.registerAltKey({char: "n", alt:1, label: S("new"), fun: newFileFromVirtualKeyboard});
			
			EDITOR.dashboard.announceWidget(announceCreateNewFileDashboardWidget);

			
			// Note: Most browsers wont let you bind Ctrl+N (so it makes sence to have a dedicated button) (more keyboards bindings are allowed once you've added the app to desktop (PWA add2desktop)
			
			discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/add-file.svg", 10,  S("new_file") + " (" + EDITOR.getKeyFor(newFileFromKeyboardCombo) + ")", "new", newFileFromDiscoveryBar);
			// Icon created by: https://www.flaticon.com/authors/phatplus
			
		},
		unload: function unloadNewFilePlugin() {
			EDITOR.ctxMenu.remove(menuItem);
			EDITOR.windowMenu.remove(winMenuNewFile);
			
			EDITOR.unbindKey(newFileFromKeyboardCombo);
			EDITOR.unbindKey(newFileFromKeyboardComboOnStandalone);
			EDITOR.unbindKey(newFileFromKeyboardComboViaKeyboardLock);
			
			EDITOR.unregisterAltKey(newFileFromVirtualKeyboard);
			
			if(newFileDashboardWidget) EDITOR.dashboard.removeWidget(newFileDashboardWidget);
			
			if(discoveryBarIcon) EDITOR.discoveryBar.remove(discoveryBarIcon);
		},
		order: 10
	});
	
	function announceCreateNewFileDashboardWidget(callback) {
		newFileDashboardWidget = createNewFileDashboardWidget();
		callback(newFileDashboardWidget);
	}

	function newFileFromDiscoveryBar() {
		EDITOR.stat("newFileFromDiscoveryBar");
		return newFile();
	}
	
	function newFileFromKeyboardComboOnStandalone() {
		EDITOR.stat("newFileFromKeyboardComboOnStandalone");
		return newFile();
	}
	
	function newFileFromKeyboardComboViaKeyboardLock() {
		EDITOR.stat("newFileFromKeyboardComboViaKeyboardLock");
		return newFile();
	}
	
	function newFileFromKeyboardCombo() {
		EDITOR.stat("newFileFromKeyboardCombo");
		return newFile();
	}
	
	function newFileFromVirtualKeyboard() {
		EDITOR.stat("newFileFromVirtualKeyboard");
		return newFile();
	}
	
	function newFileFromWindowMenu() {
		EDITOR.stat("newFileFromWindowMenu");
		return newFile();
	}
	
	function newFileFromContextMenu() {
		EDITOR.stat("newFileFromContextMenu");
		return newFile();
	}
	
	function newFile() {
		EDITOR.ctxMenu.hide();
		
		console.log("winMenuNewFile=", winMenuNewFile);
		console.log(winMenuNewFile);
		console.log("meh");

		winMenuNewFile.hide();
		EDITOR.dashboard.hide();
		
		createNewFile("new file", "");
		
		return PREVENT_DEFAULT;
	}
	
	function createNewFile(path, content) {
		if(path == undefined) path = "new file";
		if(content == undefined) content = "";
		
		EDITOR.findFileReverseRecursive(".editorconfig", EDITOR.workingDirectory, function(err, files) {
			
			//console.log("createNewFile: findFileReverseRecursive: err=" + (err && err.message) + " files=" + JSON.stringify(files));
			
			if(err) {
				// Probably an EACCESS because we try to look in  /home/ on the cloud IDE
				//alertBox(err.message);
				console.error(err);
				return openFile();
			}
			if(!Array.isArray(files)) throw new Error("createNewFile: Not an array: files=" + JSON.stringify(files) + "");
			
			
			if(files.length == 0) return openFile();
			
			var editorConfigFilePath = files[0];
			
			EDITOR.readFromDisk(editorConfigFilePath, function(err, path, text) {
				if(err) {
					console.error(err);
					alertBox("Unable to read from " + files[0] );
					return openFile();
				}
				
				// Parse .editorconfig
				var eof = UTIL.determineLineBreakCharacters(text);
				var ini = UTIL.ini(eof);
				var editorConfig = ini.parse(text);
				
				//console.log("createNewFile: text=" + text);
				//console.log("createNewFile: editorConfig=" + JSON.stringify(editorConfig, null, 2));
				
				var settings = editorConfig["*"] || editorConfig["js"];
				
				if(settings.indent_style == "space") {
var indentationCharacters = " ";
					if(settings.indent_size) {
						for(var i=1; i<settings.indent_size; i++) indentationCharacters += " ";
					}
					else indentationCharacters = "  "; // Two spaces
				}
				else if(settings.indent_style == "tab") {
					var indentationCharacters = "\t";
				}
				else if(settings.indent != undefined) {
					throw new Error("Unknown settings.indent=" + settings.indent + " from " + editorConfigFilePath);
				}
				
				if(settings.end_of_line == "lf") {
					var lineBreakCharacters = "\n";
				}
				else if(settings.end_of_line == "crlf") {
					var lineBreakCharacters = "\r\n";
				}
				else if(settings.end_of_line != undefined) {
					throw new Error("Unknown settings.end_of_line=" + settings.end_of_line + " from " + editorConfigFilePath);
				}
				
				openFile(lineBreakCharacters, indentationCharacters);
				
			});
			
		});
		
		function openFile(lineBreakCharacters, indentationCharacters) {
			
			var props = {};
			if(lineBreakCharacters) props.lineBreak = lineBreakCharacters;
			if(indentationCharacters) props.indentation = indentationCharacters;
			
			//console.log("createNewFile: props=" + JSON.stringify(props));
			
			EDITOR.openFile(path, content, {isSaved: false, savedAs: false, props: props}, function(err, file) {
				if(err) return alertBox("Unable to create new file: " + err.message);
		
				//console.log("createNewFile: lineBreak=" + JSON.stringify(file.lineBreak) + " indentation=" + props.indentation);
				
			});
		}
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
		
		jsFile.appendChild(document.createTextNode("Node.js script (JavaScript)"));
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

// We have to escape the HTML so that it will not show up as vailid HTML in the editor bundle
var htmlEscaped = '[!DOCTYPE HTML]\n[html lang="en"]\n[head]\n[meta http-equiv="Content-Type" content="text/html; charset=utf-8"]\n[title]Page title[/title]\n[meta name="description" content="A short summary of this page"]\n[meta name="author" content="' + EDITOR.user.name + '"]\n[/head]\n[body]\n\n[h1]Page topic[/h1]\n\n[p]Some paragraph[/p]\n\n[/body]\n[/html]\n\n';
var leftArrow = String.fromCharCode(91);
var rightArrow = String.fromCharCode(93);
			//console.log("createHtmlFile: leftArrow=" + leftArrow + " rightArrow=" + rightArrow);
			var reLeftArrow = new RegExp(UTIL.escapeRegExp(leftArrow), "g");
			var reRightArrow = new RegExp(UTIL.escapeRegExp(rightArrow), "g");
var html = htmlEscaped.replace(reLeftArrow, "<").replace(reRightArrow, ">");

createNewFile( UTIL.joinPaths(EDITOR.user ? EDITOR.user.homeDir:"/", "wwwpub/document.htm"), html);

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


