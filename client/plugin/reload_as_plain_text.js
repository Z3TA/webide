(function() {
	/*
		Can be useful for when debugging minified code
	*/
	"use strict";
	
	var winMenuReloadAsPlainText;
	var winMenuReloadAsCode;
	
	EDITOR.plugin({
		desc: "Able to reload a file as plain text",
		load: loadFileReloadAsPlainText,
		unload: unloadFileReloadAsPlainText
	});
	
	function loadFileReloadAsPlainText() {
		
		winMenuReloadAsPlainText = EDITOR.windowMenu.add(S("reload_as_plain_text"), [S("Edit"), 10], reloadAsPlainText);
		winMenuReloadAsCode = EDITOR.windowMenu.add(S("reload_as_code"), [S("Edit"), 10], reloadAsCode);
/*
			optimally we only want the menu item to show up when we are in a code file, but that would require some refactoring of editor's window menu
*/

		//EDITOR.on("fileShow", reloadAsPlainTextOptionMaybe);
	}
	
	function unloadFileReloadAsPlainText() {
		
		EDITOR.windowMenu.remove(winMenuReloadAsPlainText);
		EDITOR.windowMenu.remove(winMenuReloadAsCode);
		
		//EDITOR.removeEvent("fileShow", reloadAsPlainTextOptionMaybe);
	}
	
	
	
	function reloadAsPlainText(file) {
		file.reload(file.text,  {
			disableParsing: true, 
			fullAutoIndentation: false,
			parsed: null
		});
	}
	
	function reloadAsCode(file) {
		file.reload(file.text,  {
			disableParsing: false
		});
	}
	

	// TEST-CODE-START

	EDITOR.addTest(function testPlainText(callback) {
		EDITOR.openFile("testReloadAsPlainText.js", "{\n    //should be indentated\n}\n", function(err, file) {
			if(err) throw err;

			// Intermediate async to avoid mutation traps
			setTimeout(function() {

				UTIL.assert(file.grid[1].indentation,1);
				UTIL.assert(file.grid[1].indentationCharacters,"    ");

				reloadAsPlainText(file);

				// Make sure the spaces are there
				if( file.grid[1][0].char != " " ) throw new Error("file.grid[1][0].char=" + UTIL.lbChars(file.grid[1][0].char));

				EDITOR.closeFile(file);

				callback(true);

			}, 100);

		});

	});


	// TEST-CODE-END
	
})();