(function() {
	"use strict";

	console.log("Hello from embed.js on " + document.location.hostname);
	
/*
	How to embed the editor in a web site:
	
		Add the following inside the html head element:
	<script src="https://webide.se/embed.js"></script>
	
		Then place code snippets in textarea elements, with editor in the class atrribute, like this:
		<textarea class="editor" name="code.js">alert("Hello World");</textarea>
	
		
		(tip: Turn off JavaScript and adjust the rows and cols attributes for the textarea elements to make the text fit)
		
*/

	var editorsOpen = {};
	
	var noNameCounter = 0;
	
	// Name (description) of plugins to disable when embedded:
	var disablePlugins = [
		//"Server login dialog",
		//"Static site generator management interface",
		"Show list of JS functions in left column",
		//"File explorer window widget",
		//"Mercurial SCM integration",
		//"Manage and connect to FTP/SSH servers.",
		//"Manage console logs, devTools and toggle devMode",
		'Adds "Close file" and "Close the editor" key combos and a "Close file" context menu item',
		"Create new file option to context menu and bound to Ctrl + N",
		//"Adds option to reload the file from disk in the context menu"
	];
	
	var bookMarklet = document.getElementById("webide_bookmarklet");
	console.log("bookMarklet ? " + !!bookMarklet);
	if(bookMarklet) windowLoaded();
	else window.addEventListener("load", windowLoaded);
	
	var hostHostname = window.location.hostname;
	var scripts = document.getElementsByTagName("script");
	var scriptSrc = scripts[scripts.length-1].src;
	
	
	function windowLoaded() {
		
		var defaultEditorWidth = "800";
		var defaultEditorHeight = "500"
		// (tip: Add .editor with min-width, max-width etc to your CSS file)
		
		var taEl = document.getElementsByTagName("textarea");
		
		if(taEl.length == 0) {
			console.log("Did not find any textarea elements! taEl.length=" + taEl.length);
		}
		else if(bookMarklet) {
			replaceTextAreaWithEditor(taEl[0]);
		}
		else {
			for (var i=0; i<taEl.length; i++) {
				console.log("Checking textarea " + i + " ...");
				if(taEl[i].getAttribute("class")) {
					if(taEl[i].getAttribute("class").indexOf("editor") != -1) {
						replaceTextAreaWithEditor(taEl[i]);
						console.log("Done replacing textarea " + i + " with editor.");
						console.log("i=" + i + " taEl.length=" + taEl.length);
						continue;
					}
					else console.log("textarea " + i + " does not have editor in it's class attribute");
				}
				else console.log("textarea " + i + " does not have a class attribute");
			}
		}
		
		function replaceTextAreaWithEditor(ta) {
			
			var fileName = ta.name || "file" + (++noNameCounter);
			var fileContent = ta.value || "";
			//var style = window.getComputedStyle(ta);
			var offsetWidth = parseInt(ta.offsetWidth);
			var offsetHeight = parseInt(ta.offsetHeight);
			var editorWidth = offsetWidth || defaultEditorWidth;
			var editorHeight = offsetHeight || defaultEditorHeight;
			var editorLocation = getEditorLocation();
			var editorQuery = "?embed=true&disable=menu,file_tabs&dev=false"; // set dev to true to see console.log messages
			var query = ta.getAttribute("query");
			
			if(query) editorQuery += "&" + query;
			
			if(!query || (query.indexOf("user") == -1 && query.indexOf("pw") == -1)) {
				editorQuery += "&user=guest&pw=guest";
			}
			
			var counter = 0;
			var fileNameOriginal = fileName;
			while(editorsOpen.hasOwnProperty(fileName)) {
				console.warn("A editor with file name=" + fileName + " is already open!");
				
				if(fileNameOriginal.indexOf(".") == -1) fileName = fileNameOriginal + (++counter);
				else fileName = fileNameOriginal.substring(0, fileNameOriginal.indexOf(".")) + " (" + (++counter) + ")" + fileNameOriginal.substr(fileName.indexOf("."));
			}
			
			editorsOpen[fileName] = ta;
			
			// The values below is what you would expect to be the browsers default values, meaning no rows and cols attributes are set
			if(ta.rows <= 2 || ta.cols <= 20) {
				editorWidth = defaultEditorWidth;
				editorHeight = defaultEditorHeight;
			}
			
			console.log("Replacing textarea " + ta.name + " with editor ...");
			
			console.log("editorWidth=" + editorWidth + " editorHeight=" + editorHeight + " ta.cols=" + ta.cols + " ta.rows=" + ta.rows + " offsetWidth=" + offsetWidth + " offsetHeight=" + offsetHeight);
			
			var iframe = document.createElement("iframe");
			iframe.setAttribute("width", editorWidth);
			iframe.setAttribute("height", editorHeight);
			iframe.setAttribute("class", "editor webide");
			iframe.setAttribute("allowfullscreen", "true");
			iframe.setAttribute("frameborder", "0");
			
			ta.parentNode.insertBefore(iframe, ta);
			
			
			// Hide the textarea instead of removing it
			ta.style.display = "none";
			//ta.parentNode.removeChild(ta);
			
			
			iframe.addEventListener("load", function iframeLoaded() {
				//var editor = this.contentWindow.document.window.EDITOR;
				// We cant access the editor object unless the editor is run with the same protocol hostname and port!
				
				this.contentWindow.postMessage({
					"createFile": {
						path: hostHostname + "/" + fileName, // note: /embed/ will be prepended!
						content: fileContent
					}
				}, "*");
				
				for (var i=0; i<disablePlugins.length; i++) {
					this.contentWindow.postMessage({"disablePlugin": disablePlugins[i]}, "*");
				}
				
			});
			iframe.src = editorLocation + editorQuery;
		}
		
	}

window.addEventListener("message", function receiveMessage(windowMessageEvent) {
	console.log("Window message from origin=" + windowMessageEvent.origin);
	
		var msg = windowMessageEvent.data;
		
		if(msg.fileUpdate) {
			console.log("fileUpdate: name=" + msg.fileUpdate.name);
			
			if(!editorsOpen.hasOwnProperty(msg.fileUpdate.name)) throw new Error("Can not find textarea element for name=" + msg.fileUpdate.name);
			
			var ta = editorsOpen[msg.fileUpdate.name];
			// Update the textarea's value in case it will be used in a HTTP post etc.
			ta.value = msg.fileUpdate.content;
			console.log("Updated textarea " + (ta.name || msg.fileUpdate.name) + " content=" + msg.fileUpdate.content);
		}
		else throw new Error("Unable to handle message: " + msg);
		
	});
	
	function getEditorLocation() {
		/*
			The location of the editor should be the same as this file, 
			or postMessage will not work! (meaning the textarea's wont be updated)
		*/
		
		var url;
		
		//var reLocalIp = /(^127\.)|(^192\.168\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^::1$)|(^[fF][cCdD])/;
		
		//console.log("document.currentScript.src=" + document.currentScript && document.currentScript.src);
		
		if(document.currentScript) {
			url = document.currentScript.src;
			url = url.slice(0, url.lastIndexOf("/") + 1);
			return url;
			}
		else if(scriptSrc) {
			url = scriptSrc.slice(0, scriptSrc.lastIndexOf("/") + 1);
			return url;
		}
		else {
			console.warn("Unable to determine editor URL!");
			//return "http://127.0.0.1:8080/";
			return "https://webide.se/";
		}
		
		}
	
})();
