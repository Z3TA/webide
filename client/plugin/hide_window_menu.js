
(function() {

var winMenuHide;
	var ctxWinMenuShow;
	
	EDITOR.plugin({
		desc: "Hide the window menu",
		load: function loadHideWindowMenu() {

			winMenuHide = EDITOR.windowMenu.add(S("window_menu"), [S("View"), 140], hideWindowMenu);
winMenuHide.activate();

},
		unload: function unloadHideWindowMenu() {

			if(ctxWinMenuShow) EDITOR.ctxMenu.remove(ctxWinMenuShow);
			
			EDITOR.windowMenu.remove(winMenuHide);
			
		}
});
	
	function hideWindowMenu() {
		EDITOR.windowMenu.disable();
		
		ctxWinMenuShow = EDITOR.ctxMenu.add("Show window menu", showWindowMenu, 20);
		EDITOR.ctxMenu.activate(ctxWinMenuShow);
		
		alertBox('To show the window menu again: <b>Right click</b> (or long touch) to bring up the context menu ,and click <i>"Show window menu</i>"');
		
	}
	
	function showWindowMenu() {
		EDITOR.windowMenu.enable();
		EDITOR.ctxMenu.hide();
		EDITOR.ctxMenu.remove(ctxWinMenuShow);
		ctxWinMenuShow = undefined;
	}

})();