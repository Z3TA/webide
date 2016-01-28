(function() {
	/*
		Optimization needed:
		
		colorize: 22.256ms
		
		Try moving the colorization to a prerenderer:
		applyJScolors: 0.168ms
		
	*/
	
	editor.on("start", colors_main);

	function colors_main() {
		//editor.on("fileParse", colorize);

		global.preRenders.push(applyJScolors);
		
	}
	
	
	
	function applyJScolors(buffer, file) {
		// This is a preRender function! It must returnt he buffer!
		
		if(buffer.length === 0) return buffer;
		
		console.time("applyJScolors");
		
		// Asume the buffer doesn't have any colors applied? Nope! 
		// Makes this function 6 times slower
		resetColors(buffer);
			
		var firstIndex = buffer[0].startIndex;
		var lastRow = buffer[buffer.length-1];
		var lastIndex = lastRow.length > 0 ? lastRow[lastRow.length-1].index : lastRow.startIndex;
		
		// Color comments
		var comments = file.parsed.comments;
		var commentColor = global.settings.style.commentColor;
		
		if(comments) {
			for(var i=0; i<comments.length; i++) {
				if(comments[i].start > lastIndex) break;
				applyColor(buffer, comments[i].start, comments[i].end, commentColor);
			}
		}
		
		// Color quotes
		var quotes = file.parsed.quotes;
		var quoteColor = global.settings.style.quoteColor;
		
		if(quotes) {
			for(var i=0; i<quotes.length; i++) {
				if(quotes[i].start > lastIndex) break;
				applyColor(buffer, quotes[i].start, quotes[i].end, quoteColor);
			}
		}
		
		console.timeEnd("applyJScolors");

		return buffer;
	}
	
	function applyColor(grid, startIndex, endIndex, color) {
		var gridRow;
		
		for(var row=grid.length-1; row>=0; row--) {

			gridRow = grid[row];
			
			if(endIndex >= gridRow.startIndex) {
				
				for(var col=gridRow.length-1; col>=0; col--) {

					if(gridRow[col].index < startIndex) {
						console.log("Break from col: char=" + gridRow[col].char + " index=" + gridRow[col].index + " startIndex=" + startIndex);
						break;
					}
					else if(gridRow[col].index <= endIndex) {
						console.log("Coloring: color=" + color + " char=" + gridRow[col].char + " index=" + gridRow[col].index + " endIndex=" + endIndex);

						gridRow[col].color = color;
					}
					else {
						console.log("Doing nothing! char=" + gridRow[col].char + " index=" + gridRow[col].index + " startIndex=" + startIndex);
					}
					
				}
			}
			else if(startIndex >= gridRow.startIndex) {
				break;
			}

		}
	}
	
	
	
	
	function colorize(file) {

		console.time("colorize");
		var js = file.parsed;
		
		resetColors(file.grid);
		
		colorComments(js.comments, file);
		
		colorQuotes(js.quotes, file);
		
		console.timeEnd("colorize");
	}
	

	function colorComments(comments, file) {
		
		var color = global.settings.style.commentColor;

		comments.forEach(colorComment);
		
		function colorComment(comment) {
			var range = file.createTextRange(comment.start, comment.end);
			
			range.forEach(changeBoxColor);
			
			function changeBoxColor(box) {
				box.color = color;
			}
			
		}
		
	}
	
	
	function colorQuotes(quotes, file) {
		
		var color = global.settings.style.quoteColor;
		
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
			}
			
		}
		

	}
	
	function resetColors(grid) {
		var defaultColor = global.settings.style.textColor;
		for(var row=0; row<grid.length; row++) {
			for(var col=0; col<grid[row].length; col++) {
				grid[row][col].color = defaultColor;
			}
		}
	}
	


})();