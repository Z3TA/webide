(function() {
	
	"use strict";
	
	var delta = 5;
		
	EDITOR.bindKey({desc: "Scroll to the right", charCode: 39, combo: ALT, fun: right});
	EDITOR.bindKey({desc: "Scroll to the left", charCode: 37, combo: ALT, fun: left});
	
	EDITOR.bindKey({desc: "Scroll up", charCode: 38, combo: ALT, fun: up});
	EDITOR.bindKey({desc: "Scroll down", charCode: 40, combo: ALT, fun: down});

	EDITOR.windowMenu.add("Scroll right", ["Navigate", 20], right, true);
	EDITOR.windowMenu.add("Scroll left", ["Navigate", 20], left);
	EDITOR.windowMenu.add("Scroll up", ["Navigate", 20], up);
	EDITOR.windowMenu.add("Scroll down", ["Navigate", 20], down);
	
	function right(file) {
		
		if(!file) return true;
		
		EDITOR.view.endingColumn += delta;
		file.startColumn += delta;
		
		file.sanityCheck();
		
		EDITOR.renderNeeded();
		
		return false;
		
	}
	
	function left(file) {
		
		if(!file) return true;
		
		if(file.startColumn > 0) {
			if(file.startColumn > delta) {
				EDITOR.view.endingColumn -= delta;
				file.startColumn -= delta;
			}
			else {
				EDITOR.view.endingColumn = EDITOR.view.visibleColumns;
				file.startColumn = 0;
			}
			
			EDITOR.renderNeeded();
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
