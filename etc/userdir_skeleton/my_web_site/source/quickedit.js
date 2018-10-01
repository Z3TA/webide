/*
	
	Inlcuding this file on your web page makes it possible to tell
	jzedit to edit the page you are looking at ...
	
	The "secret" combo is left Mouse click while holding Alt key and either Ctrl, Shift or Cmd.
	It will take you to the editor, where you can change the source code.
	
*/

(function() {
	
	"use strict";
	
	if(typeof console == "undefined") console = {};
	if(typeof console.log == "undefined") console.log = function() {};
	if(typeof console.error == "undefined") console.error = function() {};
	
	function editPage(nodes, url) {
		var editorUrl = "https://webide.se/"; // Change this to the editor URL
		var editorUser = "demo"; // Change this to the real user (optional)
		
		document.location = editorUrl + "?user=" + editorUser + "&editPage=" + encodeURIComponent(url) + "&nodes=" + encodeURIComponent(nodes.join(",")) + "";
	}
	
	document.addEventListener( "click", function(e) {
		
		if(!e && typeof event != "undefined") e = event;
		
		var leftButton = 1;
		
		// Secret combo ...
		if(e.which == leftButton && (e.ctrlKey || e.metaKey || e.shiftKey) && e.altKey) {
			
			// What word did we click on ?
			var sel = window.getSelection();
			var range = sel.getRangeAt(0);
			var node = sel.anchorNode;
			var start = 0;
			var end = 0;
			while (range.toString().indexOf(' ') != 0 && range.startOffset > 0) {
				start = range.startOffset - 1;
				console.log("start=" + start);
				try {
					range.setStart(node, start);
				}
				catch(err) {
					console.error(err);
					break;
				}
			}
			
			range.setStart(node, range.startOffset + 1);
			
			do {
				end = range.endOffset + 1
				console.log("end=" + end);
				try {
					range.setEnd(node, end);
				}
				catch(err) {
					console.error(err);
					break;
				}
			} while (range.toString().indexOf(' ') == -1 && range.toString().trim() != '' && range.endOffset < node.length);
			
			var word = range.toString().trim();
			
			// Get the "path" to the node we clicked on
			var clickPath = [];
			var nodes = [word];
			
			if(e.path) {
				for(var el, i=0; i<e.path.length; i++) {
					el = e.path[i];
					
					// innerHTML, localName, outerHTML, tagName, nodeName
					
					nodes.push(e.path[i].localName);
					
				}
			}
			
			var url = window.location.href;
			
			console.log("url=" + url);
			console.log("clickPath=" + JSON.stringify(clickPath, null, 2));
			console.log("nodes=" + JSON.stringify(nodes, null, 2));
			
			editPage(nodes, url);
		}
		else {
			/*
				console.log("e.which=" + e.which);
				console.log("e.ctrlKey=" + e.ctrlKey);
				console.log("e.altKey=" + e.altKey);
				console.log("e.shiftKey=" + e.shiftKey);
			*/
		}
	});
})();
