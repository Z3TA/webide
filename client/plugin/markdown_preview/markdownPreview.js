

(function() {
"use strict";

	var markdownParser = "plugin/markdown_preview/showdown.js";
	var markdownParserLoaded = false;
	var fileChangeListenerLoaded = false;
	
	var filesInPreview = {};
	
EDITOR.plugin({
desc: "Markdown Preview",
load: function loadMarkdownPreview() {
EDITOR.on("previewTool", markdownPreview);

},
unload: function unloadMarkdownPreview() {

EDITOR.removeEvent("previewTool", markdownPreview); 
}
});

function markdownPreview(file) {
		if(!file) return false;
		
		var ext = UTIL.getFileExtension(file.path).toLowerCase();
		
		if(!(ext=="md" || ext=="txt" || ext=="markdown" || ext=="mdown" || ext=="mkdn" || ext=="mkd" || ext=="mdwn" 
		|| ext=="mdtxt" || ext=="mdtext" || ext=="text" || ext=="rmd")) return false;
		
		filesInPreview[file.path] = {
			file: file,
			win: null,
			converter: null
		};
		var preview = filesInPreview[file.path];
		
		EDITOR.createWindow({url: "about:blank", waitUntilLoaded: true}, function(err, win) {
			if(err) return alertBox(err.message);
			
			console.log("markdownPreview: Window loaded!");
			
			preview.win = win;
			
			var style = document.createElement('link');
			style.setAttribute("rel", "stylesheet");
			style.setAttribute("type", "text/css");
			style.setAttribute("href", "plugin/markdown_preview/github.css");
			
			var doc = win.document;
			var head = doc.getElementsByTagName('head')[0];
			head.appendChild(style);
			
			win.onbeforeunload = function markdownPreviewWindowClosed() {
				console.log("markdownPreview: Window unloading!");
				preview = null;
				delete filesInPreview[file.path];
				
				if( Object.keys(filesInPreview).length === 0) {
					EDITOR.removeEvent("fileChange", updateMarkdownPreview);
					fileChangeListenerLoaded = false;
				}
			}
			
			run();
		});
		
		if(markdownParserLoaded) run();
		else EDITOR.loadScript(markdownParser, true, function markdownParserLoadedMaybe(err) {
			if(err) return alertBox(err.message);
			console.log("markdownPreview: Markdown parser loaded!");
			markdownParserLoaded = true;
			run();
		});
		
		return true;
		
		function run() {
			console.log("markdownPreview: run: markdownParserLoaded=" + markdownParserLoaded + " preview.win=" + preview.win + " ");
			
			if(!preview.win) {
				console.warn("markdownPreview: Waiting for window to load...");
				return;
			}
			else if(!markdownParserLoaded) {
				console.warn("markdownPreview: Waiting for markdownParser to load...");
				return;
			}
			
			preview.converter = new showdown.Converter();
			
			setData(preview);
			
			preview.win.focus();
			
			if(!fileChangeListenerLoaded) {
				EDITOR.on("fileChange", updateMarkdownPreview);
				fileChangeListenerLoaded = true;
			}
			
		}
		
	}
	
	function updateMarkdownPreview(file) {
		var preview = filesInPreview[file.path];
		
		if(!preview) return ALLOW_DEFAULT;
		
		setData(preview);
	}
	
	function setData(preview) {
		
		console.log("markdownPreview: Setting data!");
		
		var file = preview.file;
		var html = preview.converter.makeHtml(file.text);
		var win = preview.win;
		var doc = win.document;
		
		doc.body.innerHTML = html;
		
		/*
			doc.open("text/html", "replace");
			doc.write(html);
			doc.close();
		*/
		
	}
	
	
})();
