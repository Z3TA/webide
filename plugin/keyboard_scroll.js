(function() {
	
	"use strict";
	
	var delta = 5;
		
	editor.keyBindings.push({charCode: 39, combo: ALT, fun: right});
	editor.keyBindings.push({charCode: 37, combo: ALT, fun: left});
	
	editor.keyBindings.push({charCode: 38, combo: ALT, fun: up});
	editor.keyBindings.push({charCode: 40, combo: ALT, fun: down});

	
	function right(file) {
		
		if(!file) return true;
		
		editor.view.endingColumn += delta;
		file.startColumn += delta;
		
		file.sanityCheck();
		
		editor.renderNeeded();
		
		return false;
		
	}
	
	function left(file) {
		
		if(!file) return true;
		
		if(file.startColumn > 0) {
			if(file.startColumn > delta) {
				editor.view.endingColumn -= delta;
				file.startColumn -= delta;
			}
			else {
				editor.view.endingColumn = editor.view.visibleColumns;
				file.startColumn = 0;
			}
			
			editor.renderNeeded();
		}
		
		return false;
	}
	
	function up(file) {
		verticalScroll(file, -1);
		return false;
	}
	
	function down(file) {
		verticalScroll(file, 1);
		return false;
	}
	
	function verticalScroll(file, direction) {
		file.scroll(undefined, direction * delta);
	}
	
})();
