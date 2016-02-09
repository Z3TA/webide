(function() {
	
	global.renders.push(caretRender);

	function caretRender(ctx, buffer, file) {
		
		
		var caret = file.caret,
			row = caret.row,
			col = caret.col,
			indentation = file.grid[row].indentation,
			left = global.settings.leftMargin + (col - file.startColumn + indentation * global.settings.tabSpace) * global.settings.gridWidth,
			top = global.settings.topMargin + (row-file.startRow) * global.settings.gridHeight;

		
		
		console.log("Rendering caret");
		
		ctx.fillStyle = global.settings.caret.color;
		
		ctx.fillRect(left, top, global.settings.caret.width, global.settings.gridHeight);

		// Show the "direction" of the caret
		ctx.fillRect(left, top+global.settings.gridHeight - global.settings.caret.width, 4, global.settings.caret.width);

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