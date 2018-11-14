
(function() {

	EDITOR.on("start", keyboard_delete);
	
	function keyboard_delete() {
		EDITOR.bindKey({
			desc: "Deletes the one character right of the caret. Or deletes all selected text.",
			charCode: 46, 
			fun: keydel
		});
	}
	
	function keydel(file, combo, character, charCode, keyPush) {
		
		if(EDITOR.input) {
			
			
			
			if(file.selected.length > 0) {
				
				/*
					var firstSelRow = file.rowFromIndex(file.selected[0].index).row;
					var lastSelRow = file.rowFromIndex(file.selected[file.selected.length-1].index).row;
					var rowsBeforeDel = file.grid.length;
					
					var caret = file.copyCaret(file.caret);
				*/
				
				// Delete all selected
				file.deleteSelection();
				
				// Not deleting the rows is a "fature". Reason: it might make diff easier
				
				/*
					var rowsAfterDel = file.grid.length;
					var rowsDeletedBySelection = rowsBeforeDel - rowsAfterDel;
					lastSelRow -= rowsDeletedBySelection;
					
					var firstRow = Math.min(caret.row, file.caret.row, firstSelRow, lastSelRow);
					var lastRow = Math.max(caret.row, file.caret.row, firstSelRow, lastSelRow);
					
					console.log("firstRow=" + firstRow + " caret.row=" + caret.row + " lastRow=" + lastRow + " firstSelRow=" + firstSelRow + " lastSelRow=" + lastSelRow + " rowsDeletedBySelection=" + rowsDeletedBySelection);
					
					// Also delete all empty lines
					if(firstRow != lastRow) {
					var row = firstRow;
					for (var i=firstRow; i<=lastRow; i++) {
					console.log("i=" + i + " row=" + row);
					if(file.grid[row].length == 0) file.removeRow(row);
					else row++;
					}
					}
					
					var moveToRow = caret.row==firstRow ? caret.row : (i-1==lastRow ? row-1 : row);
					console.log("moveToRow=" + moveToRow + " caret.row=" + caret.row + " firstRow=" + firstRow + " row=" + row + " i=" + i);
					file.moveCaret(undefined, moveToRow, caret.col);
				*/
				
				
			}
			else {
				file.deleteCharacter(file.caret);
			}
			
			EDITOR.renderNeeded();
			
			return false; // Prevent default
				
		}
		
		return true;
	}

	// TEST-CODE-START
	// damnit, it turned out the be very hard to get the behaviour corrent, so better need automated test
	function testDeleteSelectedText(callback) {
		
		EDITOR.openFile("testDeleteSelectedText-1.txt", "1\n\n\n\n", function(err, file) {
			if(err) throw err;
			callback(true);
		});
		
	}
	
	EDITOR.addTest(testDeleteSelectedText, 1);
	
	
	// TEST-CODE-END
	
	
})();