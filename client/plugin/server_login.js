(function() {
	"use strict";
	
	var DEFAULT_USERNAME = "admin";
	var DEFAULT_PASSWORD = "admin";

	var serverLoginDialog = EDITOR.createWidget(buildServerLoginDialog);
	var menuItem;
	
	EDITOR.plugin({
		desc: "Server login dialog",
		load: loadServerLogin,
		unload: unloadServerLogin,
		order: 999999 // We want to run after most other plugins, so the other plugins can deal with server connections too
	});
	

	function loadServerLogin() {

		/*
		Wait before start events and plugins have loaded before connecting to the server !..
		Or plugins listening for events from the server, or loginSuccess etc will not fire.
		*/
		
		var server = undefined;
		
		if(localStorage) {
			var url = localStorage.getItem("editorServerUrl");
			if(url) server = {url: url};
		}

		CLIENT.connect(server, function connectedToServer(err) {
			

		});
	
	
		CLIENT.on("loginFail", showLoginDialog);
		CLIENT.on("loginSuccess", hideLoginDialog);
		CLIENT.on("connectionConnected", serverLoginOnConnected);
		CLIENT.on("connectionLost", serverLoginOnConnectionLost);
		CLIENT.on("loginNeeded", serverLoginLoginNeeded);
		
		var char_Esc = 27;
		EDITOR.bindKey({desc: "Hide the login widget", charCode: char_Esc, fun: hideLoginDialog});

		
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
		CLIENT.removeEvent("connectionConnected", serverLoginOnConnected);
		CLIENT.removeEvent("connectionLost", serverLoginOnConnectionLost);
		CLIENT.removeEvent("loginNeeded", serverLoginLoginNeeded);
		
		EDITOR.unbindKey(hideLoginDialog);
		
		if(menuItem) EDITOR.removeMenuItem(menuItem);
	}
	
	function serverLoginLoginNeeded(loginNeededByCommand) {
		console.log("Login needed because of command: " + loginNeededByCommand);
		showLoginDialog();
	}
	
	function serverLoginOnConnectionLost() {
		
		// The editor will try to connect to the default server when it starts
		
		console.log("Connection to the server has been lost!");
		
		showLoginDialog({stealFocus: false});
		
	}
	
	function serverLoginOnConnected(err) {
		
		console.log("Got connect callback! err=" + err);
		if(err) {
			if(err.code != "CONNECTION_CLOSED") throw new Error(err.message);
			//alertBox("Unable to connect to server ...	The editor will have limited functionality !");
			
			showLoginDialog();
		}
		else {
			
			// Attempt to login ...
			
			if(localStorage) {
				var userValue = localStorage.getItem("editorServerUser") || DEFAULT_USERNAME;
				var pwValue = localStorage.getItem("editorServerPw") || DEFAULT_PASSWORD;
			}
			
			if(userValue && pwValue) {
				console.log("Attempting to login to server with user=" + userValue + " ...");
				CLIENT.cmd("identify", {username: userValue, password: pwValue}, function loggedIn(err, resp) {
					
					if(err) {
						console.error(err);
						showLoginDialog();
					}
					else {
						hideLoginDialog();
						console.log("Successfully logged into server with user=" + resp.loginSuccess.user);
					}
					
				});
				
			}
			else showLoginDialog();
			
		}
		
	}
	
	function showLoginDialog(options) {
		return serverLoginDialog.show(options);
	}
	
	function hideLoginDialog() {
		return serverLoginDialog.hide();
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
		labelUrl.appendChild(document.createTextNode("Server URL: "));
		form.appendChild(labelUrl);
		
		if(window.location.protocol == "file:") {
			var defaultUrl = "http://localhost:8099/jzedit";
		}
		else {
			var defaultUrl = window.location.protocol + "//" + window.location.host + "/jzedit";
		}
		
		if(defaultUrl.indexOf("chrome-extension") == 0) defaultUrl =  "http://localhost:8099/jzedit";
		
		var urlValue;
		var userValue;
		var pwValue;
		
		if(localStorage) {
			urlValue = localStorage.getItem("editorServerUrl");
			userValue = localStorage.getItem("editorServerUser");
			pwValue = localStorage.getItem("editorServerPw");
		}
		
		if(!urlValue) urlValue = defaultUrl;
		if(!userValue) {
			userValue = DEFAULT_USERNAME;
			pwValue = DEFAULT_PASSWORD;
		}

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
		user.setAttribute("value", userValue);
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
		pw.setAttribute("value", pwValue);
		pw.onchange = save;
		form.appendChild(pw);
		
		// ### Connect button
		var connectButton = document.createElement("input");
		connectButton.setAttribute("type", "submit");
		connectButton.setAttribute("class", "button");
		connectButton.setAttribute("value", "Login");
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
		
		
		// Signup message
		var signupLink = document.createElement("a");
		signupLink.appendChild(document.createTextNode("Signup / create account »"));
		signupLink.setAttribute("href", "/signup/signup.html");
		signupLink.setAttribute("class", "signup link");
		form.appendChild(signupLink);
		
		
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
			var pwValue = pw.value;
			
			if(!localStorage) console.warn("No localstorage available! Server URL and credentials will not be remembered!");
			else {
				if(urlValue && localStorage.getItem("editorServerUrl") != urlValue) localStorage.setItem("editorServerUrl", urlValue);
				if(userValue && localStorage.getItem("editorServerUser") != userValue) localStorage.setItem("editorServerUser", userValue);
				if(pwValue && localStorage.getItem("editorServerPw") != pwValue) localStorage.setItem("editorServerPw", pwValue);
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
						alertBox("Unable to login: " + err.message + "\nURL: " + server.url);
					}
					else {
						alertBox("Successfully logged in to:\n" + server.url + "\nUser: " + resp.loginSuccess.user);
					}
				});
					
			}
			
		}
		
		
		
	}
	
	
})();
