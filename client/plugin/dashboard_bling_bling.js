/*
	
	A dashboard is not very useful, adding some some "bling bling" might however help sell the editor.
	
*/

(function() {
	
	var winMenuDashboard;
	
	EDITOR.plugin({
		desc: "Add some bling bling to the dashboard",
		load: function loadDashboardBlingBling() {
			
			var key_Esc = 27;
			EDITOR.bindKey({desc: "Hide dashboard", charCode: key_Esc, combo: 0, fun: blingBlingHideDashboard});
			
			winMenuDashboard = EDITOR.windowMenu.add("Dashboard", ["View", 10], toggleDashboard);
			
			EDITOR.on("showDashboard", dashboardVisible);
			EDITOR.on("hideDashboard", dashboardHidden);
			
			EDITOR.dashboard.hide();
			
		},
		unload: function unloadDashboardBlingBling() {
			
			EDITOR.windowMenu.remove(winMenuDashboard);
			
			EDITOR.unbindKey(blingBlingHideDashboard);
			
			EDITOR.removeEvent("showDashboard", dashboardVisible);
			EDITOR.removeEvent("hideDashboard", dashboardHidden);
			
		}
	});
	
	function dashboardVisible() {
		winMenuDashboard.activate();
		
		return true;
	}
	
	function dashboardHidden() {
		winMenuDashboard.deactivate();
		
		return true;
	}
	
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
		winMenuDashboard.hide();
	}
			
})();
