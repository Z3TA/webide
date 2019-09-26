(function() {
	"use strict";
	
	var dbManagerWidget;
	var menuItem;
	var selectedDb = "information_schema";
	var queryFileId = 0;
	var selectMysqlDb; // Select element
	var winMenuDbManager;
	var discoveryBarImg;
	var pluginActivated = false;
	
	EDITOR.plugin({
		desc: "Mange SQL databases",
		load: function loadSqldb() {
			
			// Only load if db service is available!
			if(CLIENT.connectionId) checkDbService();
			else CLIENT.on("loginSuccess", checkDbServiceOnceLoggedIn);
			
			function checkDbServiceOnceLoggedIn() {
				CLIENT.removeEvent("loginSuccess", checkDbServiceOnceLoggedIn);
				checkDbService();
			}
			
			function checkDbService() {
				CLIENT.cmd("mysql.query", {database: selectedDb, query: "SELECT 1+1"}, function(err, resp) {
					if(err) {
						console.log("loadSqldb: No database service available!? " + err.message);
}
else {
						console.log("loadSqldb: query resp:", resp);
			
			dbManagerWidget = EDITOR.createWidget(buildDbManager);
			menuItem = EDITOR.ctxMenu.add("Database manager", showDbManager, 20);
			
			winMenuDbManager = EDITOR.windowMenu.add("Database manager", ["Tools", 2], showDbManager);
			
			EDITOR.on("fileOpen", sqlFileMaybe);
			
			var char_Esc = 27;
			EDITOR.bindKey({desc: "Hide SQL db manager widget", charCode: char_Esc, fun: hideDbManager});
			
			EDITOR.registerAltKey({char: "l", alt:2, label: "db/SQL", fun: showDbManager});
			
			discoveryBarImg = document.createElement("img");
						discoveryBarImg.setAttribute("id", "sqlDiscovery");
			discoveryBarImg.src = "gfx/database.svg"; // Icon created by: https://www.flaticon.com/authors/phatplus
			discoveryBarImg.title = "SQL Database"
			discoveryBarImg.onclick = toggleDbManager;
						EDITOR.discoveryBar.add(discoveryBarImg, 80);
						
						pluginActivated = true;
			}
				});
			}
		},
		unload: function unloadSqldb() {
			
			if(!pluginActivated) return;
			
			EDITOR.ctxMenu.remove(menuItem);
			
			EDITOR.windowMenu.remove(winMenuDbManager);
			
			if(dbManagerWidget) dbManagerWidget.unload();
			
			EDITOR.removeEvent("fileOpen", sqlFileMaybe);
			
			EDITOR.unbindKey(hideDbManager);
			
			EDITOR.unregisterAltKey(showDbManager);
			
		}
	});
	
	function sqlFileMaybe(file) {
		
		var ext = UTIL.getFileExtension(file.path);
		
		if(ext.match(/sql/i)) showDbManager();
		
	}
	
	function showDbManager() {
		EDITOR.ctxMenu.hide();
		winMenuDbManager.hide();
		discoveryBarImg.setAttribute("class", "active");
		//if(dbManagerWidget.visible) return hideDbManager();
		
		dbManagerWidget.show();
		EDITOR.ctxMenu.update(menuItem, true);
	}
	
	function hideDbManager() {
		dbManagerWidget.hide();
		EDITOR.ctxMenu.update(menuItem, false);
		discoveryBarImg.setAttribute("class", "");
		
		return ALLOW_DEFAULT;
	}
	
	function toggleDbManager() {
		if(dbManagerWidget && dbManagerWidget.visible) {
			hideDbManager();
		}
		else {
			showDbManager();
		}
	}
	
	function buildDbManager() {
		
		var holder = document.createElement("div");
		holder.setAttribute("class", "wrapper sqldbManager");
		
		var selectDbLabel = document.createElement("label");
		selectDbLabel.setAttribute("for", "selectMysqlDb");
		selectDbLabel.innerText = "Select database: ";
		holder.appendChild(selectDbLabel);
		
		selectMysqlDb = document.createElement("select");
		selectMysqlDb.setAttribute("id", "selectMysqlDb");
		selectMysqlDb.setAttribute("class", "select");
		selectMysqlDb.onchange = changeDb;
		holder.appendChild(selectMysqlDb);
		
		var informationSchemaOption = document.createElement("option");
		informationSchemaOption.innerText = "information_schema";
		selectMysqlDb.appendChild(informationSchemaOption);
		
		var queryButton = document.createElement("button");
		queryButton.setAttribute("class", "button");
		queryButton.innerText = "Run selected text as query";
		queryButton.title = "Runs the selected text as a query on the currently selected database";
		queryButton.onclick = runQuery;
		holder.appendChild(queryButton);
		
		var createTableButton = document.createElement("button");
		createTableButton.setAttribute("class", "button");
		createTableButton.innerText = "Create Table ...";
		createTableButton.onclick = createTable;
		holder.appendChild(createTableButton);
		
		var createDbButton = document.createElement("button");
		createDbButton.setAttribute("class", "button");
		createDbButton.innerText = "Create New database ...";
		createDbButton.onclick = createDatabase;
		holder.appendChild(createDbButton);
		
		
		var cancelButton = document.createElement("button");
		cancelButton.setAttribute("class", "button");
		cancelButton.innerText = "Cancel";
		cancelButton.onclick = hideDbManager;
		holder.appendChild(cancelButton);
		
		/*
			todo: Select database
			
			todo: Run selected query (runs the selected text as a SQL query)
			
		*/
		
		getDatabases();
		
		return holder;
	}
	
	function changeDb(e) {
		console.log(e);
		
		selectedDb = selectMysqlDb.options[selectMysqlDb.selectedIndex].value;
	}
	
	function getDatabases(selectedName) {
		CLIENT.cmd("mysql.query", {database: selectedDb, query: "SHOW DATABASES"}, function(err, resp) {
			if(err) return alertBox(err.message);
			
			// Empty options
			while (selectMysqlDb.options.length > 0) selectMysqlDb.remove(0);
			
			var results = resp.results;
			var fields = resp.fields;
			
			// Fill options
			for (var i=0, name=""; i<results.length; i++) {
				name = results[i].Database
				var option = document.createElement("option");
				option.innerText = name;
				
				if(name == selectedName) {
option.setAttribute("selected", "selected");
					selectedDb = selectedName;
				}
				
				selectMysqlDb.add(option);
			}
		});
	}
	
	function createDatabase() {
		promptBox("Database name: ", function(dbName) {
			console.log("createDatabase: dbName=" + dbName);
			if(dbName != null) CLIENT.cmd("createMysqlDb", {name: dbName}, function(err) {
				if(err) {
					if(err.code == "ER_DB_CREATE_EXISTS") alertBox("The name " + dbName + " is already taken. Try another name or prepend it (" + EDITOR.user.name + "_" + dbName + ")");
					else alertBox("Unable to create database " + dbName + ": " + err.message + "\ncode=" + err.code);
				}
				else alertBox("Successfully created database " + dbName + " !");
				
				getDatabases(dbName);
			});
		});
	}
	
	function createTable() {
		openQueryFile(function(err, file) {
			if(err) throw err;
			
			file.writeLineBreak();
			file.writeLineBreak();
			
			var selStart = file.caret.index;
			
			file.writeLine("CREATE TABLE foo (");
			file.writeLine("bar VARCHAR(20) DEFAULT NULL");
			file.writeLine(")");
			
			var selEnd = file.caret.index;
			
			file.writeLineBreak();
			file.writeLineBreak();
			
			var selectRange = file.createTextRange(selStart, selEnd);
			file.select(selectRange);
			
		});
	}
	
	function runQuery(ev) {
		
		console.log("runQuery: event:");
		console.log(ev);
		
		ev.target.blur(); // Prevent further key presses/runs
		
		var selectedText = EDITOR.currentFile && EDITOR.currentFile.getSelectedText();
		
		if(!selectedText) return alertBox("No text is selected! You need to select some text!");
		
		CLIENT.cmd("mysql.query", {database: selectedDb, query: selectedText}, function(queryError, resp) {
			
			var results = resp && resp.results;
			var fields = resp && resp.fields;
			
			console.log("runQuery: results=" + JSON.stringify(results, null, 2));
			console.log("runQuery: fields=" + JSON.stringify(fields, null, 2));
			console.log("runQuery: queryError=" + (!!queryError ? queryError.message : queryError) );
			
			if(results && results.length == 0) return alertBox("The query returned no results!\n\n<pre>" + selectedText.trim() + "</pre>");
			
			// Show the query commented out
			var queryText = "# " + selectedText.trim().replace(/(\r\n|\n)/, "$1# ") + "\n\n";
			
			openQueryFile(queryText, function showResult(err, file) {
				if(err) return alertBox(err.message);
				
				if(queryError) {
					alertBox(queryError.message);
					/*
						file.writeLineBreak();
						file.write(queryError.message);
						file.writeLineBreak();
					*/
}
				else write(results, file);
			
				EDITOR.stat("sql_query");
				
			});
			
		});
		}
	
	function openQueryFile(initialText, callback) {
		/*
			Opens a file for writing and showing SQL queries
			
			note: initialText is only appended if a new file is opened!
			
		*/
		
		if(typeof initialText == "function" && callback == undefined) {
			callback = initialText;
			initialText = undefined;
		}
		
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
		
		var fileName = "db-query_" + queryFileId;
		
		var file = EDITOR.files[fileName];
		
		if(initialText == undefined) initialText = "";
		
		if(file) {
callback(null, file);
		}
		else {
			
			EDITOR.openFile(fileName, initialText, function dbQueryResultFileOpened(err, file) {
				if(err) return callback(err);
				
				file.parse = false; // Tell eager parsers not to parse it
				
				callback(null, file);
			});
		}
	}
	
	function write(results, file) {
		// todo: Handle results larger then the editor can handle
		
		file.writeLineBreak();
		file.writeLineBreak();
		
		if(Array.isArray(results)) {
			var keys = Object.keys(results[0]);
		}
else {
			var keys = Object.keys(results);
		}
		
		// Calculate optimal padding
		
		var maxColumns = EDITOR.view.visibleColumns;
		var maxLength = {};
		var hasLineBreaks = {};
		
		for (var j=0; j<keys.length; j++) {
			//console.log("sqldb.js:write: keys[" + j + "]=" + keys[j]);
			maxLength[ keys[j] ] = len(keys[j]);
			//console.log("sqldb.js:write: maxLength=" + JSON.stringify(maxLength));
		}
		
		//console.log("sqldb.js:write: maxLength=" + JSON.stringify(maxLength) + " keys=" + JSON.stringify(keys));
		
		if(Array.isArray(results)) {
			
			var value = "";
			var key = "";
			for (var i=0; i<results.length; i++) {
				for (var j=0; j<keys.length; j++) {
					key = keys[j];
					value = UTIL.toString(results[i][key]);
					results[i][key] = value; // So we don't have to convert to string again at next run'
					
					console.log("sqldb.js:write: maxLength[" + key + "]=" + maxLength[key] + " len(results[" + i + "][" + keys[j] + "])=" + len(value) );
					maxLength[key] = Math.max( maxLength[key], len(value) );
					if( value.indexOf("\n") != -1 ) hasLineBreaks[ key ] = true;
					
				}
			}
			
			console.log("sqldb.js:write: maxLength=" + JSON.stringify(maxLength));
			
			var totalLength = 0;
			for(var key in maxLength) totalLength += maxLength[key];
			
			console.log("sqldb.js:write: totalLength=" + totalLength + " maxColumns=" + maxColumns + " keys=" + JSON.stringify(keys) + " maxLength=" + JSON.stringify(maxLength));
			
			
			// Sort the keys so that the longest is last
			// Or if it contains line breaks, it should also be last
			
			keys.sort(function(a, b) {
				if(hasLineBreaks[a] && !hasLineBreaks[b]) return 1;
				else if(hasLineBreaks[b] && !hasLineBreaks[a]) return -1;
				else {
					// Sort by text length
					if(maxLength[a] > maxLength[b]) return 1;
					else if(maxLength[b] > maxLength[a]) return -1;
					else return 0;
				}
			});
			
			
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
			var lastPadding = totalLength - maxLength[keys[keys.length-1]] + keys.length-1;
			for (var i=0; i<results.length; i++) {
				for (var j=0; j<keys.length; j++) {
					key = keys[j];
					value = results[i][key]; // Already converted to string
					
					if(j == keys.length-1 && value.indexOf("\n") != -1) {
						// The last item, we can split it 
						var rows = value.split(/\r\n|\n/);
						console.log("sqldb.js:write: rows.length=" + rows.length + " lastPadding=" + lastPadding);
						for (var row=0; row<rows.length; row++) {
							file.write( (row==0 ? "": padding(lastPadding)) + rows[row], true );
						}
					}
					else {
						console.log("sqldb.js:write: j=" + j + " keys.length=" + keys.length + " value.indexOf('\\n')=" + value.indexOf("\n") );
						file.write( value );
					}
					
					if(j<keys.length-1) file.write(  padding( maxLength[keys[j]] - len(results[i][keys[j]]) + 1 )  );
					
				}
				file.writeLineBreak();
			}
			
			//file.writeLineBreak();
			file.writeLine("Total: " + results.length + " records");
		}
		else {
			/*
				If results is not an array, print the keys
				
				Place the longest result last
			*/
			
			var longestKeyLength = 0;
			for (var j=0; j<keys.length; j++) {
				if( len(keys[j]) > longestKeyLength) longestKeyLength = len(keys[j]);
			}
			
			keys.sort(function(a, b) {
				if( len(results[a]) > len(results[b]) ) return 1;
				else if( len(results[b]) > len(results[a]) ) return -1;
				else return 0;
			});
			
			for (var j=0; j<keys.length; j++) {
				file.write( keys[j] + ": " );
				file.write(  padding( longestKeyLength - len(keys[j]) )  );
				
				file.write(results[keys[j]]);
				file.writeLineBreak();
			}
			
		}
		
		
		file.writeLineBreak();
		file.writeLineBreak();
		
		EDITOR.renderNeeded();
		EDITOR.showFile(file);
	}
	
	
	
	function padding(n) {
		var space = " ";
		return space.repeat(n);
	}
	
	function len(obj) {
		
		//console.log("len: ", obj);
		
		if(typeof obj == "string") return obj.length;
		
		var str = UTIL.toString(obj);
		
		//console.log("len: str=" + str);
		
		//console.log("len: returning " + str.length);
		
		return str.length;
	}
	
	
	// TEST-CODE-START
	
	EDITOR.addTest(function testMysqlResultFromCreateTable(callback) {
		EDITOR.openFile("testMysqlResultFromCreateTable", "", function(err, file) {
			if(err) throw err;
			
			var results= {
				"fieldCount": 0,
				"affectedRows": 0,
				"insertId": 0,
				"info": "",
				"serverStatus": 2,
				"warningStatus": 0
			};
			
			write(results, file);
			
			var results = [
				{name: "Jon Doe", age: 35},
				{name: "Åke Åkare", age: 61},
				{name: "Magda Marit", age: 31},
				{name: "Peeter Potatis", age: 28},
				{name: "My Musk", age: 42}
			];
			
write(results, file);
			
			var results = [
				{
name: "Lord of the Rings", 
					text: "Gandalf: A wizard is never late, Frodo Baggins. ...\nFrodo Baggins: I wish the ring had never come to me. ...\nSauron: You can not hide, I see you! ...\nGandalf: YOU SHALL NOT PASS! ...\nFrodo Baggins: Mordor! ...\nBilbo Baggins: No, thank you!"
				},
				
				{
					name: "Short story",
					text: "Det var en gång en gång som var krattad"
				}
			];
			
			write(results, file);
			
			EDITOR.closeFile(file);
			
			return callback(true);
			});
		});
	
	// TEST-CODE-END
	
})();

