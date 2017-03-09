(function() {
	
	"use strict";
	
	/*
		
		SFTP = "FTP" via SSL
		FTPS = FTP over SSL/TLS
		
		
	*/
	
	
	console.log("Hello from server_manager.js");
	
	var serverManager;
	
	
	var defaultServer = {
		name: "Default",
		protocol: "SFTP",
		host: "127.0.0.1",
		user: "test",
		pw: "test",
		key: ""
	};
	
	var remoteConnections;
	var selectedConnection = defaultServer;
	
	var editView;
	var connectionView;
	
	var selectProtocol;
	var inputHost;
	var inputUser;
	var inputKey;
	var inputName;
	var inputEditPw;
	var inputPw;
	var buttonDisconnect;
	var menuItem;
	var selectConnection;
	
	
	EDITOR.plugin({
		desc: "Manage and connect to FTP/SSH servers.",
		load: load,
		unload: unload,
	});
	
	function load() {
		// Called when the module is loaded
		
		console.log("Loading server manager");
		
		if(!window.localStorage) {
			console.warn("window.localStorage not available! server_manager.js plugin disabled.");
			return false;
		}
		
		var charP = 80;
		var charEscape = 27;
		var charEnter = 13;
		
		remoteConnections = window.localStorage.remoteConnections ? JSON.parse(window.localStorage.remoteConnections) : [defaultServer];
		
		//build();
		
		EDITOR.bindKey({desc: "Show the FTP/SSH server manager", fun: showServerManger, charCode: charP, combo: CTRL + SHIFT});
		EDITOR.bindKey({desc: "Hide the FTP/SSH server manager", fun: hideServerManger, charCode: charEscape, combo: 0});
		EDITOR.bindKey({desc: "Connect to remove server in server manager", fun: serverManagerEnter, charCode: charEnter, combo: 0});
		
		menuItem = EDITOR.addMenuItem("Remote connections", function() {
			showServerManger();
			EDITOR.hideMenu();
		});
		
	}
	
	function unload() {
		// Cleaning up, for example when disabling a plugin
		
		EDITOR.unbindKey(showServerManger);
		EDITOR.unbindKey(hideServerManger);
		EDITOR.unbindKey(serverManagerEnter);
		
		EDITOR.removeMenuItem(menuItem);
		
		if(serverManager) {
			var footer = document.getElementById("footer");
			footer.removeChild(serverManager);
			EDITOR.resizeNeeded();
		}
		
	}
	
	function serverManagerEnter() {
		// Only connect if the password box has focus
		if(document.activeElement == inputPw) {
			connectToConnection();
			return false;
		}
		else {
			console.log("document.activeElement=" + document.activeElement);
			return true;
	}
}
	
	
	function build() {
		
		console.log("Building server manager");
		
		var footer = document.getElementById("footer");
		
		serverManager = document.createElement("div");
		
		buildEdit();
		buildConn();
		
		editView.style.display="none";
		
		serverManager.appendChild(editView);
		serverManager.appendChild(connectionView);
		
		footer.appendChild(serverManager);
		
		console.log("done building server manager");
	}
	
	function addConnectionOption(connection, index) {
		
		if(!selectConnection) throw new Error("selectConnection not yet created!");
		
		var option = document.createElement("option");
		option.text = connection.name;
		option.id = index;
		selectConnection.appendChild(option);
		
		return selectConnection.options.length -1;
	}
	
	function buildConn() {
		
		console.log("building connection view");
		
		connectionView = document.createElement("div");
		
		var labelConn = document.createElement("label");
		labelConn.setAttribute("for", "selectConnection");
		labelConn.appendChild(document.createTextNode("Connection:")); // Language settings!?
		
		var labelPw= document.createElement("label");
		labelPw.setAttribute("for", "inputPw");
		labelPw.appendChild(document.createTextNode("Password:")); // Language settings!?
		
		selectConnection = document.createElement("select");
		selectConnection.setAttribute("id", "selectConnection");
		selectConnection.setAttribute("class", "select");
		
		if(!selectConnection) throw new Error("You are insane!");
		
		if(remoteConnections.length > 0) {
			remoteConnections.forEach(addConnectionOption);
		}
		
		inputPw = document.createElement("input");
		inputPw.setAttribute("type", "password");
		inputPw.setAttribute("id", "inputPw");
		inputPw.setAttribute("class", "inputtext");
		inputPw.setAttribute("value", selectedConnection.pw);
		inputPw.setAttribute("size", "12");
		
		var buttonConnect = document.createElement("input");
		buttonConnect.setAttribute("type", "button");
		buttonConnect.setAttribute("class", "button");
		buttonConnect.setAttribute("id", "buttonConnect");
		buttonConnect.setAttribute("value", "Connect");
		
		var buttonEdit = document.createElement("input");
		buttonEdit.setAttribute("type", "button");
		buttonEdit.setAttribute("class", "button");
		buttonEdit.setAttribute("id", "buttonEdit");
		buttonEdit.setAttribute("value", "Edit");
		
		buttonDisconnect = document.createElement("input");
		buttonDisconnect.setAttribute("type", "button");
		buttonDisconnect.setAttribute("class", "button");
		buttonDisconnect.setAttribute("id", "buttonCancel");
		buttonDisconnect.setAttribute("value", "Disconnect");
		buttonDisconnect.setAttribute("style", "dislay: none");
		
		var buttonCancel = document.createElement("input");
		buttonCancel.setAttribute("type", "button");
		buttonCancel.setAttribute("class", "button");
		buttonCancel.setAttribute("id", "buttonCancel");
		buttonCancel.setAttribute("value", "Cancel");
		
		buttonCancel.addEventListener("click", function() {
			hideServerManger(); // Hide the whole connection manager
		}, false);
		
		buttonEdit.addEventListener("click", editConnection, false);
		
		selectConnection.addEventListener("change", changeSelectConnection);
		
		buttonConnect.addEventListener("click", connectToConnection, false);
		
		buttonDisconnect.addEventListener("click", disconnectConnection, false);
		
		connectionView.appendChild(labelConn);
		connectionView.appendChild(selectConnection)
		
		connectionView.appendChild(labelPw)
		connectionView.appendChild(inputPw)
		
		connectionView.appendChild(buttonConnect)
		connectionView.appendChild(buttonEdit)
		connectionView.appendChild(buttonDisconnect)
		connectionView.appendChild(buttonCancel)
		
		if(remoteConnections.length > 0) changeSelectConnection(); // Select the one currently selected
		
		console.log("done building connection view");
		
		
		function editConnection() {
			// Edit the selected connection
			editView.style.display="block";
			connectionView.style.display="none"; // Hide this div
			EDITOR.resizeNeeded();
		}
		
		function disconnectConnection() {
			// Close the connection
			
			if(EDITOR.connections.hasOwnProperty(selectedConnection.host)) {
				EDITOR.connections[selectedConnection.host].close();
				
				EDITOR.workingDirectory = UTIL.trailingSlash(process.cwd()); // Change working directory (back) to the one from where we opened the editor
			}
			else console.warn("Not connected to " + selectedConnection.host);
			
			buttonDisconnect.style.display="none"; // Hide the disconnect button
			
			//EDITOR.resizeNeeded();
		}
		
		function changeSelectConnection() {
			var selectedConnectionIndex = selectConnection.options[selectConnection.selectedIndex].id;
			
			selectedConnection = remoteConnections[selectedConnectionIndex];
			
			if(!selectedConnection) throw new Error("No selectedConnection! selectedConnectionIndex=" + selectedConnectionIndex + " selectConnection.selectedIndex=" + selectConnection.selectedIndex);
			
			inputPw.value = selectedConnection.pw;
			inputEditPw.value = selectedConnection.pw;
			inputHost.value = selectedConnection.host;
			inputUser.value = selectedConnection.user;
			inputKey.value = selectedConnection.key;
			inputName.value = selectedConnection.name;
			
			// Select the right protocol in the selectProtocol selection box
			if(selectedConnection.protocol == "FTP") selectProtocol.selectedIndex = 0
			else if(selectedConnection.protocol == "SFTP") selectProtocol.selectedIndex = 1
			else if(selectedConnection.protocol == "FTPS") selectProtocol.selectedIndex = 2
			else throw new Error("Unknown protocol: " + selectedConnection.protocol);
			
			/*
			for (var i = 0; i < selectProtocol.options.length; i++) {
				if (selectProtocol.options[i].text === selectedConnection.protocol) {
					selectProtocol.selectedIndex = i;
					break;
				}
			}
			
			*/
			
		}
	}
	
	
	function buildEdit() {
		
		console.log("building edit view");
		
		editView = document.createElement("div");
		
		var labelName = document.createElement("label");
		labelName.setAttribute("for", "inputName");
		labelName.appendChild(document.createTextNode("Alias:")); // Language settings!?
		
		var labelProtocol = document.createElement("label");
		labelProtocol.setAttribute("for", "selectProtocol");
		labelProtocol.appendChild(document.createTextNode("Protocol:")); // Language settings!?
		
		var labelHost = document.createElement("label");
		labelHost.setAttribute("for", "inputHost");
		labelHost.appendChild(document.createTextNode("Hostname(:port):")); // Language settings!?
		
		var labelUser= document.createElement("label");
		labelUser.setAttribute("for", "inputUser");
		labelUser.appendChild(document.createTextNode("User:")); // Language settings!?
		
		var labelPw= document.createElement("label");
		labelPw.setAttribute("for", "inputPw");
		labelPw.appendChild(document.createTextNode("Password:")); // Language settings!?
		
		var labelKey= document.createElement("label");
		labelKey.setAttribute("for", "inputKey");
		labelKey.appendChild(document.createTextNode("Key (path):")); // Language settings!?
		
		selectProtocol = document.createElement("select");
		selectProtocol.setAttribute("id", "selectProtocol");
		selectProtocol.setAttribute("class", "select");
		
		var FTP = document.createElement("option");
		FTP.text = "FTP";
		if(selectedConnection.protocol=="FTP") FTP.setAttribute("selected", "true");
		
		var SFTP = document.createElement("option");
		SFTP.text = "SFTP";
		if(selectedConnection.protocol=="SFTP") SFTP.setAttribute("selected", "true");
		
		var FTPS = document.createElement("option");
		FTPS.text = "FTPS";
		if(selectedConnection.protocol=="FTPS") FTPS.setAttribute("selected", "true");
		
		selectProtocol.appendChild(FTP);
		selectProtocol.appendChild(SFTP);
		selectProtocol.appendChild(FTPS);
		// PS. Create a createOption function if you add more options
		
		
		inputName = document.createElement("input");
		inputName.setAttribute("type", "text");
		inputName.setAttribute("id", "inputName");
		inputName.setAttribute("class", "inputtext");
		inputName.setAttribute("value", selectedConnection.name);
		inputName.setAttribute("size", "14");
		
		inputHost = document.createElement("input");
		inputHost.setAttribute("type", "text");
		inputHost.setAttribute("id", "inputHost");
		inputHost.setAttribute("class", "inputtext");
		inputHost.setAttribute("value", selectedConnection.host);
		inputHost.setAttribute("size", "14");
		
		inputUser = document.createElement("input");
		inputUser.setAttribute("type", "text");
		inputUser.setAttribute("id", "inputUser");
		inputUser.setAttribute("class", "inputtext");
		inputUser.setAttribute("value", selectedConnection.user);
		inputUser.setAttribute("size", "12");
		
		inputKey = document.createElement("input");
		inputKey.setAttribute("type", "text");
		inputKey.setAttribute("id", "inputKey");
		inputKey.setAttribute("class", "inputtext");
		inputKey.setAttribute("value", selectedConnection.key);
		inputKey.setAttribute("size", Math.max(30, selectedConnection.key.length+1));
		
		inputEditPw = document.createElement("input");
		inputEditPw.setAttribute("type", "password");
		inputEditPw.setAttribute("id", "inputPw");
		inputEditPw.setAttribute("class", "inputtext");
		inputEditPw.setAttribute("value", selectedConnection.pw);
		inputEditPw.setAttribute("size", "12");
		
		var buttonBrowseKey = document.createElement("input");
		buttonBrowseKey.setAttribute("type", "button");
		buttonBrowseKey.setAttribute("class", "button half");
		buttonBrowseKey.setAttribute("value", "Browse");
		buttonBrowseKey.addEventListener("click", browseKey, false);
		
		
		var buttonSave = document.createElement("input");
		buttonSave.setAttribute("type", "button");
		buttonSave.setAttribute("class", "button");
		buttonSave.setAttribute("id", "buttonSave");
		buttonSave.setAttribute("value", "Save");
		buttonSave.addEventListener("click", saveConnection, false);
		
		
		var buttonSaveAs = document.createElement("input");
		buttonSaveAs.setAttribute("type", "button");
		buttonSaveAs.setAttribute("class", "button");
		buttonSaveAs.setAttribute("value", "Save as new");
		buttonSaveAs.addEventListener("click", saveNewConnection, false);
		
		
		var buttonCancel = document.createElement("input");
		buttonCancel.setAttribute("type", "button");
		buttonCancel.setAttribute("class", "button");
		buttonCancel.setAttribute("value", "Cancel");
		buttonCancel.addEventListener("click", cancelEdit, false);
		
		
		editView.appendChild(labelName);
		editView.appendChild(inputName);
		
		
		editView.appendChild(labelProtocol);
		editView.appendChild(selectProtocol);
		
		editView.appendChild(labelHost);
		editView.appendChild(inputHost);
		
		
		
		editView.appendChild(labelUser);
		editView.appendChild(inputUser);
		
		
		
		editView.appendChild(labelKey);
		editView.appendChild(inputKey);
		editView.appendChild(buttonBrowseKey);
		
		
		editView.appendChild(labelPw);
		editView.appendChild(inputEditPw);
		
		
		
		editView.appendChild(buttonSave);
		editView.appendChild(buttonSaveAs);
		editView.appendChild(buttonCancel);
		
		
		function saveNewConnection() {
			
			if(!window.localStorage) throw new Error("window.localStorage not available!");
			
			// Make sure the name/alias is not in use
			var name = inputName.value;
			for (var i=0; i<remoteConnections.length; i++) {
				if(remoteConnections[i].name == name) {
					alert(name + " alias already used!");
					return;
				}
			}
			
			var index = remoteConnections.push({
				pw: inputEditPw.value,
				host: inputHost.value,
				user: inputUser.value,
				key: inputKey.value,
				name: inputName.value,
				protocol: selectProtocol.options[selectProtocol.selectedIndex].text
			}) - 1;
			
			selectedConnection = remoteConnections[index];
			
			var selectedIndex = addConnectionOption(selectedConnection, index); // Add new option
			
			selectConnection.selectedIndex = selectedIndex;// Select the new option
			
			window.localStorage.remoteConnections = JSON.stringify(remoteConnections);
			
			editView.style.display = "none"; // Hide the edit view
			connectionView.style.display = "block"; // Show the connection view
			EDITOR.resizeNeeded();
			
		}
		
		
		function cancelEdit() {
			// Reset the values
			
			if(!selectedConnection) throw new Error("No selectedConnection!");
			
			console.log(typeof inputEditPw);
			
			inputEditPw.value = selectedConnection.pw;
			inputHost.value = selectedConnection.host;
			inputUser.value = selectedConnection.user;
			inputKey.value = selectedConnection.key;
			inputName.value = selectedConnection.name;
			
			editView.style.display = "none"; // Hide the edit view
			connectionView.style.display = "block"; // Show the connection view
			EDITOR.resizeNeeded();
			
		}
		
		function saveConnection() {
			
			if(!window.localStorage) throw new Error("window.localStorage not available!");
			
			if(!selectedConnection) throw new Error("No selectedConnection!");
			
			if(selectedConnection.name != inputName.value) {
				selectConnection.options[selectConnection.selectedIndex].text = inputName.value;
			}
			
			selectedConnection.protocol = selectProtocol.options[selectProtocol.selectedIndex].text;
			
			selectedConnection.name = inputName.value;
			selectedConnection.host = inputHost.value;
			selectedConnection.user = inputUser.value;
			selectedConnection.key = inputKey.value;
			selectedConnection.pw = inputEditPw.value;
			
			if(inputPw) inputPw.value = inputEditPw.value;
			
			window.localStorage.remoteConnections = JSON.stringify(remoteConnections);
			
			editView.style.display = "none"; // Hide the edit view
			connectionView.style.display = "block"; // Show the connection view
			EDITOR.resizeNeeded();
			
		}
		
		function browseKey() {
			var defaultPath = "";
			
			if(EDITOR.currentFile) defaultPath = UTIL.getDirectoryFromPath(EDITOR.currentFile.path)
			else defaultPath = EDITOR.workingDirectory;
			
			EDITOR.fileOpenDialog(defaultPath, function selectKey(path) {
				inputKey.value = path;
});
}
		
	}
	
	
	function showServerManger() {
		
		console.log("Show server manager");
		
		// Steal focus from the file
		EDITOR.input = false;
		
		if(!serverManager) build(); // Build the GUI if it's not already built
		
		serverManager.style.display = "block";
		
		inputPw.focus();
		
		EDITOR.resizeNeeded();
		
		return false;
		
	}
	
	function hideServerManger() {
		// Bring back focus to the current file
		if(EDITOR.currentFile) {
			EDITOR.input = true;
		}
		
		if(serverManager) serverManager.style.display = "none";
		EDITOR.resizeNeeded();
		
		return false;
		
	}
	
	function connectToConnection() {
		connect(selectedConnection.protocol, selectedConnection.host, selectedConnection.user, inputPw.value, selectedConnection.key);
		buttonDisconnect.style.display="inline"; // Show the disconnect button
		
		EDITOR.resizeNeeded();
	}
	
	function connect(protocol, hostName, login, pw, key) {
		//EDITOR.connect("FTP", "192.168.1.77", "test", "test");
		//EDITOR.connect("SSH", "192.168.1.91", "test", "test");
		
		EDITOR.connect(whenConnected, protocol, hostName, login, pw, key);
		
		function whenConnected(err, workingDir) {
			if(err) {
				buttonDisconnect.style.display="none"; // Hide disconnect button
				
				if(err.message.indexOf("Expected 0x2:") != -1) {
					alert(err.message + "\nProbably wrong key password")
				}
				else alert(err.message);
				console.log("Connection error: " + err.message);
			}
			else {
				alert("Connected to " + protocol + " on " + hostName + "!");
				hideServerManger();
}
}
		
	}

})();
