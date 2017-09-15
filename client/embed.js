/*
	How to embed the editor in a web site:
	
	Add this to to header element:
	<script src="https://webide.se/embed.js"></script>
	
*/

window.addEventListener("load", function windowLoaded() {
	
	var defaultEditorWidth = "800"; // tip: Editor your CSS for .editor and use min-width, max-width etc
	var defaultEditorHeight = "500"
	
	var taEl = document.getElementsByTagName("textarea");
	
	for (var i=0; i<taEl.length; i++) {
		if(taEl[i].getAttribute("class")) {
			if(taEl[i].getAttribute("class").indexOf("editor") != -1) {
				replaceTextAreaWithEditor(taEl[i]);
			}
		}
	}
	
	function replaceTextAreaWithEditor(ta) {
		
		var fileName = ta.name || "name not set";
		var fileContent = ta.value || "";
		//var style = window.getComputedStyle(ta);
		var offsetWidth = parseInt(ta.offsetWidth);
		var offsetHeight = parseInt(ta.offsetHeight);
		var editorWidth = offsetWidth || defaultEditorWidth;
		var editorHeight = offsetHeight || defaultEditorHeight;
		var editorLocation = "http://127.0.0.1:8080/";
		var editorSettings = "?";
		
		// When not rows or cols are specified:
		if(ta.rows <= 2 || ta.cols <= 20) {
			editorWidth = defaultEditorWidth;
			editorHeight = defaultEditorHeight;
		}
		
		console.log("editorWidth=" + editorWidth + " editorHeight=" + editorHeight + " ta.cols=" + ta.cols + " ta.rows=" + ta.rows + " offsetWidth=" + offsetWidth + " offsetHeight=" + offsetHeight);
		
	var iframe = document.createElement("iframe");
	iframe.setAttribute("width", editorWidth);
	iframe.setAttribute("height", editorHeight);
	
		ta.parentNode.insertBefore(iframe, ta);
		ta.parentNode.removeChild(ta);
		
		iframe.addEventListener("load", function iframeLoaded() {
			//var editor = this.contentWindow.document.window.EDITOR;
			// We cant access the editor object unless the editor is run with the same protocol hostname and port!
			
			this.contentWindow.postMessage({
				"openFile": {
					name: fileName,
					content: fileContent
				}
			}, "*");
			
			this.contentWindow.postMessage({"disablePlugin": ""}, "*");
			
		});
		iframe.src = editorLocation + editorSettings;
		}
	
});
	