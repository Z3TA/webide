/*
	
	Inlcuding this file on your web page makes it possible to tell
	jzedit to edit the page you are looking at ...
	
	Just right click anywhere on the page and if you have jzedit running
	it will open the source code for that page and take you to WYSIWYG edit/preview mode.
	
*/

(function() {
	
	"use strict";
	
	document.addEventListener( "contextmenu", function(e) {
		console.log(e);
		
		var clickPath = [];
		
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
			}
		}
		
		var url = window.location.href;
		
		editPage({clickPath: clickPath, url: url})
		
	});
	
	function editPage(data) {
		var url = "http://127.0.0.1:13377";
		var method = "POST";
		var postData = "json=" + encodeURI(JSON.stringify(data));
		
		// You REALLY want async = true.
		// Otherwise, it'll block ALL execution waiting for server response.
		var async = true;
		
		var request = new XMLHttpRequest();
		
		// Before we send anything, we first have to say what we will do when the
		// server responds. This seems backwards (say how we'll respond before we send
		// the request? huh?), but that's how Javascript works.
		// This function attached to the XMLHttpRequest "onload" property specifies how
		// the HTTP response will be handled.
		request.onload = function () {
			
			// Because of javascript's fabulous closure concept, the XMLHttpRequest "request"
			// object declared above is available in this function even though this function
			// executes long after the request is sent and long after this function is
			// instantiated. This fact is CRUCIAL to the workings of XHR in ordinary
			// applications.
			
			// You can get all kinds of information about the HTTP response.
			var status = request.status; // HTTP response status, e.g., 200 for "200 OK"
			var data = request.responseText; // Returned data, e.g., an HTML document.
			
			alert(data);
		}
		
		request.open(method, url, async);
		
		request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		// Or... request.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
		// Or... whatever
		
		// Actually sends the request to the server.
		request.send(postData);
	}
	
	
})();