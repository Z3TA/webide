(function() {
	"use strict";
	
	var touchDownTimer;
	var touchTooLongTimer;
	var showTheMenu = false;
	
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
		
		console.log("ltTouchDown! mouseDownEvent.type=" + mouseDownEvent.type + " mouseDownEvent.which=" + mouseDownEvent.which + " direction=" + direction);
		
		if(mouseDownEvent.which > 1) {
			// The user is using a regular mouse, so this plugin is not necessary
			// Unload the module to free up resources
			unloadLongTouchShowMenu();
			return true;
		}
		
		if(mouseDownEvent.type != "touchstart") return true;
		
		//console.log(mouseDownEvent);
		
		touchDownTimer = setTimeout(function showMenu() {
			showTheMenu = true;
			console.log("ltTouchDown touchDownTimer!");
		}, 300);
		
		touchTooLongTimer = setTimeout(function showMenu() {
			showTheMenu = false;
			console.log("ltTouchDown touchTooLongTimer!");
		}, 1500);
		
		return true;
		
	}
	
	function ltTouchUp(mouseX, mouseY, caret, direction, button, target, keyboardCombo, mouseDownEvent) {
		
		console.log("ltTouchUp showTheMenu=" + showTheMenu);
		
		if(mouseDownEvent.type != "touchend") return true;
		
		//console.log(mouseDownEvent);
		
		clearTimeout(touchDownTimer);
		clearTimeout(touchTooLongTimer);
		
		if(showTheMenu) {
EDITOR.ctxMenu.show(mouseX, mouseY, mouseDownEvent);
			showTheMenu = false;
		}
		
		return true;
	}
	
	
	
})();
