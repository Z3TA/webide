(function() {
	
	"use strict";
	
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
	
	var selectConnection;
	
	
	editor.plugin({
		desc: "Manage and connect to FTP/SSH servers.",
		load: load,
		unload: unload,
	});
	
	function load() {
		// Called when the module is loaded
		
		console.log("Loading server manager");
		
		var charP = 80;
		var charEscape = 27;
		
		if(!window.localStorage) throw new Error("window.localStorage not available!");
		
		remoteConnections = window.localStorage.remoteConnections ? JSON.parse(window.localStorage.remoteConnections) : [defaultServer];
		
		//build();
		
		editor.bindKey({desc: "Show the FTP/SSH server manager", fun: show, charCode: charP, combo: CTRL + SHIFT});
		editor.bindKey({desc: "Hide the FTP/SSH server manager", fun: hide, charCode: charEscape, combo: 0});
		
		
	}
	
	function unload() {
		// Cleaning up, for example when disabling a plugin
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
		option.id = connection.index;
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
			selectedConnection = remoteConnections[0];
			remoteConnections.forEach(addConnectionOption);
		}
		
		var inputPw = document.createElement("input");
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
		
		var buttonDisconnect = document.createElement("input");
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
			hide(); // Hide the whole connection manager
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
		
		console.log("done building connection view");
		
		
		function editConnection() {
			// Edit the selected connection
			editView.style.display="block";
			connectionView.style.display="none"; // Hide this div
			editor.resizeNeeded();
		}
		
		function connectToConnection() {
			connect(selectedConnection.protocol, selectedConnection.host, selectedConnection.user, inputPw.value, selectedConnection.key);
			buttonDisconnect.style.display="block"; // Show the disconnect button
			
			editor.resizeNeeded();
		}
		
		function disconnectConnection() {
			// Close the connection
			
			editor.disconnect[selectedConnection.host]();
			
			editor.workingDirectory = process.cwd(); // Change working directory (back) to the one from where we opened the editor
			
			buttonDisconnect.style.display="none"; // Hide the disconnect button
			
			editor.resizeNeeded();
		}
		
		function changeSelectConnection() {
			var selectedConnectionIndex = selectConnection.options[selectConnection.selectedIndex].id;
			selectedConnection = remoteConnections[selectedConnectionIndex];
			
			inputPw.value = selectedConnection.pw;
			inputEditPw.vlaue = selectedConnection.pw;
			selectProtocol.selectedIndex = 0;
			inputHost.value = selectedConnection.host;
			inputUser = selectedConnection.user;
			inputKey = selectedConnection.key;
			inputName = selectedConnection.name;
			
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
		
		selectProtocol.appendChild(FTP);
		selectProtocol.appendChild(SFTP);
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
		inputKey.setAttribute("size", Math.min(30, selectedConnection.key.length+1));
		
		var inputEditPw = document.createElement("input");
		inputEditPw.setAttribute("type", "password");
		inputEditPw.setAttribute("id", "inputPw");
		inputEditPw.setAttribute("class", "inputtext");
		inputEditPw.setAttribute("value", selectedConnection.pw);
		inputEditPw.setAttribute("size", "12");
		
		var buttonSave = document.createElement("input");
		buttonSave.setAttribute("type", "button");
		buttonSave.setAttribute("class", "button");
		buttonSave.setAttribute("id", "buttonSave");
		buttonSave.setAttribute("value", "Save");
		buttonSave.addEventListener("click", saveConnection, false);
		console.log("buttonSave");
		
		var buttonSaveAs = document.createElement("input");
		buttonSaveAs.setAttribute("type", "button");
		buttonSaveAs.setAttribute("class", "button");
		buttonSaveAs.setAttribute("value", "Save as new");
		buttonSaveAs.addEventListener("click", saveNewConnection, false);
		console.log("buttonSaveAs");
		
		var buttonCancel = document.createElement("input");
		buttonCancel.setAttribute("type", "button");
		buttonCancel.setAttribute("class", "button");
		buttonCancel.setAttribute("value", "Cancel");
		buttonCancel.addEventListener("click", cancelEdit, false);
		console.log("buttonCancel");
		
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
		
		
		
		editView.appendChild(labelPw);
		editView.appendChild(inputEditPw);
		
		
		
		editView.appendChild(buttonSave);
		editView.appendChild(buttonSaveAs);
		editView.appendChild(buttonCancel);
		
		
		function saveNewConnection() {
			
			if(!window.localStorage) throw new Error("window.localStorage not available!");
			
			var index = remoteConnections.push() - 1;
			
			selectedConnection = remoteConnections[index];
			
			var selectedIndex = addConnectionOption(selectedConnection, index); // Add new option
			
			selectConnection.selectedIndex = selectedIndex;// Select the new option
			
			window.localStorage.remoteConnections = JSON.stringify(remoteConnections);
			
			editView.style.display = "none"; // Hide the edit view
			connectionView.style.display = "block"; // Show the connection view
			editor.resizeNedded();
			
		}
		
		
		function cancelEdit() {
			// Reset the values
			inputEditPw.vlaue = selectedConnection.pw;
			inputHost.value = selectedConnection.host;
			inputUser = selectedConnection.user;
			inputKey = selectedConnection.key;
			inputName = selectedConnection.name;
			
			editView.style.display = "none"; // Hide the edit view
			connectionView.style.display = "block"; // Show the connection view
			editor.resizeNedded();
			
		}
		
		function saveConnection() {
			
			if(!window.localStorage) throw new Error("window.localStorage not available!");
			
			if(selectedConnection.name != inputName.value) {
				selectConnection.options[selectConnection.selectedIndex].text = inputName.value;
			}
			
			selectedConnection.name = inputName.value;
			selectedConnection.host = inputHost.value;
			selectedConnection.user = inputUser.value;
			selectedConnection.key = inputKey.value;
			selectedConnection.pw = inputEditPw.value;
			
			window.localStorage.remoteConnections = JSON.stringify(remoteConnections);
			
			editView.style.display = "none"; // Hide the edit view
			connectionView.style.display = "block"; // Show the connection view
			editor.resizeNedded();
			
		}
		
		
	}
	
	
	function show() {
		
		console.log("Show server manager");
		
		// Steal focus from the file
		editor.input = false;
		
		if(!serverManager) build(); // Build the GUI if it's not already built
		
		serverManager.style.display = "block";
		
		editor.resizeNeeded();
		
		return false;
		
	}
	
	function hide() {
		// Bring back focus to the current file
		if(editor.currentFile) {
			editor.input = true;
		}
		
		serverManager.style.display = "none";
		editor.resizeNeeded();
		
		return false;
		
	}
	
	
	function connect(protocol, hostName, login, pw, key) {
		//editor.connect("FTP", "192.168.1.77", "test", "test");
		//editor.connect("SSH", "192.168.1.91", "test", "test");
		
		editor.connect(whenConnected, protocol, hostName, login, pw, key);
		
		function whenConnected(err, workingDir) {
			if(err) alert(err.message)
			else alert("Connected to " + protocol + " on " + hostName + "!");
}
		
	}

})();
