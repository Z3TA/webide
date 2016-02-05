(function() {
	
	"use strict";
	
	var delta = 5;
		
	global.keyBindings.push({charCode: 39, combo: ALT, fun: right});
	global.keyBindings.push({charCode: 37, combo: ALT, fun: left});
	
	global.keyBindings.push({charCode: 38, combo: ALT, fun: up});
	global.keyBindings.push({charCode: 40, combo: ALT, fun: down});

	
	function right(file) {
		global.view.endingColumn += delta;
		file.startColumn += delta;
		
		file.sanityCheck();
		
		editor.renderNeeded();
		
	}
	
	function left(file) {
		
		if(file.startColumn > 0) {
			if(file.startColumn > delta) {
				global.view.endingColumn -= delta;
				file.startColumn -= delta;
			}
			else {
				global.view.endingColumn = global.view.visibleColumns;
				file.startColumn = 0;
			}
			
			editor.renderNeeded();
		}

	}
	
	function up(file) {
		verticalScroll(file, -1);
	}
	
	function down(file) {
		verticalScroll(file, 1);
	}
	
	function verticalScroll(file, direction) {
		file.scroll(undefined, direction * delta);
	}
	
})();
