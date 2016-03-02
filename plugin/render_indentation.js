(function() {
	/*
		
		If there is a problem, render indentation lines. 
		
	*/
	"use strict";
	
	var lastInsertCBLRow = {};
	var lastInsertCBLLevel = {};
	var force = false; // Toggle
	
	editor.on("start", indention_helper);
	
	function indention_helper() {
		
		editor.renderFunctions.push(indention_render);
		
		editor.on("edit", edit);
		
		var charCode = 73; // I
		
		editor.keyBindings.push({charCode: charCode, combo: CTRL, fun: toggleIndentationHelper});
		
	}
	
	function toggleIndentationHelper() {
		force = force ? false : true;
		
		editor.renderNeeded();
		
		return false; // false prevents default (browser) action
	}
	
	function edit(file, change, text, index, row, col) {
		if(change == "insert") {
			if(text == "{") {
				lastInsertCBLRow[file.path] = row;
				lastInsertCBLLevel[file.path] = file.grid[row].indentation;
				}
			else {
				lastInsertCBLRow[file.path] = -1;
			}
		}
		else {
			lastInsertCBLRow[file.path] = -1;
		}
		}
	
	
	function indention_render(ctx, buffer, file, startRow) {
		
		if(startRow == undefined) startRow = 0;
		
		if(buffer.length == 0) return; // Nothing to render
		
		var tabSpace = editor.settings.tabSpace;
		var gridWidth = editor.settings.gridWidth;
		var gridHeight = editor.settings.gridHeight;
		var leftMargin = editor.settings.leftMargin;
		var topMargin = editor.settings.topMargin;
		
		
		var lastIndentation = file.grid[file.grid.length-1].indentation;
		
		if(lastIndentation > 0 && lastInsertCBLRow[file.path] > -1) {
			var problem = lastInsertCBLLevel[file.path] + 1;
			var problemRow = Math.max(0, lastInsertCBLRow[file.path] - file.startRow + startRow);
		}
		
		console.log("problem=" + problem + " lastInsertCBLRow[" + file.path + "]=" + lastInsertCBLRow[file.path] + " file.startRow=" + file.startRow + " ");
		
		if(problem > 0 || force) {
		
		ctx.strokeStyle = "rgb(219, 219, 219)";
		ctx.lineWidth=0.5;
		
		ctx.beginPath();
		ctx.moveTo(0,0);
		
		for(var row=0; row<buffer.length; row++) {
			
			let level = buffer[row].indentation;
			
			
			for(var lvl=1; lvl<level; lvl++) {
				
				// All lines goes straight down
				
				let x1 = leftMargin + (lvl) * tabSpace * gridWidth + 2.5; // x.5 for sub-pixel (very thin) line
				let y1 = topMargin + (row+startRow) * gridHeight;
				let x2 = x1;
				let y2 = y1 + gridHeight;
				
				ctx.moveTo(x1, y1);
				ctx.lineTo(x1, y2);
					
			}
			
		}
		
		ctx.stroke();
		
			if(problem) {
			ctx.strokeStyle = "rgb(214, 133, 52)";
			ctx.lineWidth=2;
			ctx.beginPath();
			
			for(var row=problemRow; row<buffer.length; row++) {
				
				let level = buffer[row].indentation;
				
				if(level == problem) {
				
					let x1 = leftMargin + (level-1) * tabSpace * gridWidth + 2;
					let y1 = topMargin + (row+startRow) * gridHeight;
					let x2 = x1;
					let y2 = y1 + gridHeight;
			
			ctx.moveTo(x1, y1);
			ctx.lineTo(x1, y2);
			}
			}
			
			ctx.stroke();
			}
		}
		}
	
	
})();
