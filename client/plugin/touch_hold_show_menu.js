(function() {
	"use strict";
	
	var touchDownTimer;
	
	EDITOR.plugin({
		desc: "Show (context) menu on long touch",
		load: function loadLongTouchShowMenu() {
			
			EDITOR.addEvent("mouseClick", {fun: ltTouchDown, dir: "down", targetClass:"fileCanvas", button: 0});
			EDITOR.addEvent("mouseClick", {fun: ltTouchUp, dir: "up", targetClass:"fileCanvas", button: 0});
			
		},
		unload: function unloadLongTouchShowMenu() {
			
			EDITOR.removeEvent("mouseClick", ltTouchDown);
			EDITOR.removeEvent("mouseClick", ltTouchUp);
			
		}
	});
	
	function ltTouchDown(mouseX, mouseY, caret, direction, button, target, keyboardCombo, mouseDownEvent) {
		
		if(mouseDownEvent.type == "touchstart" && mouseX > (EDITOR.view.canvasWidth - EDITOR.settings.scrollZone)) return;
		if(mouseDownEvent.type == "touchstart" && mouseY > (EDITOR.view.canvasHeight - EDITOR.settings.scrollZone)) return;
		
		touchDownTimer = setTimeout(showMenu, 500);
	}
	
	function ltTouchUp() {
		clearTimeout(touchDownTimer);
	}
	
	function showMenu() {
		
		EDITOR.showMenu();
		
	}
	
	
})();
