
(function() {

var winMenuHide;
	var ctxWinMenuShow;
	
	EDITOR.plugin({
		desc: "Hide the window menu",
		load: function loadHideWindowMenu() {

			winMenuHide = EDITOR.windowMenu.add("Window menu", ["View", 13], hideWindowMenu);
winMenuHide.activate();

},
		unload: function unloadHideWindowMenu() {

			if(ctxWinMenuShow) EDITOR.ctxMenu.remove(ctxWinMenuShow);
			
		}
});
	
	function hideWindowMenu() {
		EDITOR.windowMenu.disable();
		
		ctxWinMenuShow = EDITOR.ctxMenu.add("Show window menu", showWindowMenu, 20);
	}
	
	function showWindowMenu() {
		EDITOR.windowMenu.enable();
		EDITOR.ctxMenu.hide();
		EDITOR.ctxMenu.remove(ctxWinMenuShow);
		ctxWinMenuShow = undefined;
	}

})();