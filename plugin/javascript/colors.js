(function() {
	/*
		Optimization needed:
		
		colorize: 22.256ms
		
		Try moving the colorization to a prerenderer:
		applyJScolors: 0.168ms
		
		After not needing to reset:
		applyJScolors: 0.013ms
	*/
	
	"use strict";
	
	
	editor.on("start", colors_main);

	function colors_main() {
		//editor.on("fileParse", colorize);

		editor.preRenderFunctions.push(applyJScolors);
		
	}
	
	
	
	function applyJScolors(buffer, file) {
		// This is a preRender function! It must return the buffer!
		
		//file.debugGrid();
		
		if(buffer.length === 0) return buffer;
		
		//var applyColor = applyColor1; // applyColor1 or applyColor2, applyColor1 might be sligly faster!?
		
		//console.time("applyJScolors");
		
		// Asume the buffer doesn't have any colors applied? Nope! 
		//resetColors(buffer); // Makes this function 6 times slower
		
		var firstIndex = buffer[0].startIndex;
		var lastRow = buffer[buffer.length-1];
		var lastIndex = lastRow.length > 0 ? lastRow[lastRow.length-1].index : lastRow.startIndex;
		
		// Color comments
		var comments = file.parsed.comments;
		var commentColor = editor.settings.style.commentColor;
		
		if(comments) {
			for(var i=0; i<comments.length; i++) {
				if(comments[i].start > lastIndex) break;
				applyColor(buffer, comments[i].start, comments[i].end, commentColor, false, true);
			}
		}
		
		// Color xml tags
		var xmlTags = file.parsed.xmlTags;
		var xmlTagColor = editor.settings.style.xmlTagColor;
		
		if(xmlTags) {
			for(var i=0; i<xmlTags.length; i++) {
				if(xmlTags[i].start > lastIndex) break;
				applyColor(buffer, xmlTags[i].start, xmlTags[i].start + xmlTags[i].wordLength, xmlTagColor, false, false);
				if(xmlTags[i].selfEnding) {
					applyColor(buffer, xmlTags[i].end-2, xmlTags[i].end, xmlTagColor, false, false);
				}
				else {
					applyColor(buffer, xmlTags[i].end-1, xmlTags[i].end, xmlTagColor, false, false);
				}
				
			}
		}
		
		// Color quotes
		var quotes = file.parsed.quotes;
		var quoteColor = editor.settings.style.quoteColor;
		
		if(quotes) {
			for(var i=0; i<quotes.length; i++) {
				if(quotes[i].start > lastIndex) break;
				applyColor(buffer, quotes[i].start, quotes[i].end, quoteColor, true, false);
			}
		}
		
		
		
		//console.timeEnd("applyJScolors");

		return buffer;
	}
	
	/*
	function applyColor2(gridBuffer, colorStart, colorEnd, color) {
		var gridRow, colIndex;
		for(var row = 0; row<gridBuffer.length; row++) {
			gridRow = gridBuffer[row];
			
			for(var col=gridRow.length-1; col>=0; col--) { // Check last column first
				colIndex = gridRow[col].index;

				if(colIndex < colorStart) {
					//console.log("col=" + col + "colIndex=" +colIndex + " colorStart=" + colorStart + " colorEnd=" + colorEnd + " char=" + gridRow[col].char + " color=" + color + " break");

					break; // We are done on this row
				}
				else if(colIndex >= colorStart && colIndex <= colorEnd) {
					//console.log("col=" + col + "colIndex=" +colIndex + " colorStart=" + colorStart + " colorEnd=" + colorEnd + " char=" + gridRow[col].char + " color=" + color + " coloring!");
					gridRow[col].color = color;
				}
				else {
					//console.log("col=" + col + "colIndex=" +colIndex + " colorStart=" + colorStart + " colorEnd=" + colorEnd + " char=" + gridRow[col].char + " color=" + color + " no color");
				}
			}
			
		}
	}
	*/
	
	function applyColor(grid, startIndex, endIndex, color, quote, comment) {
		
		var gridRow;
		
		for(var row=grid.length-1; row>=0; row--) { // Start from bottom

			gridRow = grid[row];
			
			if(endIndex >= gridRow.startIndex) {
				
				for(var col=gridRow.length-1; col>=0; col--) {
					
					
					if(gridRow[col].index < startIndex) {
						//console.log("col=" + col + " gridRow[" + col + "].index=" + gridRow[col].index + " startIndex=" + startIndex + " endIndex=" + endIndex + " char=" + gridRow[col].char + " color=" + color + " break");
						break;
					}
					else if(gridRow[col].index <= endIndex) {
						//console.log("col=" + col + " gridRow[" + col + "].index=" + gridRow[col].index + " startIndex=" + startIndex + " endIndex=" + endIndex + " char=" + gridRow[col].char + " color=" + color + " Coloring!");

						gridRow[col].color = color;
						
						if(quote) {
							gridRow[col].quote = true;
						}
						else if(comment) {
							gridRow[col].comment = true;
						}
						
					}
					else {
						//console.log("col=" + col + " gridRow[" + col + "].index=" + gridRow[col].index + " startIndex=" + startIndex + " endIndex=" + endIndex + " char=" + gridRow[col].char + " color=" + color + " do nothing");
					}
					
				}
			}
			else if(startIndex >= gridRow.startIndex) {
				break;
			}

		}
		
	}
	
	
	
	/*
	
	function colorize(file) {

		console.time("colorize");
		var js = file.parsed;
		
		resetColors(file.grid);
		
		colorComments(js.comments, file);
		
		colorQuotes(js.quotes, file);
		
		console.timeEnd("colorize");
	}
	

	function colorComments(comments, file) {
		
		var color = editor.settings.style.commentColor;

		comments.forEach(colorComment);
		
		function colorComment(comment) {
			var range = file.createTextRange(comment.start, comment.end);
			
			range.forEach(changeBoxColor);
			
			function changeBoxColor(box) {
				box.color = color;
				box.comment = true;
			}
			
		}
		
	}
	
	
	function colorQuotes(quotes, file) {
		
		var color = editor.settings.style.quoteColor;
		
		//console.log(JSON.stringify(quotes, null, 4));
		
		//console.log("Total quotes: " + quotes.length);
		
		// Computer Heuristics
		
		for(var i=0; i<quotes.length; i++) {
			//console.log(i + " = " + JSON.stringify(quotes[i], null, 4));
			
			colorQuote(quotes[i]);
		}
		
		function colorQuote(quote) {
			
			//console.log(typeof quote);
			
			var range = file.createTextRange(quote.start, quote.end);
			
			//console.log(JSON.stringify(range, null, 4));
			
			range.forEach(changeBoxColor);
			
			function changeBoxColor(box) {
				box.color = color;
				//box.char = "Z";
				box.quote = true;
			}
			
		}
		

	}
	
	function resetColors(grid) {
		var defaultColor = editor.settings.style.textColor;
		for(var row=0; row<grid.length; row++) {
			for(var col=0; col<grid[row].length; col++) {
				grid[row][col].color = defaultColor;
			}
		}
	}
	
*/

})();