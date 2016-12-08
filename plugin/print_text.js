(function() {
	/*
		Naive priting function
	*/
	
	"use strict";

	if(runtime == "browser") {
		console.warn("Printer functionality not yet available in the browser!");
		return;
	}
	
var gui = require('nw.gui');
	var menuItem;
	
	editor.plugin({
		desc: "Print plain text files",
		load: load,
		unload: unload,
		});
	
	function load() {
		menuItem = editor.addMenuItem("Print file ...", print_text_file);
	}
	function unload() {
		editor.removeMenuItem(menuItem);
	}
	
	function print_text_file() {
		
		editor.hideMenu();
		
		//var windowContent = editor.currentFile.text;
		//var url = "file:///" + editor.currentFile.path;
		
		// New document needs to be a HTML file (unless the url is opened) ...
		var windowContent = '<title>' + editor.currentFile.path + '</title><pre style="white-space: pre-wrap;">' + editor.currentFile.text + '</pre>';
		
		//var printWin = gui.Window.open(editor.currentFile.path);
		
		var printWin = window.open('text/plain');
		printWin.document.write(windowContent);
		printWin.document.close(); // Need this or no print dialog will show
		printWin.focus();
		printWin.print();
		
		setTimeout(function() {
			// Can't close right away or it will also close the editor, no idea why
		printWin.close();
		}, 500); // Need to be at least 500ms
		
		
		//printWin.window.print();
		//printWin.window.close();
		//printWin.on("loaded", function() {});
		
	}
	
})();