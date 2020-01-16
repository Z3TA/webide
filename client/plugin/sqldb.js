(function() {
	"use strict";
	
	var dbManagerWidget;
	var menuItem;
	var selectedDb = "information_schema";
	var queryFileId = 0;
	var selectMysqlDb; // Select element
	var winMenuDbManager;
	var discoveryBarIcon;
	var databaseList;
	var dbExplorerWidget;
	var connectedToDbServer = false;
	var getDefaultValuesForDbConnection; // Store function in order to be able to remove event
	var connectionManager;
	//var tableEditor;
	var createTableHelper;
	var addColumnHelper;
	var addKeyHelper;
	
	var mySqlDataTypes = [
		"VARCHAR",
		"TEXT",
		"INT",
		"DATETIME",
		"TIMESTAMP"
	];
	
	var keyKinds = [
		"INDEX",
		"PRIMARY",
		"UNIQUE",
		"FULLTEXT",
		"SPATIAL"
	];
	
	var keyTypes = [
		"BTREE",
		"HASH",
		"RTREE"
	];
	
	EDITOR.plugin({
		desc: "Mange SQL databases",
		load: function loadSqldb() {
			
			dbManagerWidget = EDITOR.createWidget(buildDbManager);
			connectionManager = EDITOR.createWidget(buildConnectionManager);
			//tableEditor = EDITOR.createWidget(buildTableEditor);
			createTableHelper = EDITOR.createWidget(buildCreateTableHelper);
			addColumnHelper = EDITOR.createWidget(buildAddColumnHelper);
			addKeyHelper = EDITOR.createWidget(buildAddKeyHelper);
			
			var rightColumn = document.getElementById("rightColumn");
			dbExplorerWidget = EDITOR.createWidget(buildDbExplorer, rightColumn)
			
			menuItem = EDITOR.ctxMenu.add("Database manager", showDbManager, 20);
			
			winMenuDbManager = EDITOR.windowMenu.add(S("database_manager"), [S("Tools"), 2], showDbManager);
			
			EDITOR.on("fileOpen", sqlFileMaybe);
			
			var char_Esc = 27;
			EDITOR.bindKey({desc: "Hide SQL db manager widget", charCode: char_Esc, fun: hideDbManager});
			
			EDITOR.registerAltKey({char: "l", alt:2, label: "SQL db", fun: showDbManager});
			
			discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/database.svg", 120, S("sql_database"), "DB", toggleDbManager);
			// Icon created by: https://www.flaticon.com/authors/phatplus
			
			
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
						connectedToDbServer = true;
			
			}
				});
			}
		},
		unload: function unloadSqldb() {
			
			if(getDefaultValuesForDbConnection) EDITOR.removeEvent("storageReady", getDefaultValuesForDbConnection);
			
			EDITOR.ctxMenu.remove(menuItem);
			
			EDITOR.windowMenu.remove(winMenuDbManager);
			
			if(dbManagerWidget) dbManagerWidget.unload();
			if(dbExplorerWidget) dbExplorerWidget.unload();
			
			EDITOR.removeEvent("fileOpen", sqlFileMaybe);
			
			EDITOR.unbindKey(hideDbManager);
			
			EDITOR.unregisterAltKey(showDbManager);
			
			EDITOR.discoveryBar.remove(discoveryBarIcon);
		}
	});
	
	function sqlFileMaybe(file) {
		
		var ext = UTIL.getFileExtension(file.path);
		
		if(ext.match(/sql/i)) showDbManager();
		
	}
	
	function showDbManager() {
		EDITOR.ctxMenu.hide();
		winMenuDbManager.hide();
		discoveryBarIcon.classList.add("active");
		//if(dbManagerWidget.visible) return hideDbManager();
		
		dbManagerWidget.show();
		EDITOR.ctxMenu.update(menuItem, true);
	}
	
	function showDbExplorer() {
		dbExplorerWidget.show();
	}
	
	function hideDbManager() {
		dbManagerWidget.hide();
		EDITOR.ctxMenu.update(menuItem, false);
		discoveryBarIcon.classList.remove("active");
		
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
	
	function buildDbExplorer() {
		var wrap = document.createElement("div");
		wrap.classList.add("wrap");
		wrap.classList.add("dbExplorer");
		
		var content = document.createElement("div");
		
		databaseList = document.createElement("ul");
		databaseList.classList.add("tree");
		
		wrap.appendChild(databaseList);
		
		wrap.appendChild(content);
		
		return wrap;
	}
	
	function updateDbExplorer(dbNames) {
		
		if(!databaseList) showDbExplorer();
		
		while (databaseList.firstChild) databaseList.removeChild(databaseList.firstChild);
		
		dbNames.forEach(function(name) {
			
			console.log("dbExplorer: database name=" + name);
			
			var li = document.createElement("li");
			li.setAttribute("id", name);
			
			li.addEventListener("click", function clickOnDatabase(e) {
				
				console.log("dbExplorer: Click on database " + name + " e=", e);
				
				// Try to stop event from propagating down though parents
				e = window.event || e;
				e.stopPropagation();
				if( e.target !== this) {
					console.warn("dbExplorer: Click e.target=" + e.target + " not on database " + name + "");
					return;
				}
				
				showOrHideTables(li, name);
				
				return false;
				
			}, false);
			
			
			
			var icon = document.createElement("img");
			icon.setAttribute("width", "18");
			icon.setAttribute("height", "18");
			icon.setAttribute("draggable", "false");
			icon.setAttribute("src", "gfx/icon/db.svg");
			icon.setAttribute("alt", "db");
			
			li.appendChild(icon);
			
			li.oncontextmenu = function contextmenu(contextMenuEvent) {
				contextMenuEvent.preventDefault();
				contextMenuEvent.stopPropagation(); // Prevent from bubbling to parent node
				
				showContextMenu(li, name);
				
			};
			
			var displayName = name;
			var maxNameLength = 40;
			if(displayName.length > maxNameLength) {
				li.setAttribute("title", displayName);
				displayName = displayName.substr(0, maxNameLength-3) + "...";
			}
			
			li.appendChild(document.createTextNode(displayName));
			
			databaseList.appendChild(li);
			
		});
		
	}
	
	function showOrHideTables(dbListItem, dbName) {
		
		var subList = dbListItem.getElementsByTagName("ul");
		
		if(subList.length > 0) {
			// "close" the list
			for(var i=0; i<subList.length; i++) {
				dbListItem.removeChild(subList[i]);
			}
			return;
		}
		
		CLIENT.cmd("mysql.query", {database: dbName, query: "SHOW TABLES"}, function(err, resp) {
			
			if(err) return alertBox(err.message);
			
			console.log("dbExplorer: show tables: resp=" + JSON.stringify(resp, null, 2));
			
			var tables = resp.results.map(function(obj) {
				return obj["Tables_in_" + dbName];
			});
			
			var tableList = document.createElement("ul");
			
			tables.forEach(function(tableName) {
				
				var li = document.createElement("li");
				li.setAttribute("id", tableName);
				
				var icon = document.createElement("img");
				icon.setAttribute("width", "16");
				icon.setAttribute("height", "16");
				icon.setAttribute("draggable", "false");
				icon.setAttribute("src", "gfx/icon/table.svg");
				icon.setAttribute("alt", "db-table");
				
				li.appendChild(icon);
				
				li.addEventListener("click", function clickOnTable(e) {
					
					console.log("dbExplorer: Click on table " + tableName + " e=", e);
					
					e = window.event || e;
					e.stopPropagation();
					if( e.target !== this) {
						console.warn("dbExplorer: Click e.target=" + e.target + " not on table " + tableName + "");
return;
					}
					
					showOrHideFields(li, dbName, tableName);
					
					return false;
					
				}, false);
				
				li.oncontextmenu = function contextmenu(contextMenuEvent) {
					contextMenuEvent.preventDefault();
					contextMenuEvent.stopPropagation(); // Prevent from bubbling to parent node
					
					showContextMenu(li, dbName, tableName);
					
				};
				
				li.ondblclick = makeSelectAll(tableName, dbName);
				
				var displayName = tableName;
				var maxNameLength = 40;
				if(displayName.length > maxNameLength) {
					li.setAttribute("title", displayName);
					displayName = displayName.substr(0, maxNameLength-3) + "...";
				}
				
				li.appendChild(document.createTextNode(displayName));
				
				tableList.appendChild(li);
				
			});
			
			dbListItem.appendChild(tableList);
			
		});
		
	}
	
	
	function showOrHideFields(tableListItem, dbName, tableName) {
		
		var subList = tableListItem.getElementsByTagName("ul");
		
		if(subList.length > 0) {
			// "close" the list
			for(var i=0; i<subList.length; i++) {
				tableListItem.removeChild(subList[i]);
			}
			return;
		}
		
		CLIENT.cmd("mysql.query", {database: dbName, query: "DESCRIBE " + tableName }, function(err, resp) {
			if(err) return alertBox(err.message);

			console.log("dbExplorer: DESCRIBE: resp=" + JSON.stringify(resp, null, 2));
			
			var fields = resp.results;
			
			var fieldList = document.createElement("ul");
			
			fields.forEach(function(obj) {
				
				var fieldName = obj.Field;
				
				var li = document.createElement("li");
				li.setAttribute("id", fieldName);
				
				
				var icon = document.createElement("img");
				icon.setAttribute("width", "12");
				icon.setAttribute("height", "12");
				icon.setAttribute("draggable", "false");
				icon.setAttribute("src", "gfx/icon/field.svg");
				icon.setAttribute("alt", "table-field");
				
				li.appendChild(icon);
				
				
				var displayName = fieldName;
				var maxNameLength = 40;
				if(displayName.length > maxNameLength) {
					li.setAttribute("title", displayName);
					displayName = displayName.substr(0, maxNameLength-3) + "...";
				}
				
				li.appendChild(document.createTextNode(displayName));
				
				li.oncontextmenu = function contextmenu(contextMenuEvent) {
					contextMenuEvent.preventDefault();
					contextMenuEvent.stopPropagation(); // Prevent from bubbling to parent node
					
					showContextMenu(li, dbName, tableName, fieldName);
					
				};
				
				fieldList.appendChild(li);
				
			});
			
			tableListItem.appendChild(fieldList);
			
		});
		
	}
	
	function showContextMenu(li, dbName, tableName, fieldName) {

		var subList = li.getElementsByTagName("ul");
		
		if(subList.length > 0) {
			// Place menu before the sub list
		}
		else {
			// Place menu where?
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
		
		var connectButton = document.createElement("button");
		connectButton.setAttribute("class", "button");
		connectButton.innerText = "Connect to DB server...";
		connectButton.onclick = showConnectToServer;
		holder.appendChild(connectButton);
		
		var cancelButton = document.createElement("button");
		cancelButton.setAttribute("class", "button");
		cancelButton.innerText = "Close dialog";
		cancelButton.onclick = hideDbManager;
		
		var closeDialogKeyBind = document.createElement("span");
		closeDialogKeyBind.appendChild(document.createTextNode( EDITOR.getKeyFor(hideDbManager) ));
		closeDialogKeyBind.setAttribute("class", "key inline");
		cancelButton.appendChild(closeDialogKeyBind);
		
		holder.appendChild(cancelButton);
		
		
		if(connectedToDbServer) getDatabases();
		
		return holder;
		
		function showConnectToServer() {
			connectionManager.show();
			dbManagerWidget.hide();
		}
	}
	
	function buildConnectionManager() {
		// ### Connect dialog
		
		var connectDialog = document.createElement("div");
		
		//var connectionCaption = document.createElement("legend")
		//connectionCaption.innerText = "Connect to mySQL server:"
		//connectDialog.appendChild(connectionCaption);
		
		var table = document.createElement("table");
		var tr = document.createElement("tr");
		
		var td = document.createElement("td");
		td.setAttribute("align", "right");
		var labelHostname = document.createElement("label");
		labelHostname.setAttribute("for", "inputHostname");
		labelHostname.innerText = "Hostname: ";
		td.appendChild(labelHostname);
		tr.appendChild(td);
		
		var td = document.createElement("td");
		var inputHostname = document.createElement("input");
		inputHostname.setAttribute("type", "text");
		inputHostname.setAttribute("size", "20");
		td.appendChild(inputHostname);
		tr.appendChild(td);
		
		var td = document.createElement("td");
		td.setAttribute("align", "right");
		var labelUsername = document.createElement("label");
		labelUsername.setAttribute("for", "inputUsername");
		labelUsername.innerText = "Username: ";
		td.appendChild(labelUsername);
		tr.appendChild(td);
		
		var td = document.createElement("td");
		var inputUsername = document.createElement("input");
		inputUsername.setAttribute("size", "15");
		inputUsername.setAttribute("type", "text");
		td.appendChild(inputUsername);
		tr.appendChild(td);
		
		var td = document.createElement("td");
		var connectToDbServerButton = document.createElement("button");
		connectToDbServerButton.setAttribute("class", "button");
		connectToDbServerButton.innerText = "Connect";
		connectToDbServerButton.onclick = connectToServer;
		td.appendChild(connectToDbServerButton);
		tr.appendChild(td);
		
		
		table.appendChild(tr);
		var tr = document.createElement("tr");
		
		var td = document.createElement("td");
		td.setAttribute("align", "right");
		var labelPort = document.createElement("label");
		labelPort.setAttribute("for", "inputPort");
		labelPort.innerText = "Port: ";
		td.appendChild(labelPort);
		tr.appendChild(td);
		
		var td = document.createElement("td");
		var inputPort = document.createElement("input");
		inputPort.setAttribute("type", "text");
		inputPort.setAttribute("type", "number");
		inputPort.setAttribute("min", "0");
		inputPort.setAttribute("max", "65535");
		inputPort.setAttribute("size", "6");
		inputPort.value = 3306;
		td.appendChild(inputPort);
		tr.appendChild(td);
		
		
		var td = document.createElement("td");
		td.setAttribute("align", "right");
		var labelPassword = document.createElement("label");
		labelPassword.setAttribute("for", "inputPassword");
		labelPassword.innerText = "Password: ";
		td.appendChild(labelPassword);
		tr.appendChild(td);
		
		
		var td = document.createElement("td");
		var inputPassword = document.createElement("input");
		inputPassword.setAttribute("type", "password");
		inputPassword.setAttribute("size", "15");
		td.appendChild(inputPassword);
		tr.appendChild(td);
		
		
		
		var td = document.createElement("td");
		var cancel = document.createElement("button");
		cancel.setAttribute("class", "button");
		cancel.innerText = "Cancel";
		cancel.onclick = function() {
			dbManagerWidget.show();
			connectionManager.hide();
		};
		td.appendChild(cancel);
		tr.appendChild(td);
		
		table.appendChild(tr);
		connectDialog.appendChild(table);
		
		
		getDefaultValuesForDbConnection = function getDefaultValuesForDbConnection() {
			inputHostname.value = EDITOR.storage.getItem("lastDbHostname");
			inputUsername.value = EDITOR.storage.getItem("lastDbUsername");
			inputPassword.value = EDITOR.storage.getItem("lastDbPassword");
			inputPort.value = EDITOR.storage.getItem("lastDbPort") || 3306;
		}
		
		EDITOR.on("storageReady", getDefaultValuesForDbConnection);
		
		return connectDialog;
		
		
		function connectToServer() {
			
			EDITOR.storage.setItem("lastDbHostname", inputHostname.value);
			EDITOR.storage.setItem("lastDbUsername", inputUsername.value);
			EDITOR.storage.setItem("lastDbPassword", inputPassword.value);
			EDITOR.storage.setItem("lastDbPort", inputPort.value);
			
			CLIENT.cmd("mysql.connect", {
				hostname: inputHostname.value,
				username: inputUsername.value,
				password: inputPassword.value,
				port: inputPort.value
			}, function(err) {
				if(err) alertBox(err.message);
				else {
getDatabases();
					
					dbManagerWidget.show();
					connectionManager.hide();
					
				}
			});
		}
	}
	
	var editTableName;
	
	function buildCreateTableHelper() {

		var wrap = document.createElement("div");
		
		var labelTableName = document.createElement("label");
		labelTableName.setAttribute("for", "tableName");
		labelTableName.innerText = "Table name: ";
		wrap.appendChild(labelTableName);
		
		var tableName = document.createElement("input")
		tableName.setAttribute("id", "tableName");
		tableName.setAttribute("type", "text");
		wrap.appendChild(tableName);
		
		
		var buttonInsertSQL = document.createElement("button");
		buttonInsertSQL.classList.add("button");
		buttonInsertSQL.innerText = "Insert CREATE TABLE statement";
		buttonInsertSQL.onclick = function() {
			
			openQueryFile(function(err, file) {
				if(err) throw err;
				
				var sql = "CREATE TABLE `" + tableName.value + "` (\n\n)\n\n";
				
				file.insertText(sql);
				
				file.moveCaretUp();
				file.moveCaretUp();
				file.moveCaretUp();
				
				EDITOR.renderNeeded();
				
			});
		}
		wrap.appendChild(buttonInsertSQL);
		

var buttonAddColumn = document.createElement("button");
		buttonAddColumn.classList.add("button");
		buttonAddColumn.innerText = "➕ Add column";
		buttonAddColumn.onclick = function() {
			addColumnHelper.show();
EDITOR.resizeNeeded();
		}
		wrap.appendChild(buttonAddColumn);
		
		
		var buttonAddKey = document.createElement("button");
		buttonAddKey.classList.add("button");
		buttonAddKey.innerText = "➕ Add key";
		buttonAddKey.onclick = function() {
			addKeyHelper.show();
			EDITOR.resizeNeeded();
		}
		wrap.appendChild(buttonAddKey);
		
return wrap;
	}
	
	function buildAddColumnHelper() {
		
		var wrap = document.createElement("div");
		
		var labelName = document.createElement("label");
		labelName.setAttribute("for", "inputName");
		labelName.innerText = "Column name: ";
		wrap.appendChild(labelName);
		
		var inputName = document.createElement("input");
		inputName.setAttribute("id", "inputName");
		inputName.setAttribute("type", "text");
		inputName.setAttribute("size", "20");
		wrap.appendChild(inputName);
		
		
		var labelType = document.createElement("label");
		labelType.setAttribute("for", "inputDatatype");
		labelType.innerText = "Type: ";
		wrap.appendChild(labelType);
		
		var inputDatatype = document.createElement("input");
		inputDatatype.setAttribute("id", "inputDatatype");
		inputDatatype.setAttribute("type", "text");
		inputDatatype.setAttribute("list", "dataTypes");
		inputDatatype.setAttribute("size", "10");
		wrap.appendChild(inputDatatype);
		
		var dataTypes = document.createElement("datalist");
		dataTypes.setAttribute("id", "dataTypes");
		mySqlDataTypes.forEach(function(name) {
			var opt = document.createElement("option");
			opt.setAttribute("value", name);
			dataTypes.appendChild(opt);
		});
		wrap.appendChild(dataTypes);
		
		
		var inputNotNull = document.createElement("input");
		inputNotNull.setAttribute("id", "inputNotNull");
		inputNotNull.setAttribute("type", "checkbox");
		
		
		var labelNotNull = document.createElement("label");
		labelNotNull.setAttribute("for", "inputNotNull");
		labelNotNull.appendChild(inputNotNull);
		labelNotNull.appendChild(document.createTextNode("Not null"));
		labelNotNull.classList.add("checkbox");
		wrap.appendChild(labelNotNull);
		
		
		var inputAutoInc = document.createElement("input");
		inputAutoInc.setAttribute("id", "inputAutoInc");
		inputAutoInc.setAttribute("type", "checkbox");
		
		var labelAutoInc = document.createElement("label");
		labelAutoInc.setAttribute("for", "inputAutoInc");
labelAutoInc.appendChild(inputAutoInc);
		labelAutoInc.appendChild(document.createTextNode("Auto inc"));
		labelAutoInc.classList.add("checkbox");
		wrap.appendChild(labelAutoInc);
		
		
		var labelDefault = document.createElement("label");
		labelDefault.setAttribute("for", "inputDefault");
		labelDefault.innerText = "Default value: ";
		wrap.appendChild(labelDefault);
		
		var inputDefault = document.createElement("input");
		inputDefault.setAttribute("id", "inputDefault");
		inputDefault.setAttribute("type", "text");
		inputDefault.setAttribute("size", "15");
		wrap.appendChild(inputDefault);
		
		
		var labelComment = document.createElement("label");
		labelComment.setAttribute("for", "inputComment");
		labelComment.innerText = "Comment: ";
		wrap.appendChild(labelComment);
		
		var inputComment = document.createElement("input");
		inputComment.setAttribute("id", "inputComment");
		inputComment.setAttribute("type", "text");
		wrap.appendChild(inputComment);
		
		
		var buttonInsertSQL = document.createElement("button");
		buttonInsertSQL.classList.add("button");
		buttonInsertSQL.innerText = "Put inside CREATE TABLE statement";
		buttonInsertSQL.onclick = function() {
			
			var file = EDITOR.currentFile;
			if(!file.text.match(/CREATE TABLE/i)) {
				return alertBox("Current file has no CREATE TABLE statement!");
			}
			
			var sql = "  `" + inputName.value + "` " + inputDatatype.value;
			if(inputNotNull.checked) sql += " NOT NULL";
			if(inputDefault.value) sql += " DEFAULT '" + inputDefault.value + "'";
			if(inputAutoInc.checked) sql += " AUTO_INCREMENT";
			if(inputComment.value) sql += " COMMENT '" + inputComment.value + "'";
			
			sql += ",\n";
			
			file.insertText(sql);
			//EDITOR.renderNeeded();
			
		}
		wrap.appendChild(buttonInsertSQL);
		
		var buttonCancel = document.createElement("button")
		buttonCancel.classList.add("button");
		buttonCancel.innerText = "Cancel";
		buttonCancel.onclick = function() {
			addColumnHelper.hide();
		}
		wrap.appendChild(buttonCancel);
		
		return wrap;
		
	}
	
	function buildAddKeyHelper() {
		
		var wrap = document.createElement("div");
		
		var labelName = document.createElement("label");
		labelName.setAttribute("for", "inputName");
		labelName.innerText = "Key name: ";
		wrap.appendChild(labelName);
		
		var inputName = document.createElement("input");
		inputName.setAttribute("id", "inputName");
		inputName.setAttribute("type", "text");
		inputName.setAttribute("size", "15");
		wrap.appendChild(inputName);
		
		
		var labelKind = document.createElement("label");
		labelKind.setAttribute("for", "keyKind");
		labelKind.innerText = "Kind: ";
		wrap.appendChild(labelKind);
		
		var keyKind = document.createElement("select");
		keyKind.setAttribute("id", "keyKind");
		keyKinds.forEach(function(kind) {
			var option = document.createElement("option");
			option.innerText = kind;
			keyKind.appendChild(option);
		});
		wrap.appendChild(keyKind);
		
		
		var labelType = document.createElement("label");
		labelType.setAttribute("for", "keyKind");
		labelType.innerText = "Type: ";
		wrap.appendChild(labelType);
		
		var keyType = document.createElement("select");
		keyTypes.forEach(function(type) {
			var option = document.createElement("option");
			option.innerText = type;
			keyType.appendChild(option);
		});
		wrap.appendChild(keyType);
		
		
		var labelColumns = document.createElement("label");
		labelColumns.setAttribute("for", "inputColumns");
		labelColumns.innerText = "Column(s): ";
		wrap.appendChild(labelColumns);
		
		var inputColumns = document.createElement("input");
		inputColumns.setAttribute("id", "inputColumns");
		inputColumns.setAttribute("type", "text");
		inputColumns.setAttribute("title", "comma separated column names");
		inputColumns.setAttribute("size", "20");
		wrap.appendChild(inputColumns);
		
		
		var buttonInsertSQL = document.createElement("button");
		buttonInsertSQL.classList.add("button");
		buttonInsertSQL.innerText = "Put inside CREATE TABLE statement";
		buttonInsertSQL.onclick = function() {
			
			var file = EDITOR.currentFile;
			if(!file.text.match(/CREATE TABLE/i)) {
				return alertBox("Current file has no CREATE TABLE statement!");
			}
			
			var kind = keyKinds.value;
			var columns = inputColumns.value.split(",");
			columns = columns.map(function(str) { return "`" + str.trim() + "`" });
			
			var sql = "";
			
			if(kind == "PRIMARY") sql = "PRIMARY KEY (" + columns.join(", ") + ")";
			else {
				sql = "INDEX `" + inputName.value + "` (" + columns.join(", ") + ")";
			}
			
			
			sql += ",\n";
			
			file.insertText(sql);
			//EDITOR.renderNeeded();
			
		}
		wrap.appendChild(buttonInsertSQL);
		
		var buttonCancel = document.createElement("button")
		buttonCancel.classList.add("button");
		buttonCancel.innerText = "Cancel";
		buttonCancel.onclick = function() {
			addKeyHelper.hide();
		}
		wrap.appendChild(buttonCancel);
		
		return wrap;
		
	}
	
	
	function buildTableEditor() {
		var wrap = document.createElement("div");
		
		var labelEditTableName = document.createElement("label");
		labelEditTableName.setAttribute("for", "editTableName");
		labelEditTableName.innerText = "Table name: ";
		wrap.appendChild(labelEditTableName);
		
		editTableName = document.createElement("input")
		editTableName.setAttribute("type", "text");
		wrap.appendChild(editTableName);
		
		var buttonAddColumn = document.createElement("button");
		buttonAddColumn.classList.add("button");
		buttonAddColumn.innerText = "➕ Add column";
		buttonAddColumn.onclick = function() {
			var column = makeEditColumn();
			tbody.appendChild(column);
EDITOR.resizeNeeded();
		}
		wrap.appendChild(buttonAddColumn);
		
		var tableFields = document.createElement("table");
		tableFields.classList.add("input");
		var thead = document.createElement("thead")
		var tr = document.createElement("tr");
		
		var th = document.createElement("th");
		th.innerText = "Column Name";
		tr.appendChild(th);
		
		var th = document.createElement("th");
		th.innerText = "Keys";
		tr.appendChild(th);
		
		var th = document.createElement("th");
		th.innerText = "Data Type";
		tr.appendChild(th);
		
		var th = document.createElement("th");
		th.innerText = "Not Null";
		th.classList.add("tiny");
		tr.appendChild(th);
		
		var th = document.createElement("th");
		th.innerText = "Auto Inc";
		th.classList.add("tiny");
		tr.appendChild(th);
		
		var th = document.createElement("th");
		th.innerText = "Flags";
		tr.appendChild(th);
		
		var th = document.createElement("th");
		th.innerText = "Default value";
		tr.appendChild(th);
		
		var th = document.createElement("th");
		th.innerText = "Comments";
		tr.appendChild(th);
		
		thead.appendChild(tr);
		tableFields.appendChild(thead);
		
		var tbody = document.createElement("tbody")
		
		var column = makeEditColumn();
		
		tbody.appendChild(column)
		
		tableFields.appendChild(tbody);
		
		wrap.appendChild(tableFields);
		
		
		
		var dataTypes = document.createElement("datalist");
		dataTypes.setAttribute("id", "dataTypes");
		mySqlDataTypes.forEach(function(name) {
			var opt = document.createElement("option");
			opt.setAttribute("value", name);
			dataTypes.appendChild(opt);
		});
		wrap.appendChild(dataTypes);
		
		
		var labelKey = document.createElement("label");
		labelKey.innerText = "New key: ";
		labelKey.setAttribute("for", "inputNewKey");
		wrap.appendChild(labelKey);
		
		var inputNewKey = document.createElement("input");
		inputNewKey.setAttribute("id", "inputNewKey");
		inputNewKey.setAttribute("type", "text");
		wrap.appendChild(inputNewKey);
		
		var keyKind = document.createElement("select");
		keyKinds.forEach(function(keyKind) {
			var option = document.createElement("option");
			option.innerText = keyKind;
			keyKind.appendChild(option);
		});
		wrap.appendChild(keyKind);
		
		var keyType = document.createElement("select");
		keyTypes.forEach(function(keyType) {
			var option = document.createElement("option");
			option.innerText = keyType;
			keyType.appendChild(option);
		});
		wrap.appendChild(keyType);
		
		var buttonAddKey = document.createElement("button");
		var tableKeys = [];
		buttonAddKey.innerText = "Add new key";
		buttonAddKey.onclick = function() {
			var i = tableKeys.push({
				name: inputNewKey.value,
				kind: keyKind.value,
				type: keyType.value,
				columns: []
			});
			
			
			
			
		}
		
		wrap.appendChild(buttonAddKey);
		
		return wrap;
		
		
		
	}
	
	function makeEditColumn(options) {
		
		if(options == undefined) options = {
			notNull: true
		};
		
		var tr = document.createElement("tr");
		tr.classList.add("dbtable_column");
		tr.onfocus = function() {
			activateTableCoumn = tr;
			tr.classList.add("selected");
		}
		tr.onblur = function() {
			tr.classList.remove("selected");
		}
		
		var td = document.createElement("td");
		var inputName = document.createElement("input");
		inputName.setAttribute("type", "text");
		if(options.name) inputName.value = options.name;
		td.appendChild(inputName);
		tr.appendChild(td);
		
		var tdKeys = document.createElement("td");
		var inputPrimaryKey = document.createElement("input");
		inputPrimaryKey.setAttribute("name", "PRIMARY");
		inputPrimaryKey.setAttribute("type", "checkbox");
		if(options.PRIMARY) inputPrimaryKey.setAttribute("checked", "true");
		tdKeys.appendChild(inputNotNull);
		tr.appendChild(tdKeys);
		
		
		var td = document.createElement("td");
		var inputDatatype = document.createElement("input");
		inputDatatype.setAttribute("type", "text");
		inputDatatype.setAttribute("list", "dataTypes");
		if(options.dataType) inputDatatype.value = options.dataType;
		td.appendChild(inputDatatype);
		tr.appendChild(td);
		
		var td = document.createElement("td");
		var inputNotNull = document.createElement("input");
		inputNotNull.setAttribute("type", "checkbox");
		if(options.notNull) inputNotNull.setAttribute("checked", "true");
		td.appendChild(inputNotNull);
		tr.appendChild(td);
		
		var td = document.createElement("td");
		var inputAutoInc = document.createElement("input");
		inputAutoInc.setAttribute("type", "checkbox");
		if(options.autoInc) inputAutoInc.setAttribute("checked", "true");
		td.appendChild(inputAutoInc);
		tr.appendChild(td);
		
		var tdFlags = document.createElement("td");
		tr.appendChild(tdFlags);
		
		var td = document.createElement("td");
		var inputDefault = document.createElement("input");
		inputDefault.setAttribute("type", "text");
		if(options.defaultValue) inputDefault.value = options.defaultValue;
		td.appendChild(inputDefault);
		tr.appendChild(td);
		
		var td = document.createElement("td");
		var inputComment = document.createElement("input");
		inputComment.setAttribute("type", "text");
		if(options.comment) inputComment.value = options.comment;
		td.appendChild(inputComment);
		tr.appendChild(td);
		
		
		
		
		return tr;
		
		
	}
	
	
	function changeDb(e) {
		console.log(e);
		
		selectedDb = selectMysqlDb.options[selectMysqlDb.selectedIndex].value;
	}
	
	function getDatabases(selectedName) {
		
		console.log(UTIL.getStack("dbExplorer: getDatabases()"));
		
		CLIENT.cmd("mysql.query", {database: selectedDb, query: "SHOW DATABASES"}, function(err, resp) {
			if(err) return alertBox(err.message);
			
			var results = resp.results;
			
			var dbNames = results.map(function(obj) {
				return obj.Database;
			});
			
			updateDbExplorer(dbNames);
			
			// Empty options
			while (selectMysqlDb.options.length > 0) selectMysqlDb.remove(0);
			
			
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
	
	function makeSelectAll(tableName, dbName) {
		return function() {
			openQueryFile(function(err, file) {
				if(err) throw err;
				
				file.writeLineBreak();
				file.writeLineBreak();
				
				var selStart = file.caret.index;
				
				file.writeLine("SELECT * FROM `" + tableName + "`");
				
				var selEnd = file.caret.index;
				
				file.writeLineBreak();
				file.writeLineBreak();
				
				var selectRange = file.createTextRange(selStart, selEnd);
				file.select(selectRange);
				
				selectMysqlDb.value = dbName;
				changeDb();

			});
		}
	}
	
	function createTable() {
		
		createTableHelper.show();
		
		return;
		
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

