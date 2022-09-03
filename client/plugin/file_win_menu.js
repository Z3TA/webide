(function() {

	var menuItems = {};

	var menuFiles;
	var order = 1;

	EDITOR.plugin({
		desc: "Switch file from File menu",
		load: loadFileWinMenu,
		unload: unloadFileWinMenu
	});

	function loadFileWinMenu() {
		EDITOR.on("fileOpen", fileWinMenuFileOpen, 2);
		//EDITOR.on("fileClose", fileWinMenuCloseFile, 2);
		//EDITOR.on("fileChange", fileWinMenuFileChange);
		//EDITOR.on("fileShow", fileWinMenuFileShow);

		// EDITOR.on("move", [oldPath, newPath]);

	}

	function unloadFileWinMenu() {
		EDITOR.removeEvent("fileOpen", fileWinMenuFileOpen);
		//EDITOR.removeEvent("fileClose", fileWinMenuCloseFile);
		//EDITOR.removeEvent("fileChange", fileWinMenuFileChange);
		//EDITOR.removeEvent("fileShow", fileWinMenuFileShow);

		for(var filePath in menuItems) {
			EDITOR.windowMenu.remove(menuItems[filePath]);
			delete menuItems[filePath];
		}
	}

	function fileWinMenuFileOpen(file) {

		var filePath = file.path;

		if( menuItems.hasOwnProperty(filePath) ) return;

		order++;

		menuItems[filePath] = EDITOR.windowMenu.add(filePath, [S("File"), "Recent files", 1, order], function() {
			EDITOR.windowMenu.hide();
			if( EDITOR.files.hasOwnProperty(filePath) ) EDITOR.showFile(filePath);
			else EDITOR.openFile(filePath);
		});


	}

})();