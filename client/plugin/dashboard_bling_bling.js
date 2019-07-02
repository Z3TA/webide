/*
	
	!DO:NOT:BUNDLE!
	
	The dashboard is currently not priotized, but it's a planned feature.
	
	A dashboard is not very useful, adding some some bling bling might however help sell the editor.
	
*/

(function() {
	
	if(window.location.href.indexOf("dashboard") == -1) return; // Dev Flag 
	
	var toggleDashboardMenuItem;
	
	EDITOR.plugin({
		desc: "Add some bling bling to the dashboard",
		load: function loadDashboardBlingBling() {
			
			toggleDashboardMenuItem = EDITOR.ctxMenu.add("Dashboard", toggleDashboard);
			
			var key_Esc = 27;
			EDITOR.bindKey({desc: "Hide dashboard", charCode: key_Esc, combo: 0, fun: blingBlingHideDashboard});
			
			EDITOR.dashboard.hide();
			
		},
		unload: function unloadDashboardBlingBling() {
			
			EDITOR.ctxMenu.remove(toggleDashboardMenuItem);
			
			EDITOR.unbindKey(blingBlingHideDashboard);
			
		}
	});
			
	function blingBlingHideDashboard() {
		EDITOR.dashboard.hide();
		return true;
	}
	
	function toggleDashboard() {
		if(EDITOR.dashboard.isVisible) {
			EDITOR.dashboard.hide();
		}
		else {
			EDITOR.dashboard.show();
		}
		EDITOR.ctxMenu.hide();
	}
			
})();
