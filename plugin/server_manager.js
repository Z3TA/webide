(function() {
	
	"use strict";
	
	var serverManager;
	
	var default = {
		protocol: "SSH",
		host: "192.168.1.91",
		user: "test",
		pw: "test"
}
	
	editor.plugin({
		desc: "Manage and connect to FTP/SSH servers.",
		load: load,
		unload: unload,
	});
	
	function load() {
		// Called when the module is loaded
		
		var charP = 80;
		var charEscape = 27;
		
		build();
		
		editor.bindKey({desc: "Show the FTP/SSH server manager", fun: show, charCode: charP, combo: CTRL + SHIFT});
		editor.bindKey({desc: "Hide the FTP/SSH server manager", fun: hide, charCode: charEscape, combo: 0});
		
		
	}
	
	function unload() {
		// Cleaning up, for example when disabling a plugin
	}
	
	function build() {
		var footer = document.getElementById("footer");
		
		serverManager = document.createElement("div");
		
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
		
		var selectProtocol = document.createElement("select");
		selectProtocol.setAttribute("id", "selectProtocol");
		selectProtocol.setAttribute("class", "select");
		
		var FTP = document.createElement("option");
		FTP.text = "FTP";
		if(default.protocol=="FTP") FTP.setAttribute("selected", "true");
		
		var SFTP = document.createElement("option");
		SFTP.text = "SFTP";
		if(default.protocol=="SFTP") SFTP.setAttribute("selected", "true");
		
		selectProtocol.appendChild(FTP);
		selectProtocol.appendChild(SFTP);
		// PS. Create a createOption function if you add more options
		
		
		var inputHost = document.createElement("input");
		inputHost.setAttribute("type", "text");
		inputHost.setAttribute("id", "inputHost");
		inputHost.setAttribute("class", "inputtext");
		inputHost.setAttribute("value", default.host);
		inputHost.setAttribute("size", "12");
		
		var inputUser = document.createElement("input");
		inputUser.setAttribute("type", "text");
		inputUser.setAttribute("id", "inputUser");
		inputUser.setAttribute("class", "inputtext");
		inputUser.setAttribute("value", default.user);
		inputUser.setAttribute("size", "12");
		
		var inputPw = document.createElement("input");
		inputPw.setAttribute("type", "password");
		inputPw.setAttribute("id", "inputPw");
		inputPw.setAttribute("class", "inputtext");
		inputPw.setAttribute("value", default.pw);
		inputPw.setAttribute("size", "12");
		
		var buttonConnect = document.createElement("input");
		buttonConnect.setAttribute("type", "button");
		buttonConnect.setAttribute("class", "button");
		buttonConnect.setAttribute("id", "FTPSSHbuttonConnect");
		buttonConnect.setAttribute("value", "Connect");
		
		buttonConnect.addEventListener("click", function() {
			connect(protocol, hostName, login, pw);
		}, false);
		
		
		serverManager.appendChild(labelProtocol);
		serverManager.appendChild(selectProtocol);
		
		serverManager.appendChild(labelHost);
		serverManager.appendChild(inputHost);
		
		serverManager.appendChild(labelUser);
		serverManager.appendChild(inputPw);
		
		serverManager.appendChild(buttonConnect);
		
		footer.appendChild(serverManager);
		
	}
	
	function show() {
		// Steal focus from the file
		editor.input = false;
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
	
	
	function connect(protocol, hostName, login, pw) {
		//editor.connect("FTP", "192.168.1.77", "test", "test");
		//editor.connect("SSH", "192.168.1.91", "test", "test");
		
		editor.connect(protocol, hostName, login, pw);
		
	}

})();
