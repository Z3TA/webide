/*
	Creates a new file
*/

(function() {
	
	"use strict";
	
	var menuItem;
	var dashboardWidget;
	
	EDITOR.plugin({
		desc: "Create new file option to context menu and bound to Ctrl + N",
		load: function load() {
			// Bind to ctrl + N
			EDITOR.bindKey({desc: "Create new file", charCode: 78, combo: CTRL, fun: createNewFile});
			
			menuItem = EDITOR.addMenuItem("Create new file", createNewFile);
			
			dashboardWidget = EDITOR.addDashboardWidget(createNewFileButton());
			
		},
		unload: function unload() {
			EDITOR.removeMenuItem(menuItem);
			
			EDITOR.unbindKey(createNewFile);
			
			EDITOR.removeDashboardWidget(dashboardWidget);
			
		},
		order: 1
	});
	
	
	function createNewFile(file, combo, character, charCode, direction) {
		
		EDITOR.hideMenu();
		EDITOR.hideDashboard();
		
		var content = "";
		var path = "new file";
		
		EDITOR.openFile(path, content, function(err, file) {
			// Mark the file as NOT saved, because its a NEW file
			file.isSaved = false;
			file.savedAs = false;
		});
				
		EDITOR.renderNeeded();
		EDITOR.resizeNeeded();
		
		return false;
		
	}
	
	function createNewFileButton() {
		
		var newFileButton = document.createElement("button");
		newFileButton.appendChild(document.createTextNode("New file ..."));
		newFileButton.onclick = createNewFile;
		
		return newFileButton;
		
	}
	
	
})();


