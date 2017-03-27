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
		
		var form = document.createElement("form");
		form.onsubmit = connectToServer;
		
		// ### Url
		var labelUrl = document.createElement("label");
		labelUrl.setAttribute("for", "serverLoginUrl");
		labelUrl.appendChild(document.createTextNode("URL: "));
		form.appendChild(labelUrl);

		var defaultUrl = "http://localhost:8099/jzedit";
		var urlValue;
		
		if(localStorage) {
			urlValue = localStorage.getItem("editorServerUrl");
		}
		
		if(!urlValue) urlValue = defaultUrl;

		var url = document.createElement("input");
		url.setAttribute("type", "text");
		url.setAttribute("id", "serverLoginUrl");
		url.setAttribute("class", "inputtext url");
		url.setAttribute("title", "URL to JZedit server");
		url.setAttribute("size", "30");
		url.setAttribute("value", urlValue);
		url.onchange = save;
		form.appendChild(url);
		
		// ### user
		var labelUser = document.createElement("label");
		labelUser.setAttribute("for", "serverLoginUser");
		labelUser.appendChild(document.createTextNode("Username: "));
		form.appendChild(labelUser);
		
		var user = document.createElement("input");
		user.setAttribute("type", "text");
		user.setAttribute("id", "serverLoginUser");
		user.setAttribute("class", "inputtext username");
		user.setAttribute("size", "10");
		user.setAttribute("value", "admin");
		user.onchange = save;
		form.appendChild(user);
		
		// ### password
		var labelPw = document.createElement("label");
		labelPw.setAttribute("for", "serverLoginPw");
		labelPw.appendChild(document.createTextNode("Username: "));
		form.appendChild(labelPw);
		
		var pw = document.createElement("input");
		pw.setAttribute("type", "password");
		pw.setAttribute("id", "serverLoginPw");
		pw.setAttribute("class", "inputtext password");
		pw.setAttribute("size", "10");
		pw.setAttribute("value", "admin");
		form.appendChild(pw);
		
		// ### Connect button
		var connectButton = document.createElement("input");
		connectButton.setAttribute("type", "submit");
		connectButton.setAttribute("class", "button");
		connectButton.setAttribute("value", "Connect");
		//connectButton.onclick = connectToServer;
		form.appendChild(connectButton);
		
		
		// ### Default url checkbox
		var checkDefUrl = document.createElement("input");
		checkDefUrl.setAttribute("type", "checkbox");
		checkDefUrl.onclick = checkDefaultUrl;
		checkDefUrl.checked = (url.value == defaultUrl);
		checkDefUrl.setAttribute("id", "checkDefUrl");
		form.appendChild(checkDefUrl);
		

		var labelCheckDefUrl = document.createElement("label");
		labelCheckDefUrl.setAttribute("for", "checkDefUrl");
		labelCheckDefUrl.appendChild(document.createTextNode("Use default URL"));
		form.appendChild(labelCheckDefUrl);

		return form;
		
		
		function checkDefaultUrl(e) {
			var checkBox = e.target;
			
			if(checkBox.checked) {
				
				if(url.value != defaultUrl) url.value = defaultUrl;
				
			}
		}
		
		function save(e) {
			
			var urlValue = url.value;
			var userValue = user.value;
			
			if(!localStorage) console.warn("No localstorage available! Server url will not be remembered.");
			else {
				if(urlValue && localStorage.getItem("editorServerUrl") != urlValue) localStorage.setItem("editorServerUrl", urlValue);
				if(userValue && localStorage.getItem("editorServerUser") != userValue) localStorage.setItem("editorServerUser", userValue);
			}

		}
		
		
		function connectToServer(e) {
			
			var server = {url: url.value};
			
			if(CLIENT.connected) {
				if(CLIENT.url != server.url || EDITOR.user != user.value) {
					console.log("CLIENT.url=" + CLIENT.url + " server.url=" + server.url + " EDITOR.user=" + EDITOR.user + " user.value=" + user.value);
					CLIENT.disconnect();
				}
				else if(EDITOR.user != user.value) identify();
				else alertBox("Already logged in as user=" + EDITOR.user + " on \n" + CLIENT.url);
			}
			
			if(!CLIENT.connected) {
				CLIENT.connect(server, function connectionOpen(err) {
					if(err) alertBox("Problem connecting to JZedit server on " + JSON.stringify(server));
					else identify()
				});
			}
			
			return false; // Don't navigate away (on form submit)
			
			function identify() {
				
				CLIENT.cmd("identify", {username: user.value, password: pw.value}, function loggedIn(err, resp) {
					if(err) {
						console.error(err);
						alertBox("Unable to login to JZedit server on " + JSON.stringify(server) + "\nError: " + err.message);
					}
					else {
						alertBox("Successfully logged in to:\n" + server.url + "\nUser:" + resp.loginSuccess.user);
					}
				});
					
			}
			
		}
		
		
		
	}
	
	
})();
