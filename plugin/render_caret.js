(function() {
	
	editor.renderFunctions.push(caretRender);

	function caretRender(ctx, buffer, file) {
		
		
		var caret = file.caret,
			row = caret.row,
			col = caret.col,
			indentation = file.grid[row].indentation,
			left = editor.settings.leftMargin + (col - file.startColumn + indentation * editor.settings.tabSpace) * editor.settings.gridWidth,
			top = editor.settings.topMargin + (row-file.startRow) * editor.settings.gridHeight;

		
		
		console.log("Rendering caret");
		
		ctx.fillStyle = editor.settings.caret.color;
		
		ctx.fillRect(left, top, editor.settings.caret.width, editor.settings.gridHeight);

		// Show the "direction" of the caret
		ctx.fillRect(left, top+editor.settings.gridHeight - editor.settings.caret.width, 4, editor.settings.caret.width);

		/*
		console.log("caret: " + JSON.stringify(caret));
		
		if(caret.index == file.text.length) {
			console.log("caret at EOF");
		}
		else if(caret.eol) {
			console.log("caret at EOL on row " + caret.row);
		}
		else {
			console.log("caret at char=" + file.grid[caret.row][caret.col].char + "=" + file.text.charAt(caret.index) + " charCode=" + file.text.charCodeAt(caret.index) + "");
		}
		*/
		
	}

})();