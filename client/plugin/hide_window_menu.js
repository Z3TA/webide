
(function() {

var winMenuHide;
	var ctxWinMenuShow;
	
	EDITOR.plugin({
		desc: "Hide the window menu",
		load: function loadHideWindowMenu() {

			EDITOR.on("storageReady", hideWindowMenuMaybe);
			
			winMenuHide = EDITOR.windowMenu.add(S("window_menu"), [S("View"), 140], hideWindowMenuFromWindowMenu);
winMenuHide.activate();

},
		unload: function unloadHideWindowMenu() {

			if(ctxWinMenuShow) EDITOR.ctxMenu.remove(ctxWinMenuShow);
			
			EDITOR.windowMenu.remove(winMenuHide);
			
			EDITOR.removeEvent("storageReady", hideWindowMenuMaybe);
		}
});
	
	function hideWindowMenuFromWindowMenu() {
		hideWindowMenu();
		
		alertBox('To show the window menu again: <b>Right click</b> (or long touch) to bring up the context menu ,and click <i>"Show window menu</i>"');
	}
	
	function hideWindowMenuMaybe() {
	
		var hide = EDITOR.storage.getItem("hide_window_menu");
		
		if(hide == "true") hideWindowMenu();
		
	}
	
	function hideWindowMenu() {
		EDITOR.windowMenu.disable();
		
		ctxWinMenuShow = EDITOR.ctxMenu.add("Show window menu", showWindowMenu, 20);
		EDITOR.ctxMenu.activate(ctxWinMenuShow);

if(EDITOR.storage.ready()) EDITOR.storage.setItem("hide_window_menu", "true");
	}
	
	function showWindowMenu() {
		EDITOR.windowMenu.enable();
		EDITOR.ctxMenu.hide();
		EDITOR.ctxMenu.remove(ctxWinMenuShow);
		ctxWinMenuShow = undefined;

if(EDITOR.storage.ready()) EDITOR.storage.setItem("hide_window_menu", "false");
	}

})();