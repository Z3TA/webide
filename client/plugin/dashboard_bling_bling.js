(function() {
	
	if(window.location.href.indexOf("dashboard") == -1) return; // Dev Flag 
	
	var toggleDashboardMenuItem;
	
	EDITOR.plugin({
		desc: "Add some bling bling to the dashboard",
		load: function loadDashboardBlingBling() {
			
			toggleDashboardMenuItem = EDITOR.addMenuItem("Dashboard", toggleDashboard);
			
			var key_Esc = 27;
			EDITOR.bindKey({desc: "Hide dashboard", charCode: key_Esc, combo: 0, fun: blingBlingHideDashboard});
			
			EDITOR.dashboard.hide();
			
		},
		unload: function unloadDashboardBlingBling() {
			
			EDITOR.removeMenuItem(toggleDashboardMenuItem);
			
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
		EDITOR.hideMenu();
	}
			
})();