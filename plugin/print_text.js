(function() {
	"use strict";

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
		
		style = "white-space: pre-wrap;"
		
		//var windowContent = "<style>"white-space: pre-wrap;"" +  + "<<title>" + editor.currentFile.path + "</title><pre>" + editor.currentFile.text + "</pre>";
		
		//var url = "file:///" + editor.currentFile.path;
		
		//var printWin = gui.Window.open(editor.currentFile.path);
		
		var printWin = window.open('text/plain');
		printWin.document.write(windowContent);
		printWin.document.close();
		printWin.focus();
		printWin.print();
		//printWin.close();
		
		//printWin.window.print();
		
		//printWin.window.close();
		
		//printWin.on("loaded", function() {});
		
		
	}
	
})();