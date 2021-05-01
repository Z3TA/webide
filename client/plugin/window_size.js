(function() {
	/*
		Useful for making screen-shots and videos
	*/
	"use strict";
	
	if(DISPLAY_MODE != "standalone") return; // window.resizeTo only works if the app was launched from the desktop or home screen
	
	var windowMenus = [];
	
	EDITOR.plugin({
		desc: "Change window size",
		load: function() {
			
			addMenu(1080,1350);
			addMenu(1080,1080);
			addMenu(1080,608);
			
			windowMenus.push( EDITOR.windowMenu.add("Custom", [S("View"), "Resize window"], customSize)  );
			
			/*
				var resizeToOriginal = window.resizeTo;
				window.resizeTo = function() {
				console.warn("window_size: Called window.resizeTo!");
				resizeToOriginal.apply(window, arguments);
				}
			*/
			
			
		},
		unload: function() {
			windowMenus.forEach(EDITOR.windowMenu.remove);
		}
	});
	
	function addMenu(w, h) {
		windowMenus.push(  EDITOR.windowMenu.add(w + "x" + h, [S("View"), "Resize window"], size(w, h))  );
	}
	
	function size(width, height) {
		return function() {
			setSize(width, height);
		}
	}
	
	function setSize(width, height) {
		var isAtMaxWidth = screen.availWidth - window.innerWidth === 0;
		
		if(isAtMaxWidth) alertBox("Might not be able to resize while the window is maximized!");
		
		//console.log("window_size: isAtMaxWidth=" + isAtMaxWidth + " screen.availWidth=" + screen.availWidth + " window.innerWidth=" + window.innerWidth + " window.height=" + window.height);
		//console.log("window_size: Resizing to " + width + "x" + height + " ");
		window.resizeTo(width, height);
	}
	
	
	function customSize() {
		
		var currentWidth = window.outerWidth;
		var currentHeight = window.outerHeight;
		
		promptBox("Enter size: width x height", {defaultValue: currentWidth + "x" + currentHeight, selectAll: true}, function(size) {

			var arr = size.split("x");

var width = arr[0];
var height = arr[1];

setSize(width, height);
			
		});
	}
	
	
	
})();