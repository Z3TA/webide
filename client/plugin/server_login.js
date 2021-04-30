(function() {
	"use strict";
	
	var DEFAULT_USERNAME = "admin";
	var DEFAULT_PASSWORD = "admin";
	
	var serverLoginDialog = EDITOR.createWidget(buildServerLoginDialog);
	var menuItem;
	var clickedConnectLogin = false; // If the user has clicked login from the login dialog
	
	var loggingIn = false;
	var loginButton;
	
	var winMenuLogin;
	
	// Page speed score hack
	if(navigator.userAgent.indexOf("Speed Insights") != -1) return; // Don't connect to server or show login screen
	
	var locally = window.location.hostname == "127.0.0.1" || window.location.hostname == "localhost";

	
	EDITOR.plugin({
		desc: "auto login",
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
		CLIENT.on("connectionConnected", serverReLoginOnConnected);
		CLIENT.on("connectionLost", serverLoginOnConnectionLost);
		CLIENT.on("loginNeeded", serverLoginLoginNeeded);
		CLIENT.on("saveLogin", saveLogin);
		
		
		var char_Esc = 27;
		EDITOR.bindKey({desc: S("hide_login_widget"), charCode: char_Esc, fun: hideLoginDialog});
		
		//menuItem = EDITOR.ctxMenu.add("Switch user", loginDialogFromMenu, 13);
		
		winMenuLogin = EDITOR.windowMenu.add(S("switch_server_user"), [S("Editor"), 2], loginDialogFromMenu);
		
		// Connecting to the server is done by EDITOR.js, we can however switch server using this plugin
	}
	
	function loginDialogFromMenu() {
		showLoginDialog();
		winMenuLogin.hide();
		EDITOR.ctxMenu.hide();
	}
	
	function unloadServerLogin() {
		
		serverLoginDialog.unload();
		
		EDITOR.removeEvent("start", showLoginDialog);
		
		CLIENT.removeEvent("loginFail", showLoginDialog);
		CLIENT.removeEvent("loginSuccess", hideLoginDialog);
		CLIENT.removeEvent("connectionConnected", serverReLoginOnConnected);
		CLIENT.removeEvent("connectionLost", serverLoginOnConnectionLost);
		CLIENT.removeEvent("loginNeeded", serverLoginLoginNeeded);
		CLIENT.removeEvent("saveLogin", saveLogin);
		
		EDITOR.unbindKey(hideLoginDialog);
		
		EDITOR.windowMenu.remove(winMenuLogin);
		
		//if(menuItem) EDITOR.ctxMenu.remove(menuItem);
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
	
	function serverReLoginOnConnected(err) {
		// ## Automaitcally re-loggin when re-connected to server
		
		console.log("serverReLoginOnConnected: CLIENT.lastCommand=" + CLIENT.lastCommand + " CLIENT.commandCounter=" + CLIENT.commandCounter + " CLIENT.inFlight=" + CLIENT.inFlight);

		var loginScreen = document.getElementById("loginScreen");
		if(loginScreen && loginScreen.style.display != "none") {
			console.log("Not re-login if loginScreen is visible");
			return;
		}
		else {
			console.log("loginScreen=", loginScreen, " loginScreen.style.display=" + loginScreen.style.display);
		}

		if(CLIENT.commandCounter < 3) {
			console.log("Not re-login because CLIENT.commandCounter=" + CLIENT.commandCounter);
			return;
		}

		if(loggingIn) return;
			
		console.log("Got connect callback! err=" + err);
		if(err) {
			if(err.code != "CONNECTION_CLOSED") throw new Error(err.message);
			//alertBox("Unable to connect to server ...	The editor will have limited functionality !");
			
			showLoginDialog();
		}
		else {
			var userValue = QUERY_STRING["user"];
			var pwValue = QUERY_STRING["pw"];

			console.log("userValue=" + userValue + " pwValue=" + pwValue);
			
			if(EDITOR.localStorage) { // && !userValue
				console.log("Checking for editorServerUser and editorServerPw in local storage ...");
				EDITOR.localStorage.getItem(["editorServerUser", "editorServerPw"], function gotLoginFromLocalStorage(err, obj) {
					if(err) console.error(err);
					
					console.log("credentials: ", obj);
					if(obj && obj.editorServerUser) {
						console.log("Using saved credentials to login ...");
						userValue = obj["editorServerUser"] || userValue;
						pwValue = obj["editorServerPw"] || pwValue;
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

			console.trace("attemptLogin!");
			if(!userValue && locally) {
				console.log("Using default login because userValue=" + userValue + " and locally=" + locally);
				userValue = DEFAULT_USERNAME;
				pwValue = DEFAULT_PASSWORD;
			}
			
			if(userValue && pwValue) {
				console.log("Attempting to login to server with user=" + userValue + " pwValue=" + pwValue + " EDITOR.version=" + EDITOR.version + " ...");
				loggingIn = true;
				if(loginButton) loginButton.disabled = true;
				
				var nat_code = QUERY_STRING["nat_code"];
				if(nat_code) {
					// Send nat request before logging in
					console.log("Sending NAT request... (before auto login)!");
					CLIENT.cmd("NAT", {code: nat_code}, function natResponse(err, resp) {
						console.log("NAT request response (before auto login)! err=" + err + " resp=" + resp);
						if(err) return alertBox("Unable to automatically connect to server! Error: " + err.message);
						identify();
					});
				}
				else {
					identify();
				}
			}
			else {
				showLoginDialog();
				
				if(userValue && !pwValue) {
					var serverLoginPw = document.getElementById("serverLoginPw");
					if(serverLoginPw) serverLoginPw.focus();
				}
			}

			function identify() {
				CLIENT.cmd("identify", {username: userValue, password: pwValue, sessionId: EDITOR.sessionId, editorVersion: EDITOR.version}, function loggedInMaybe(err, resp) {
					loggingIn = false;
					if(loginButton) loginButton.disabled = false;
					if(err) {
						console.error(err);

						if(err.message.indexOf("Username specified in server arguments") != -1) {
							alertBox("Login with the username/password specified in server command arguments! (admin/admin is default)", "LOGIN_FAIL");
						}
						else if(userValue == DEFAULT_USERNAME) {
							alertBox("Failed to automatically login as " + userValue + "." +
							" Fill in your username and password, or <a href='/signup/signup.htm'>Create a New account</a> !\n" +
							"\n(" + err.message + ")", "LOGIN_FAIL");
						}
						else if( userValue.match(/^guest\d+$/) && pwValue != "guest" ) {
							alertBox("Failed to login as " + userValue + ". It is likely that the guest account have been reset because of inactivity!", "LOGIN_FAIL");
						}
						else alertBox(err.message, "LOGIN_FAIL");

						showLoginDialog();
					}
					else {
						hideLoginDialog();

						console.log("Successfully logged into server with user=" + resp.loginSuccess.user);

						
					}
				});
			}
		}
	}
	
	function showLoginDialog(options) {

		if(loginScreen) {
			var loginButton = document.getElementById("loginButton");
			if(loginButton) loginButton.disabled = false;
			
			var loginAsGuest = document.getElementById("loginAsGuest");
			if(loginAsGuest) loginAsGuest.disabled = false;

		}

		console.warn("showLoginDialog: options=" + JSON.stringify(options) + " serverLoginDialog.visible=" + serverLoginDialog.visible);
		if(QUERY_STRING["skiplogin"]) {
			
			console.log('Not showing login dialog because QUERY_STRING["skiplogin"]=' + QUERY_STRING["skiplogin"]);
			return true;
		
		}
		if(serverLoginDialog.visible) {
			console.log("Not showing login dialog because serverLoginDialog.visible=" + serverLoginDialog.visible);
			return true;
		}
		
		console.log("Showing login dialog! options=" + JSON.stringify(options))
		return serverLoginDialog.show(options);
	}
	
	function hideLoginDialog() {
		console.log("hideLoginDialog!");

		if(typeof loginScreen == "object") {
			loginScreen.style.display="none";
		}

		console.log(UTIL.getStack("hideLoginDialog"));
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
		
		
		
		if(RUNTIME == "nw.js") {
			var defaultUrl =  "http://localhost:8099/webide";
		}
		else if(window.location.protocol == "file:") { // Firefox (chrome-less)
			var defaultUrl = "http://localhost:8099/webide";
		}
		else { // Browser (other)
			var defaultUrl = window.location.protocol + "//" + window.location.host + "/webide";
		}
		
		var urlValue;
		var userValue = QUERY_STRING.user;
		var pwValue = QUERY_STRING.pw;
		var nat_code = QUERY_STRING["nat_code"];

		if(!urlValue) urlValue = defaultUrl;
		
		if(!userValue && locally) {
			userValue = DEFAULT_USERNAME;
			pwValue = DEFAULT_PASSWORD;
		}
		
		if(nat_code) {

			var labelNat = document.createElement("label");
			labelNat.setAttribute("for", "natCode");
			labelNat.appendChild(document.createTextNode("NAT code: "));
			form.appendChild(labelNat);

			var natCodeInput = document.createElement("input");
			natCodeInput.setAttribute("type", "text");
			natCodeInput.setAttribute("class", "inputtext url");
			natCodeInput.setAttribute("title", "Code generated from the server behind NAT you want to connec to");
			natCodeInput.setAttribute("size", "30");
			natCodeInput.setAttribute("value", nat_code);
			form.appendChild(natCodeInput);
			
		}
		else {

			// ### Url
			var labelUrl = document.createElement("label");
			labelUrl.setAttribute("for", "serverLoginUrl");
			labelUrl.appendChild(document.createTextNode("Server URL: "));
			form.appendChild(labelUrl);

			var url = document.createElement("input");
			url.setAttribute("type", "text");
			url.setAttribute("id", "serverLoginUrl");
			url.setAttribute("class", "inputtext url");
			url.setAttribute("title", "URL to WebIDE server");
			url.setAttribute("size", "30");
			url.setAttribute("value", urlValue);
			url.onchange = saveUserPw;
			form.appendChild(url);
		}

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
		if(userValue) user.setAttribute("value", userValue);
		user.onchange = saveUserPw;
		form.appendChild(user);
		
		// ### password
		var labelPw = document.createElement("label");
		labelPw.setAttribute("for", "serverLoginPw");
		labelPw.appendChild(document.createTextNode("Password: "));
		form.appendChild(labelPw);
		
		var pw = document.createElement("input");
		pw.setAttribute("type", "password");
		pw.setAttribute("id", "serverLoginPw");
		pw.setAttribute("class", "inputtext password");
		pw.setAttribute("size", "10");
		if(pwValue) pw.setAttribute("value", pwValue);
		pw.onchange = saveUserPw;
		form.appendChild(pw);
		
		// ### Connect button
		loginButton = document.createElement("input");
		loginButton.setAttribute("type", "submit");
		loginButton.setAttribute("class", "button");
		loginButton.setAttribute("value", "Login");
		//loginButton.onclick = form.submit();
		form.appendChild(loginButton);
		
		
		if(!nat_code) {
			// ### Default url checkbox
			var checkDefUrl = document.createElement("input");
			checkDefUrl.setAttribute("type", "checkbox");
			checkDefUrl.onclick = checkDefaultUrl;
			checkDefUrl.checked = (url.value == defaultUrl);
			checkDefUrl.setAttribute("id", "checkDefUrl");
			var labelCheckDefUrl = document.createElement("label");
			labelCheckDefUrl.setAttribute("for", "checkDefUrl");
			labelCheckDefUrl.appendChild(checkDefUrl);
			labelCheckDefUrl.appendChild(document.createTextNode("Use default URL"));
			form.appendChild(labelCheckDefUrl);
		}

		var cancel = document.createElement("button");
		cancel.setAttribute("type", "button");
		cancel.setAttribute("class", "button");
		cancel.innerText = "Cancel"
		cancel.addEventListener("click", function cancel() {
			hideLoginDialog();
		}, false);
		form.appendChild(cancel);
		
		// ### Signup
		if(!EDITOR.user || EDITOR.user.name != "admin") {
			var signupLink = document.createElement("a");
			signupLink.appendChild(document.createTextNode("Signup"));
			signupLink.setAttribute("title", "Click here to create an account");
			signupLink.setAttribute("href", "/signup/signup.htm");
			signupLink.setAttribute("class", "signup link");
			form.appendChild(signupLink);
		}
		
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
				if(err) return;
				
				urlValue = obj.editorServerUrl;
				userValue = obj.editorServerUser;
				pwValue = obj.editorServerPw;
				
				if(urlValue && !nat_code) url.value = urlValue;
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
			var urlValue = url && url.value;
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
		
		
		function connectToServer(e) {
			
			if(typeof e == "object" && typeof e.preventDefault == "function") e.preventDefault();
			
			// ## Manually logging in via login form
			
			clickedConnectLogin = true;
			console.log("Login form submitted! Connecting to server ...");
			
			var server = nat_code ? {url: nat_code} : {url: url.value};
			
			if(CLIENT.connected) {
				if(CLIENT.url != server.url || (EDITOR.user && EDITOR.user.name != user.value)) {
					// Must disconnect in order to login as a different user!
					console.log("Disconnecting from server becasue: CLIENT.url=" + CLIENT.url + " server.url=" + server.url + " EDITOR.user.name=" + (EDITOR.user && EDITOR.user.name) + " user.value=" + user.value);
					CLIENT.disconnect();
					connectToServer();
				}
				else{
					login();
				}
			}
			else {
				CLIENT.connect(server, function connectionOpen(errConnect) {
					if(errConnect) {
						
						// Couln't connect after renameing /jzedit to /webide ...
						// The editor will only check the version after a successful connection
						// But the connection failed, so make sure we are on the latest client version
						UTIL.httpGet("version.txt", function(errGetVersion, str) {
							if(errGetVersion) {
								
								//var loc = UTIL.getLocation(server.url);
								//var port = loc.port;
								
								var msg = 'Try this if you have problems connecting ... ( current config: ' + JSON.stringify(server) + '):\n\n<ul>';
								//if(BROWSER == "MSIE" && port) msg += '<li>* Try starting the server on port 80 instead of port ' + port + '!.</li>\n';
								msg += '<li>* Click two times on "Use default URL" then click the Login button again.</li>\n'; // It might say host:wrong port and clicking on use default will change to the correct port
								msg += '<li>* In the top menu choose: Editor > Unregister service worker.</li>\n';
								msg += '<li>* Contact support.</li>';
								msg += '</ul>';
								
								alertBox(msg);
								
								return;
							}
							var version = parseInt(str);
							if(isNaN(version)) throw new Error("str=" + str + " version=" + version);
							CLIENT.fireEvent("editorVersion", version);
						});
						
					}
					else {
						console.log("Attempting logging in after connection ...");
						login();
					}
				});
			}
			
			return false; // Don't navigate away (on form submit)
			
			function login() {

				loggingIn = true;
				if(loginButton) loginButton.disabled = true;
				// Issue: if server restarts or have an issue, login-button will be stuck as disabled
				// So just in case:
				setTimeout(function() {
					if(loginButton) loginButton.disabled = false;
				}, 5000);
				
				var nat_code = QUERY_STRING["nat_code"];
				if(nat_code) {
					// Send nat request before logging in
					console.log("Seding NAT request after submitting form...");
					CLIENT.cmd("NAT", {code: nat_code}, function natResponse(err, resp) {
						console.log("NAT request response (after submitting form)! err=" + err + " resp=" + resp);
						if(err) return alertBox("Unable to send NAT request! Error: " + err.message);
						identify();
					});
				}
				else {
					identify();
				}

				function identify() {
					CLIENT.cmd("identify", {username: user.value, password: pw.value, sessionId: EDITOR.sessionId, editorVersion: EDITOR.version}, function loggedIn(err, resp) {
						loggingIn = false;
						if(loginButton) loginButton.disabled = false;
						if(err) {
							console.error(err);
							alertBox("Unable to login: " + err.message + "\nURL: " + server.url);
						}
						else {
							alertBox("Successfully logged in to:\n" + server.url + "\nUser: " + resp.loginSuccess.user);
							saveLogin({user: user.value, pw: pw.value});
						}
					});
				}
				
			}
			
		}
		
		
		
	}
	
	
})();
