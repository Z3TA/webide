(function() {
	"use strict";
	
	var DEFAULT_USERNAME = "admin";
	var DEFAULT_PASSWORD = "admin";
	
	var serverLoginDialog = EDITOR.createWidget(buildServerLoginDialog);
	var menuItem;
	
	// Page speed score hack
	if(navigator.userAgent.indexOf("Speed Insights") != -1) return; // Don't connect to server or show login screen
	
	
	EDITOR.plugin({
		desc: "Server login dialog",
		load: loadServerLogin,
		unload: unloadServerLogin,
		order: 100000 // We want to run after most other plugins, so the other plugins can deal with server connections too
	});
	
	
	function loadServerLogin() {
		/*
			Wait before start events and plugins have loaded before connecting to the server !..
			Or plugins listening for events from the server, or loginSuccess etc will not fire.
		*/
		
		CLIENT.on("loginFail", showLoginDialog);
		CLIENT.on("loginSuccess", hideLoginDialog);
		CLIENT.on("connectionConnected", serverLoginOnConnected);
		CLIENT.on("connectionLost", serverLoginOnConnectionLost);
		CLIENT.on("loginNeeded", serverLoginLoginNeeded);
		CLIENT.on("saveLogin", saveLogin);
		
		
		var char_Esc = 27;
		EDITOR.bindKey({desc: "Hide the login widget", charCode: char_Esc, fun: hideLoginDialog});
		
		menuItem = EDITOR.addMenuItem("Switch user", showLoginDialog);
		
		var server = undefined;
		if(EDITOR.localStorage) {
			EDITOR.localStorage.getItem(["editorServerUrl", "editorServerUser"], function(err, stored) {
				var url = stored.editorServerUrl;
				if(url) server = {url: url};
				
				/*
					if(EDITOR.startedCounter == 1 && !stored.editorServerUser && RUNTIME == "browser" &&
					window.location.hostname != "127.0.0.1" && window.location.hostname != "localhost") {
					console.log("First time we run the editor!");
					console.log("Go directly to signup page.");
					window.onbeforeunload = null;
					document.location = "/signup/signup.html" + window.location.search;
					}
				*/
				
				if(!QUERY_STRING["skiplogin"]) CLIENT.connect(server, connectedToServer);
			});
		} else if(!QUERY_STRING["skiplogin"]) CLIENT.connect(server, connectedToServer);
		
		function connectedToServer(err) {
		}
	}
	
	function unloadServerLogin() {
		
		serverLoginDialog.unload();
		
		EDITOR.removeEvent("start", showLoginDialog);
		
		CLIENT.removeEvent("loginFail", showLoginDialog);
		CLIENT.removeEvent("loginSuccess", hideLoginDialog);
		CLIENT.removeEvent("connectionConnected", serverLoginOnConnected);
		CLIENT.removeEvent("connectionLost", serverLoginOnConnectionLost);
		CLIENT.removeEvent("loginNeeded", serverLoginLoginNeeded);
		CLIENT.removeEvent("saveLogin", saveLogin);
		
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
			var userValue = QUERY_STRING["user"];
			var pwValue = QUERY_STRING["pw"];

			if(EDITOR.localStorage) {
				EDITOR.localStorage.getItem(["editorServerUser", "editorServerPw"], function(err, obj) {
					if(err) console.error(err);
					console.log("credentials: ", obj);
					if(obj && obj.editorServerUser) {
						console.log("Using saved credentials to login");
						userValue = userValue || obj["editorServerUser"];
						pwValue = pwValue || obj["editorServerPw"];
					}
					else if(EDITOR.startedCounter == 1 && RUNTIME == "browser" && 
					window.location.hostname != "127.0.0.1" && window.location.hostname != "localhost") {
						console.log("Logging in as guest!");
						userValue = "guest";
						pwValue = "guest";
					}
					else {
						console.log("EDITOR.startedCounter=" + EDITOR.startedCounter + " RUNTIME=" + RUNTIME + " window.location.hostname=" + window.location.hostname);
					}
					attemptLogin();
				});
			}
			else {
				attemptLogin();
			}
		}
		
		function attemptLogin() {
			userValue = userValue || DEFAULT_USERNAME;
			pwValue = pwValue || DEFAULT_PASSWORD;
			if(userValue && pwValue) {
				console.log("Attempting to login to server with user=" + userValue + " ...");
				CLIENT.cmd("identify", {username: userValue, password: pwValue}, function loggedIn(err, resp) {
					
					if(err) {
						console.error(err);
						if(userValue == DEFAULT_USERNAME) alertBox("Failed to automatically login as " + userValue + "." +
						" Fill in your username and password below, or <a href='/signup/signup.html'>create an account</a> !\n" +
						"\n(" + err.message + ")");
						else alertBox(err.message);
						
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
		if(QUERY_STRING["skiplogin"]) return true;
		if(serverLoginDialog.visible) return true;
		EDITOR.hideMenu();
		return serverLoginDialog.show(options);
	}
	
	function hideLoginDialog() {
		return serverLoginDialog.hide();
	}
	
	function saveLogin(user) {
		console.log("SaveLogin:", user);
		EDITOR.localStorage.setItem("editorServerUrl", CLIENT.url);
		EDITOR.localStorage.setItem("editorServerUser", user.user);
		EDITOR.localStorage.setItem("editorServerPw", user.pw);
		
		var inputUser = document.getElementById("serverLoginUser");
		var inputPw = document.getElementById("serverLoginPw");
		
		if(inputUser) inputUser.value = user.user;
		if(inputPw) inputPw.value = user.pw;
		
		// The user will soon be logged in!
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
		labelUrl.appendChild(document.createTextNode("Server URL: "));
		form.appendChild(labelUrl);
		
		if(RUNTIME == "nw.js") {
var defaultUrl =  "http://localhost:8099/jzedit";
		}
		else if(window.location.protocol == "file:") { // Firefox (chrome-less)
			var defaultUrl = "http://localhost:8099/jzedit";
		}
		else { // Browser (other)
			var defaultUrl = window.location.protocol + "//" + window.location.host + "/jzedit";
		}
		
		var urlValue;
		var userValue;
		var pwValue;
		
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
		url.onchange = saveUserPw;
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
		user.onchange = saveUserPw;
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
		pw.onchange = saveUserPw;
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
		
		var cancel = document.createElement("button");
		cancel.setAttribute("type", "button");
		cancel.setAttribute("class", "button");
		cancel.innerText = "Cancel"
		cancel.addEventListener("click", function cancel() {
			hideLoginDialog();
		}, false);
		form.appendChild(cancel);
		
		// ### Signup
		var signupLink = document.createElement("a");
		signupLink.appendChild(document.createTextNode("Signup"));
		signupLink.setAttribute("title", "Click here to create an account");
		signupLink.setAttribute("href", "/signup/signup.html");
		signupLink.setAttribute("class", "signup link");
		form.appendChild(signupLink);
		
		// ### about
		var aboutLink = document.createElement("a");
		aboutLink.appendChild(document.createTextNode("About"));
		aboutLink.setAttribute("title", "More information");
		aboutLink.setAttribute("href", "/about/about.htm");
		aboutLink.setAttribute("class", "signup link");
		aboutLink.setAttribute("target", "_blank");
		form.appendChild(aboutLink);
		
		if(EDITOR.localStorage) {
			EDITOR.localStorage.getItem(["editorServerUrl","editorServerUser", "editorServerPw"], function(err, obj) {
				urlValue = obj.editorServerUrl;
				userValue = obj.editorServerUser;
				pwValue = obj.editorServerPw;
				
				if(urlValue) url.value = urlValue;
				if(userValue) user.value = userValue;
				if(pwValue) pw.value = pwValue;
				});
		}
		
		
		return form;
		
		
		function checkDefaultUrl(e) {
			var checkBox = e.target;
			
			if(checkBox.checked) {
				
				if(url.value != defaultUrl) url.value = defaultUrl;
				
			}
		}
		
		function saveUserPw(e) {
			var urlValue = url.value;
			var userValue = user.value;
			var pwValue = pw.value;
			
			if(!EDITOR.localStorage) console.warn("No EDITOR.localstorage available! Server URL and credentials will not be remembered!");
			else {
				EDITOR.localStorage.getItem(["editorServerUrl", "editorServerUser", "editorServerPw"], function(err, obj) {
					if(err) throw err;
					
					if(urlValue && obj.editorServerUrl != urlValue) EDITOR.localStorage.setItem("editorServerUrl", urlValue);
					if(userValue && obj.editorServerUser != userValue) EDITOR.localStorage.setItem("editorServerUser", userValue);
					if(pwValue && obj.editorServerPw != pwValue) EDITOR.localStorage.setItem("editorServerPw", pwValue);
				});
			}
		}
		
		
		function connectToServer() {
			
			console.log("Login form submitted! Connecting to server ...");
			
			var server = {url: url.value};
			
			if(CLIENT.connected) {
				if(CLIENT.url != server.url || (EDITOR.user && EDITOR.user != user.value)) {
					// Must disconnect in order to login as a different user!
					console.log("Disconnecting from server becasue: CLIENT.url=" + CLIENT.url + " server.url=" + server.url + " EDITOR.user=" + EDITOR.user + " user.value=" + user.value);
					CLIENT.disconnect();
					connectToServer();
				}
				else if(EDITOR.user != user.value) identify();
				else alertBox("Already logged in as user=" + EDITOR.user + " on \n" + CLIENT.url);
			}
			else {
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
