(function() {
	/*
		Naive priting function.
		*/
	
	return; // Deprecated becasue too buggy! (it sometimes printed junk) Open the file in another program to print it!
	
	"use strict";

	if(runtime == "browser") {
		console.warn("Printer functionality not yet available in the browser!");
		return;
	}
	
var gui = require('nw.gui');
	var menuItem;
	
	EDITOR.plugin({
		desc: "Print plain text files",
		load: load,
		unload: unload,
		});
	
	function load() {
		menuItem = EDITOR.addMenuItem("Print file ...", print_text_file);
	}
	function unload() {
		EDITOR.removeMenuItem(menuItem);
	}
	
	function print_text_file() {
		
		EDITOR.hideMenu();
		
		//var windowContent = EDITOR.currentFile.text;
		//var url = "file:///" + EDITOR.currentFile.path;
		
		// New document needs to be a HTML file (unless the url is opened) ...
		var windowContent = '<title>' + EDITOR.currentFile.path + '</title><pre style="white-space: pre-wrap;">' + EDITOR.currentFile.text + '</pre>';
		
		//var printWin = gui.Window.open(EDITOR.currentFile.path);
		
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