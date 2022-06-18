/*
	@@ -38,14 +38,20 @@
	
	@@ -[starting at line on old],[lines included removed lines] +[starting at line on new],[nr of lines including added lines] @@
	
*/

(function() {
	EDITOR.plugin({
		desc: "Add colors to .diff files",
		load: function loadDiffColor() {
			// Highlight.js takes care of the coloring of the .diff files
			//EDITOR.addPreRender(applyDiffColors);
			EDITOR.on("dblclick", gotoSource);
		},
		unload: function unloadDiffColor() {
			//EDITOR.removePreRender(applyDiffColors);
			EDITOR.removeEvent("dblclick", gotoSource);
		},
	});
	
	function gotoSource(mouseX, mouseY, caret, button, target, keyboardCombo) {
		var file = EDITOR.currentFile;
		if( !isDiffFile(file) ) return;
		if(!caret) return;

		// Search up until we find a row starting with @@
		var parsedLine;
		var removedRows = 0;
		for (var row=caret.row-1, rowStart=0; row>0; row--) {
			rowStart = file.grid[row].startIndex;

			//console.log("diff: row=" + row + " firstChar=" + file.text.slice(rowStart, rowStart+1) );

			if( file.text.slice(rowStart, rowStart+1) == "-") removedRows++;

			if(file.text.slice(rowStart, rowStart+2) == "@@") {
				parsedLine = parseLine( file.rowText(row) );
				if(parsedLine) break;
			}
		}
		if(!parsedLine) return;

		var gotoLine = parsedLine.newStart + (caret.row - row) - 1 - removedRows;
		//console.log("diff: gotoLine=" + gotoLine + " parsedLine.newStart=" + parsedLine.newStart + " caret.row=" + caret.row + " row=" + row + " removedRows=" + removedRows);

		// Find the file path on the line starting with +++ b
		var reFilePath = /\+\+\+ b([^\t]+)/;
		for (var row=0, match; row<file.grid.length; row++) {
			match = file.rowText(row).match(reFilePath);
			if(match) break;
		}
		if(!match) return;

		//console.log("diff: path match=", match);

		var path = match[1];

		// Unfortunately most diffs don't show the full path!
		var fullPath = UTIL.joinPaths(EDITOR.workingDirectory, path);
		
		var recursionCount = 0;

		openFileAndgotoLine(fullPath, 0);

		function openFileAndgotoLine(fullPath) {
			//console.log("diff: openFileAndgotoLine: fullPath=" + fullPath + " recursionCount=" + recursionCount);
			if(++recursionCount > 2) return alertBox("Unable to find " + path + " (line " + gotoLine + ")");
			EDITOR.openFile(fullPath, undefined, function(err, file) {
				if(err && err.code == "ENOENT") return findPath(path, openFileAndgotoLine);

				if(err) return alertBox("Failed to open \nError: " + err.message);

				// Scroll to and place the caret on the line
				file.gotoLine(gotoLine); // Async func
			});
		}

		function findPath(path, callback) {
			// path is /foo/bar.txt, search the file system for that path...

			var delimiter = UTIL.getPathDelimiter(path);
			var folders = path.split(delimiter);
			if(folders[0] == "") folders.shift();
			var findFolder = folders[0];

			//console.log("diff: path=" + path + " findFolder=" + findFolder + " folders=", folders);

			EDITOR.findFileReverseRecursive([findFolder], EDITOR.workingDirectory, function(err, files) {
				if(err && files.length==0) alertBox("Unable to find original file from the diff! " + err.message);

				folders.shift();

				//console.log("diff: path=" + path + " files=", files);
				callback( UTIL.joinPaths(files[0], folders.join(delimiter)) );
			})
		}
	}

	function parseLine(aadiff) {
		var reDiff = /@@ -(\d+),(\d+) \+(\d+),(\d+) @@/;
		var match = aadiff.match(reDiff);
		if(match == null) return undefined;
		if( match.length != 5) throw new Error("Expected match.length=" + match.length + " to be 5! match=" + JSON.stringify(match, null, 2));
		// @@ -[starting at line on old],[lines included removed lines] +[starting at line on new],[nr of lines including added lines] @@
		return {
			oldStart: parseInt(match[1]), 
			oldLines: parseInt(match[2]), 
			newStart: parseInt(match[3]),
			newLines: parseInt(match[4])
		};
	}

	function isDiffFile(file) {
		return file && file.path.slice(-5) == ".diff";
	}

	/*
		function applyDiffColors(buffer, file) {
		if( !isDiffFile(file) ) return buffer;

		var colorNew = EDITOR.settings.style.addedTextColor; // green
		var colorOld = EDITOR.settings.style.removedTextColor; // red

		for(var row = 0; row<buffer.length; row++) {

		if(buffer[row][0] && buffer[row][0].char == "-" && !(buffer[row].length > 2 && buffer[row][buffer[row].length-1].char == "-")) {
		colorRow(row, colorOld);
		}
		else if(buffer[row][0] && buffer[row][0].char == "+") {
		colorRow(row, colorNew);
		}
		}

		return buffer;

		function colorRow(row, color) {
		for(var col=0; col<buffer[row].length; col++) {
		buffer[row][col].color = color;
		}
		}
		}
	*/
	
})();
