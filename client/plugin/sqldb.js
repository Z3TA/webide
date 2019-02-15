(function() {
	"use strict";
	
	var dbManagerWidget;
	var menuItem;
	var selectedDb = "information_schema";
	var queryFileId = 0;
	
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
		
		var queryButton = document.createElement("button");
		queryButton.setAttribute("class", "button");
		queryButton.innerText = "Execute selected text";
		queryButton.title = "Runs text selected in the editor as a database query"
		queryButton.onclick = runQuery;
		holder.appendChild(queryButton);
		
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
	
	function runQuery() {
		
		var selectedText = EDITOR.currentFile && EDITOR.currentFile.getSelectedText();
		
		if(!selectedText) return alertBox("No text is selected! You need to select some text!");
		
		CLIENT.cmd("mysql.query", {database: selectedDb, query: selectedText}, function(err, resp) {
			var results = resp.results;
			var fields = resp.fields;
			
			console.log("runQuery: results=" + JSON.stringify(results, null, 2));
			console.log("runQuery: fields=" + JSON.stringify(fields, null, 2));
			
			if(results.length == 0) return alertBox("The query returned no results!\n\n<pre>" + selectedText.trim() + "</pre>");
			
			// ## Show query results
			if(queryFileId == 0) {
				/*
					This is the first time we run db queries in this session
					We do not want to add stuff to already opened query results.
				*/
				
				var reQueryFile = /db\-queries(\d*)$/
				
				for(var path in EDITOR.files) {
					var fileName = UTIL.getFilenameFromPath(path);
					var match = fileName.match(reQueryFile);
					if(match && match.length > 1) {
						var id = parseInt(match[1]);
						if(id >= queryFileId) queryFileId = id+1;
					}
				}
			}
			
			var fileName = "db-queries" + queryFileId;
			
			var file = EDITOR.files[fileName];
			
			if(file) write(results, file);
			else {
				EDITOR.openFile(fileName, "", function(err, file) {
					if(err) throw err;
					
					file.parse = false; // Tell eager parsers not to parse it
					
					// Show the query commented out
					var queryText = "# " + selectedText.trim().replace(/(\r\n|\n)/, "$1# ");
					
					file.write(queryText);
					file.writeLineBreak();
					file.writeLineBreak();
					
					write(results, file);
				});
			}
		});
		}
	
	function write(results, file) {
		// todo: Handle results larger then the editor can handle
		
		
		// Figure out the field names
		var keys = Object.keys(results[0]);
		var keyLength = keys.length;
		
		// Calculate optimal padding
		
		var maxColumns = EDITOR.view.visibleColumns;
		var maxLength = [];
		for (var j=0; j<keys.length; j++) {
			maxLength[keys[j]] = len(keys[j]);
		}
		
		console.log("sqldb.js:write: maxLength=" + JSON.stringify(maxLength));
		
		for (var i=0; i<results.length; i++) {
			for (var j=0; j<keys.length; j++) {
				console.log("sqldb.js:write: maxLength[" + keys[j] + "]=" + maxLength[keys[j]] + " len(results[" + i + "][" + keys[j] + "])=" + len(results[i][keys[j]]) );
				maxLength[keys[j]] = Math.max( maxLength[keys[j]], len(results[i][keys[j]]) );
			}
		}
		
		console.log("sqldb.js:write: maxLength=" + JSON.stringify(maxLength));
		
		var totalLength = 0;
		for(var key in maxLength) totalLength += maxLength[key];
		
		console.log("sqldb.js:write: totalLength=" + totalLength + " maxColumns=" + maxColumns + " keys=" + JSON.stringify(keys) + " maxLength=" + JSON.stringify(maxLength));
		
		if(totalLength > maxColumns) {
			// Sort the keys so that the longest is last
			
			keys.sort(function(a, b) {
				if(maxLength[a] > maxLength[b]) return 1;
				else if(maxLength[b] > maxLength[a]) return -1;
				else return 0;
			});
		}
		
		// Print key headings with padding
		for (var j=0; j<keys.length; j++) {
			file.write(keys[j]);
			
			if(j<keys.length-1) file.write(  padding( maxLength[keys[j]] - len(keys[j]) + 1 )  ); 
		}
		// Print a fat line
		var line = "";
		for (var i=0; i<totalLength+keys.length; i++) {
			line += "=";
		}
		file.writeLine(line);
		
		file.writeLineBreak();
		
		// Print the data with padding
		for (var i=0; i<results.length; i++) {
			for (var j=0; j<keys.length; j++) {
				file.write( results[i][keys[j]] );
				
				if(j<keys.length-1) file.write(  padding( maxLength[keys[j]] - len(results[i][keys[j]]) + 1 )  );
			}
			file.writeLineBreak();
		}
		
		//file.writeLineBreak();
		file.writeLine("Total: " + results.length + " records");
		
	}
	
	function padding(n) {
		var str = "";
		for (var i=0; i<n; i++) {
			str += " ";
		}
		return str;
	}
	
	function len(obj) {
		if(typeof obj == "string") return obj.length;
		else if(typeof obj.toString == "function") return obj.toString().length;
		else if(obj == null) return String(obj).length;
		else throw new Error("Unable to get length of obj=" + JSON.stringify(obj));
	}
	
	
})();

