editor.addTest(function doNotCallRender(testCallback) {
	/*

		To allow optimizations. File.x low level functions should not call editor.render or editor.renderNeeded

	*/
	
	var renderCalled = false;
	
	function mockRender() {
		renderCalled = true;
	}

	var renderOriginal = editor.render;
	var renderNeededOriginal = editor.renderNeeded;
	
	editor.openFile("testDeleteCharacter.txt", 'hello world!', function(err, file) {
		
		if(err) throw err;
		
		editor.render = mockRender;
		editor.renderNeeded = mockRender;
		
		file.moveCaretRight();
		
		if(renderCalled) throw new Error("file.moveCaretRight told the editor to render");
		
		file.deleteCharacter();
		
		if(renderCalled) throw new Error("file.deleteCharacter told the editor to render");
		
		editor.closeFile(file.path);
		
		callback(true);
		
	});
	
}	
