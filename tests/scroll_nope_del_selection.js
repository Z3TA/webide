editor.addTest(function doNotScrollWhenDeletingSelection(testCallback) {
	/*

		Do not scroll/jump when deleting a selection unless file.startRow >= file.grid.length - editor.veiw.visibleRows / 2

	*/

	editor.openFile("testDelSelectionScrolling.txt", '', function(err, file) {
		
		if(err) throw err;
		
		for(var i=2; i<100; i++) {
			file.writeLine("line" + i);
		}
		
		
		var selRow = 10;
		file.scrollToLine(selRow-1);
		
		var startRow = file.startRow;

		if(startRow != (selRow-3)) throw new Error("Expected file.startRow=" + file.startRow + " to be " + (selRow-3));
		
		file.select(file.grid[selRow][0], "right")
		file.select(file.grid[selRow][1], "right")
		file.select(file.grid[selRow][2], "right")
		file.select(file.grid[selRow][3], "right")
		//file.select(file.grid[selRow][4], "right")
		
		
		//throw new Error("hey0");
		
		file.deleteSelection();
		
		if(file.startRow != startRow) throw new Error("The file scrolled when deleting selection.\nExpected startRow=" + startRow + " but file.startRow=" + file.startRow);
		
		
		editor.closeFile(file.path);
		
		testCallback(true);
		
	});
	
});
