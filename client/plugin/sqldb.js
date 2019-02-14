(function() {
	"use strict";
	
	var dbManagerWidget;
	var menuItem;
	
	EDITOR.plugin({
		desc: "Mange SQL databases",
		load: function loadSqldb() {
			
			// todo: Only load if running as a cloud service!
			
			dbManagerWidget = EDITOR.createWidget(buildDbManager);
			menuItem = EDITOR.addMenuItem("Database manager", showDbManager, 20);
			
},
		unload: function unloadSqldb() {
		}
	});
	
	function showDbManager() {
		EDITOR.hideMenu();
		
		if(dbManagerWidget.visible) return hideDbManger();
		
		dbManagerWidget.show();
		EDITOR.updateMenuItem(menuItem, true);
	}
	
	function hideDbManger() {
		dbManagerWidget.hide();
		EDITOR.updateMenuItem(menuItem, false);
	}
	
	function buildDbManager() {
		
		var holder = document.createElement("div");
		holder.setAttribute("class", "wrapper sqldbManager");
		
		var createDbButton = document.createElement("button");
		createDbButton.setAttribute("class", "button");
		createDbButton.innerText = "Create new database ...";
		createDbButton.onclick = createDatabase;
		holder.appendChild(createDbButton);
		
		var cancelButton = document.createElement("button");
		cancelButton.setAttribute("class", "button");
		cancelButton.innerText = "Cancel";
		cancelButton.onclick = hideDbManger;
		holder.appendChild(cancelButton);
		
		/*
			todo: Select database
			
			todo: Run selected query (runs the selected text as a SQL query)
			
		*/
		
		
		return holder;
	}
	
	function createDatabase() {
		promptBox("Database name: ", function(dbName) {
			console.log("createDatabase: dbName=" + dbName);
			CLIENT.cmd("createMysqlDb", {name: dbName}, function(err) {
				if(err) {
					if(err.code == "ER_DB_CREATE_EXISTS") alertBox("The name " + dbName + " is already in use. Try another name or prepend it (" + EDITOR.user + "_" + dbName + ")");
					else alertBox("Unable to create database " + dbName + ": " + err.message + "\ncode=" + err.code);
				}
				else alertBox("Successfully created database " + dbName + " !");
			});
		});
	}
	
	
	
})();

