(function() {
	"use strict";
	
	var touchDownTimer;
	
	EDITOR.plugin({
		desc: "Show (context) menu on long touch",
		load: function loadLongTouchShowMenu() {
			
			EDITOR.addEvent("mouseClick", {fun: ltTouchDown, dir: "down", targetClass:"fileCanvas", button: 0});
			EDITOR.addEvent("mouseClick", {fun: ltTouchUp, dir: "up", targetClass:"fileCanvas", button: 0});
			
			EDITOR.addEvent("mouseMove", {fun: ltMouseMove, targetClass:"fileCanvas"});
			
		},
		unload: function unloadLongTouchShowMenu() {
			
			EDITOR.removeEvent("mouseClick", ltTouchDown);
			EDITOR.removeEvent("mouseClick", ltTouchUp);
			
			EDITOR.removeEvent("mouseMove", ltMouseMove);
			
		}
	});
	
	function ltMouseMove(mouseX, mouseY, target, mouseMoveEvent) {
		// Don't show the menu when swiping
		if(mouseMoveEvent.type=="touchmove") clearTimeout(touchDownTimer);
		}
	
	function ltTouchDown(mouseX, mouseY, caret, direction, button, target, keyboardCombo, mouseDownEvent) {
		
		if(mouseDownEvent.type != "touchstart") return;
		
		if(mouseX > (EDITOR.view.canvasWidth - EDITOR.settings.scrollZone)) return;
		if(mouseY > (EDITOR.view.canvasHeight - EDITOR.settings.scrollZone)) return;
		
		console.log(mouseDownEvent);
		
		touchDownTimer = setTimeout(function showMenu() {
			
			EDITOR.showMenu(mouseX, mouseY);
			
		}, 500);
	}
	
	function ltTouchUp(mouseX, mouseY, caret, direction, button, target, keyboardCombo, mouseDownEvent) {
		
		if(mouseDownEvent.type != "touchend") return;
		
		console.log(mouseDownEvent);
		
		clearTimeout(touchDownTimer);
	}
	
	
	
})();
