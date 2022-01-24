(function() {

	EDITOR.plugin({
		desc: "Select a column",
		load: function loadSelCol() {
			EDITOR.addEvent("dblclick", {fun: selectTheColumn, targetClass:"fileCanvas", button: 0, combo: CTRL});
		},
		unload: function unloadSelCol() {
			EDITOR.removeEvent("dblclick", selectTheColumn);
		}
	});
	
	function selectTheColumn(mouseX, mouseY, caret) {
		var file = EDITOR.currentFile;
		//console.log("selectTheColumn: caret=" + JSON.stringify(caret) + " file.path=" + (typeof file == "object" && file.path));
		if(file == undefined) return ALLOW_DEFAULT;

		return selectColumn(file, caret);
	}

	function selectColumn(file, caret) {

		// Find delimiter
		var tabs = 0;
		var twoSpaces = 0;
		var semicolon = 0;
		var comma = 0;
		var pipe = 0;
		var rowText = file.rowText(caret.row);

		for (var i=0; i<rowText.length; i++) {
			if(rowText.charAt(i) == "\t") tabs++;
			else if(rowText.charAt(i) == ";") semicolon++;
			else if(rowText.charAt(i) == ",") comma++;
			else if(rowText.charAt(i) == "|") pipe++;
			else if(rowText.charAt(i) == " " && rowText.charAt(i+1) == " ") {
				twoSpaces++;
				i++;
			}
		}

		if(tabs > 0) var delimiter = "\t";
		else if(pipe > 0 && pipe > semicolon) var delimiter = "|";
		else if(semicolon > 0 && semicolon > comma) var delimiter = ";";
		else if(comma > 0 && comma > twoSpaces) var delimiter = ",";
		else if(twoSpaces > 0) var delimiter = " ";
		else return ALLOW_DEFAULT;

		//console.log("selectColumn: rowText=" + rowText + " delimiter=" + delimiter + " tabs=" + tabs + " pipe=" + pipe + " semicolon=" + semicolon + " comma=" + comma + " twoSpaces=" + twoSpaces + " ");

		// Select the column we clicked on
		var col = findColumn(rowText, file.grid[caret.row].startIndex);
		var columnToFind = col.column;
		//console.log("selectColumn: columnToFind=" + columnToFind + " row=" + caret.row + " col=", col);
		
		var totalColumns = col.tot;
		var cols = [];
		cols.push(col);

		// Search up
		for (var row=caret.row-1; row>1; row--) {
			col = findColumn(file.rowText(row), file.grid[row].startIndex, columnToFind);
			if(col.tot < totalColumns) break;

			cols.push(col);
		}

		// Search down
		for (var row=caret.row+1; row<file.grid.length; row++) {
			col = findColumn(file.rowText(row), file.grid[row].startIndex, columnToFind);
			if(col.tot < totalColumns) break;

			cols.push(col);
		}

		// Sort the selection so if it's copied it will be copied in order
		cols.sort(numericSort); // mutates array

		function numericSort(a, b) {
			if(a.start > b.start) return 1;
			else if(b.start > a.start) return -1;
			else return 0;
		}

		cols.forEach(function(col) {
			var textRange = file.createTextRange(col.start, col.end);
			file.select(textRange);
		});

		return PREVENT_DEFAULT;

		function findColumn(rowText, rowStartIndex, columnToFind) {

			//console.log("selectColumn: findColumn: columnToFind=" + columnToFind + " rowText=" + rowText);

			var column = 0;
			var columnIndex = 0;
			for (var i=0; (columnToFind==undefined && i<caret.col) || (columnToFind != undefined && column < columnToFind && i<rowText.length) ; i++) {
				if(delimiter == rowText.charAt(i)) {
					if(delimiter==" " && rowText.charAt(i+1) == " ") {
						continue;
					}
					else if(delimiter=="\t" && rowText.charAt(i+1) == "\t") {
						continue;
					}
					else {
						column++;
						columnIndex = i+1;
					}
				}
			}
			var columnAt = column;
			var columnEndIndex = 0;
			for (; i<rowText.length; i++) {
				if(delimiter == rowText.charAt(i)) {
					if(delimiter==" " && rowText.charAt(i+1) == " ") {
						continue;
					}
					else if(delimiter=="\t" && rowText.charAt(i+1) == "\t") {
						continue;
					}
					else {
						column++;
						if(columnEndIndex===0) columnEndIndex = i-1;
					}
				}
			}

			if(columnEndIndex===0) columnEndIndex = i-1;
			var totalColumns = column;

			//console.log("selectColumn: findColumn: column=" + column + " columnAt=" + columnAt + " columnIndex=" + columnIndex + " columnEndIndex=" + columnEndIndex + " ");

			return {start: columnIndex + rowStartIndex, end: columnEndIndex + rowStartIndex, tot: totalColumns, column: columnAt};
		}

	}


})();