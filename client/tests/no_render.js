
EDITOR.addTest(function doNotCallRender(testCallback) {
	
	/*

		To allow optimizations. File.x low level functions should not call EDITOR.render or EDITOR.renderNeeded

	*/
	
	var renderCalled = false;
	
	function mockRender() {
		renderCalled = true;
	}

	var renderOriginal = EDITOR.render;
	var renderNeededOriginal = EDITOR.renderNeeded;
	
	EDITOR.openFile("testDeleteCharacter.txt", 'hello world!', function(err, file) {
		
		if(err) throw err;
		
		EDITOR.render = mockRender;
		EDITOR.renderNeeded = mockRender;
		
		file.moveCaretRight();
		
		if(renderCalled) throw new Error("file.moveCaretRight told the editor to render");
		
		file.deleteCharacter();
		
		if(renderCalled) throw new Error("file.deleteCharacter told the editor to render");
		
		
		EDITOR.render = renderOriginal;
		EDITOR.renderNeeded = renderNeededOriginal;
		
		EDITOR.closeFile(file.path);
		
		
		
		testCallback(true);
		
	});
	
});
