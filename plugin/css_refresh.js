(function() {
/*
	
	Handy when editing the CSS, for example making a theme.
	
*/

	editor.plugin({
		desc: "Enables refreshing the CSS",
		load: load,
		unload: unload,
		});
	
	function load() {
		var F6 = 117;
		editor.bindKey({desc: "Refresh CSS", charCode: F6, fun: refreshCss, combo: 0});
		}
	
	function unload() {
		editor.unbindKey(refreshCss);
	}
	
	function refreshCss() {
		var links = document.getElementsByTagName('link');
		
		for (var i=0; i<links.length; i++) {
			if(links[i].getAttribute("rel").toLowerCase().indexOf("stylesheet") != -1) {
				links[i].href = links[i].href  + "?date=" + new Date().getMilliseconds();
			}
		}
		console.log("CSS refreshed");
		return false;
	}
	
})();

