(function() {
	"use strict";
	
	var touchDownTimer;
	
	EDITOR.plugin({
		desc: "Show (context) menu on long touch",
		load: function loadLongTouchShowMenu() {
			
			EDITOR.addEvent("mouseClick", {fun: ltTouchDown, dir: "down", targetClass:"fileCanvas"});
			EDITOR.addEvent("mouseClick", {fun: ltTouchUp, dir: "up", targetClass:"fileCanvas"});
			
			EDITOR.addEvent("mouseMove", {fun: ltMouseMove, targetClass:"fileCanvas"});
			
		},
		unload: unloadLongTouchShowMenu
	});
	
	function unloadLongTouchShowMenu() {
		
		EDITOR.removeEvent("mouseClick", ltTouchDown);
		EDITOR.removeEvent("mouseClick", ltTouchUp);
		
		EDITOR.removeEvent("mouseMove", ltMouseMove);
		
	}
	
	function ltMouseMove(mouseX, mouseY, target, mouseMoveEvent) {
		// Don't show the menu when swiping
		if(mouseMoveEvent.type=="touchmove") clearTimeout(touchDownTimer);
		}
	
	function ltTouchDown(mouseX, mouseY, caret, direction, button, target, keyboardCombo, mouseDownEvent) {
		
		if(mouseDownEvent.which > 1) {
			// The user is using a regular mouse, so this plugin is not necessary
			// Unload the module to free up resources
			unloadLongTouchShowMenu();
			return true;
		}
		
		if(mouseDownEvent.type != "touchstart") return true;
		
		if(mouseX > (EDITOR.view.canvasWidth - EDITOR.settings.scrollZone)) return true;
		if(mouseY > (EDITOR.view.canvasHeight - EDITOR.settings.scrollZone)) return true;
		
		console.log(mouseDownEvent);
		
		touchDownTimer = setTimeout(function showMenu() {
			
			EDITOR.showMenu(mouseX, mouseY, mouseDownEvent);
			
		}, 500);
	}
	
	function ltTouchUp(mouseX, mouseY, caret, direction, button, target, keyboardCombo, mouseDownEvent) {
		
		if(mouseDownEvent.type != "touchend") return;
		
		console.log(mouseDownEvent);
		
		clearTimeout(touchDownTimer);
	}
	
	
	
})();
