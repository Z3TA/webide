/*

	Code high-lightning for plain text mode (no parser)

*/

(function() {
	"use strict";
	
	var initiated = false;
	var worker;
	var html;
	
	EDITOR.plugin({
		desc: "Code highlightning",
		load: function loadHighlight() {
			
			EDITOR.on("fileOpen", highlightLazyLoad);
			
		},
		unload: function unloadHighlight() {
			
		}
	});
	
	function highlightLazyLoad(file) {
		
		console.log("highlight: highlightLazyLoad! file.path=" + file.path + " file.disableParsing=" + file.disableParsing + " initiated=" + initiated);
		
		if(file.disableParsing) {
			if(!initiated) init();
			
			worker.postMessage({text: file.text, path: file.path});
		}
		
	}
	
	function init() {
		console.log("highlight: init!");
		
		if(initiated) throw new Error("highlight: Already initiated!");
		
		if(window.Worker) {
			worker = new Worker('/plugin/highlightjs_worker.js');
			
			worker.onmessage = highlightWorkerMessage;
			
			EDITOR.addPreRender(highlightPreRender);
			
			EDITOR.on("fileChange", highlightChangedFile);
			
			initiated = true;
			
		}
		else {
			console.warn("highlight: window.Worker=" + window.Worker + " not available!");
		}
	}
	
	function highlightChangedFile(file) {
		
		console.log("highlight: highlightChangedFile: file.path=" + file.path);
		
		worker.postMessage({text: file.text, path: file.path});
	}
	
	function highlightWorkerMessage(ev) {
		var obj = ev.data;
		
		console.log("highlight: obj=", obj);
		
		html = obj.html;
		
		console.log("highlight:highlightWorkerMessage: html=" + html);
		
	}

	function highlightPreRender(buffer, file) {
		
		return buffer;
	}


	
})();
