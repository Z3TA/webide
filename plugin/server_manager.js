(function() {
	
	"use strict";
	
	var serverManager;
	
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
		
		var connectButton = document.createElement("input");
		connectButton.setAttribute("type", "button");
		connectButton.setAttribute("class", "button");
		connectButton.setAttribute("id", "FTPSSHconnectButton");
		connectButton.setAttribute("value", "Connect");
		
		connectButton.onclick = connect;
		
		serverManager.appendChild(connectButton);
		
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
	
	
	function connect() {
		//editor.connect("FTP", "192.168.1.77", "test", "test");
		//editor.connect("SSH", "192.168.1.91", "test", "test");
		
		editor.connect("SFTP", "192.168.1.91", "test", "test");
	}

})();
