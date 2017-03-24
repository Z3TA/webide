(function() {
	"use strict";
	
	var serverLoginDialog = EDITOR.createWidget(buildServerLoginDialog);
	var menuItem;
	
	EDITOR.plugin({
		desc: "Server login dialog",
		load: loadServerLogin,
		unload: unloadServerLogin
	});
	
	function loadServerLogin() {

		EDITOR.on("start", showLoginDialog);
		
		CLIENT.on("loginFail", showLoginDialog);
		CLIENT.on("loginSuccess", hideLoginDialog);
		CLIENT.on("connectionConnected", showLoginDialog);
		
		
		
		menuItem = EDITOR.addMenuItem("Login to JZeidt server", function() {
			showLoginDialog();
			EDITOR.hideMenu();
		});
		
	}
	
	function unloadServerLogin() {
		
		serverLoginDialog.unload();

		EDITOR.removeEvent("start", showLoginDialog);
		
		CLIENT.removeEvent("loginFail", showLoginDialog);
		CLIENT.removeEvent("loginSuccess", hideLoginDialog);
		CLIENT.removeEvent("connectionConnected", showLoginDialog);
		
		if(menuItem) EDITOR.removeMenuItem(menuItem);
	}
	
	function showLoginDialog() {
		serverLoginDialog.show();
		}
	
	function hideLoginDialog() {
		serverLoginDialog.hide();
	}
	
	function buildServerLoginDialog(widget) {
		/*
		return widget.create([
			[{type: "text", label: "Hostname/IP:", value: "localhost"}],
			[{type: "text", label: "Username:", value: "admin"}],
			[{type: "password", label: "Password:", value: "admin"}],
			[{type: "button", label: "Connect", onclick: connectToServer}]
		]);
		*/
		
		var main = document.createElement("div");
		
		// ### Url
		var labelUrl = document.createElement("label");
		labelUrl.setAttribute("for", "serverLoginUrl");
		labelUrl.appendChild(document.createTextNode("URL: "));
		main.appendChild(labelUrl);

		var url = document.createElement("input");
		url.setAttribute("type", "text");
		url.setAttribute("id", "serverLoginUrl");
		url.setAttribute("class", "inputtext url");
		url.setAttribute("title", "URL to JZedit server");
		url.setAttribute("size", "30");
		url.setAttribute("value", "http://localhost:8099/jzedit");
		main.appendChild(url);
		
		// ### user
		var labelUser = document.createElement("label");
		labelUser.setAttribute("for", "serverLoginUser");
		labelUser.appendChild(document.createTextNode("Username: "));
		main.appendChild(labelUser);
		
		var user = document.createElement("input");
		user.setAttribute("type", "text");
		user.setAttribute("id", "serverLoginUser");
		user.setAttribute("class", "inputtext username");
		user.setAttribute("size", "10");
		user.setAttribute("value", "admin");
		main.appendChild(user);
		
		// ### password
		var labelPw = document.createElement("label");
		labelPw.setAttribute("for", "serverLoginPw");
		labelPw.appendChild(document.createTextNode("Username: "));
		main.appendChild(labelPw);
		
		var pw = document.createElement("input");
		pw.setAttribute("type", "password");
		pw.setAttribute("id", "serverLoginPw");
		pw.setAttribute("class", "inputtext password");
		pw.setAttribute("size", "10");
		pw.setAttribute("value", "admin");
		main.appendChild(pw);
		
		// ### Connect button
		var connectButton = document.createElement("input");
		connectButton.setAttribute("type", "button");
		connectButton.setAttribute("class", "button");
		connectButton.setAttribute("value", "Connect");
		main.appendChild(connectButton);
		
		connectButton.onclick = function connectToServer() {
			
			var server = {url: url.value};
			
			if(CLIENT.connected) {
				if(CLIENT.url != server.url) {
					console.log("CLIENT.host=" + CLIENT.host + " != server.host=" + server.host);
					CLIENT.disconnect();
				}
				else identify();
			}
			
			if(!CLIENT.connected) {
				CLIENT.connect(server, function connectionOpen(err) {
					if(err) alertBox("Problem connecting to JZedit server on " + JSON.stringify(server));
					else identify()
				});
			}
			
			function identify() {
				
				CLIENT.cmd("identify", {username: user.value, password: pw.value}, function loggedIn(err, resp) {
					if(err) {
						console.error(err);
						alertBox("Unable to login to JZedit server on " + JSON.stringify(server) + "\nError: " + err.message);
					}
					else {
						alertBox("Successfully logged in to " + JSON.stringify(server) + "\n" + JSON.stringify(resp));
					}
				});
					
			}
			
		}
		
		return main;
		
	}
	
	
})();
