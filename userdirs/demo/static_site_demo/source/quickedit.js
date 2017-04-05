/*
	
	Inlcuding this file on your web page makes it possible to tell
	jzedit to edit the page you are looking at ...
	
	The "secret" combo is left mouse click while holding Ctrl and Alt key
	It will take you to the editor, where you can change the source code.
	
*/

(function() {
	
	"use strict";
	
	alert("Hello from quickedit.js");
	
	function editPage(nodes, url) {
		var editorUrl = "http://127.0.0.1/"; // Change this to the editor URL
		
		document.location = editorUrl + "?editPage=" + encodeURIComponent(url) + "&nodes=" + encodeURIComponent(nodes.join(",")) + "";

	}
	
	
	document.addEventListener( "click", function(e) {
		console.log(event);
		
		if(!e) e = event;
		
		var leftButton = 1;
		
		// Secret combo ...
		if(e.which == leftButton && e.ctrlKey && e.altKey) {
			var clickPath = [];
			var nodes = [];
			
			if(e.path) {
				for(var el, i=0; i<e.path.length; i++) {
					el = e.path[i];
					
					// innerHTML, localName, outerHTML, tagName, nodeName
					clickPath.push({
						innerHTML: e.path[i].innerHTML,
						outerHTML: e.path[i].outerHTML,
						localName: e.path[i].localName,
						tagName: e.path[i].tagName,
						nodeName: e.path[i].nodeName,
					});
					
					nodes.push(e.path[i].nodeName);
					
				}
			}
			
			var url = window.location.href;
			
			console.log("url=" + url);
			console.log("clickPath=" + JSON.stringify(clickPath, null, 2));
			console.log("nodes=" + JSON.stringify(nodes, null, 2));
			
			editPage(nodes, url);
		}
		else {
			console.log("e.which=" + e.which);
			console.log("e.ctrlKey=" + e.ctrlKey);
			console.log("e.altKey=" + e.altKey);
			console.log("e.shiftKey=" + e.shiftKey);
		}
	});
	

	
	
})();