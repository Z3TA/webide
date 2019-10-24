(function() {
/*
	
	Handy when editing the CSS, for example making a theme.
	
*/

	var winMenuCSS_refresh;
	
	EDITOR.plugin({
		desc: "Enables refreshing the CSS",
		load: load,
		unload: unload,
		});
	
	function load() {
		var F6 = 117;
		EDITOR.bindKey({desc: "Refresh CSS", charCode: F6, fun: refreshCss, combo: 0});
		
		winMenuCSS_refresh = EDITOR.windowMenu.add("Refresh CSS/theme", [S("Editor"), 7], refreshCss);
		
		}
	
	function unload() {
		EDITOR.unbindKey(refreshCss);
	
		EDITOR.windowMenu.remove(winMenuCSS_refresh);
	}
	
	function refreshCss() {
		var links = document.getElementsByTagName('link');
		
		for (var i=0; i<links.length; i++) {
			if(links[i].getAttribute("rel").toLowerCase().indexOf("stylesheet") != -1) {
				links[i].href = links[i].href  + "?date=" + new Date().getMilliseconds();
			}
		}
		//alertBox("CSS refreshed");
		
		return false;
	}
	
})();

