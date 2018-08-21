"use strict";

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
	if(details.reason == "install"){
		//console.log("This is a first install!");
		
		// Signup for an account !?
		var username = "";
		if(chrome.identity) {
			console.log("Requesting user info ...");
			chrome.identity.getProfileUserInfo(function(userInfo) {
				console.log("Got user info: ", userInfo);
				if(userInfo.email) {
					var reUser = /(.*)@.*/;
					var matchUser = userInfo.email.match(reUser);
					if(matchUser) username = matchUser[1].replace(/\W/g, '')
					else console.warn(userInfo.email, " does not match ", reUser);
				}
				else if(userInfo.id) {
					username = userInfo.id;
				}
				else {
					// The user is most likely not logged in
					username = "zetafiles";
				}
				
				if(username) signup(username);
				else console.warn("Unable to retrieve username from ", userInfo);
			});
		}
		else {
			console.log("chrome.identity not available! User has to signup manually!");
		}
		}
	else if(details.reason == "update"){
		var thisVersion = chrome.runtime.getManifest().version;
		//console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
	}
});

/**
	* Listens for the app launching then creates the window
	*
	* @see http://developer.chrome.com/apps/app.window.html
*/
chrome.app.runtime.onLaunched.addListener(appLaunched);



function appLaunched() {
	//console.log("App launched!");
	
	chrome.storage.sync.get("editorServerUser", function(obj) {
		console.log("obj=", obj);
		
		if(obj.editorServerUser) {
			// User will be auto logged-in
			chrome.app.window.create('index.htm', {id: 'main', innerBounds: {width: 800, height: 600}});
		}
		else {
			console.log("No username saved! Showing signup");
			chrome.app.window.create('signup/signup.htm', {id: 'signup', innerBounds: { width: 850, height: 900 }});
		}
	});
}

function saveLogin(username, pw, url) {
	console.log("Saving login details username=" + username + " pw=" + pw + " url=" + url + "...");
	var user = {};
	user.editorServerUrl = "https://webide.se/jzedit";
	if(username) user.editorServerUser = username;
	if(pw) user.editorServerPw = pw;
	if(url) user.editorServerUrl = url;
	
	if(username || pw || url) {
	// storage.local and storage.sync seems to be different! The editor uses storage.sync!
	chrome.storage.sync.set(user, function() {
		console.log("Login details saved:", user);
	});
	}
	else console.warn("Nothing to save!");
}

function signup(username) {
	console.log("Signing up username=" + username + " ...");
	
	var pw = generatePassword();
	
	httpPost("https://signup.webide.se/createAccount", {user: username, pw: pw}, function(err, data) {
		if(err) {
			console.log("Problem signing up (code=" + err.code + " readyState=" + err.readyState + ")");
			console.error(err);
		}
		else {
			console.log("Successfully signed up!");
			saveLogin(username, pw);
		}
	});
}

function httpPost(url, form, callback) {
	
	console.log("Posting ", form, " to ", url, " ...");
	
	var xmlHttp = new XMLHttpRequest();
	var timeoutTimer;
	var timeoutTimeMs = 3000;
	
	var formData = "";
	
	for(var name in form) {
		formData += name + "=" + encodeURIComponent(form[name]) + "&";
	}
	if(formData.length == 0) throw new Error("Form contains no data!");
	formData = formData.substring(0, formData.length); // Remove last &
	
	//console.log("url=" + url);
	
	xmlHttp.onreadystatechange = function httpReadyStateChange() {
		if(xmlHttp.readyState == 4) {
			clearTimeout(timeoutTimer);
			if(xmlHttp.status == 200) callback(null, xmlHttp.responseText);
			else {
				var err = new Error(xmlHttp.responseText);
				err.readyState = xmlHttp.readyState;
				err.code = xmlHttp.status;
				callback(err);
			}
		}
		//else console.log("xmlHttp.readyState=" + xmlHttp.readyState);
	}
	
	xmlHttp.open("POST", url, true); // true for asynchronous
	xmlHttp.send(formData);
	
	timeoutTimer = setTimeout(timeout, timeoutTimeMs);
	
	function timeout() {
		var err = new Error("HTTP POST request timed out. xmlHttp.readyState=" + xmlHttp.readyState);
		xmlHttp.onreadystatechange = null;
		xmlHttp.abort();
		callback(err);
	}
	
}

function generatePassword() {
	// from: https://stackoverflow.com/questions/9719570/generate-random-password-string-with-requirements-in-javascript
	var Password = {
		_pattern : /[a-zA-Z0-9_\-\+\.]/,
		_getRandomByte : function() {
			// http://caniuse.com/#feat=getrandomvalues
			if(window.crypto && window.crypto.getRandomValues) {
				var result = new Uint8Array(1);
				window.crypto.getRandomValues(result);
				return result[0];
			}
			else if(window.msCrypto && window.msCrypto.getRandomValues) {
				var result = new Uint8Array(1);
				window.msCrypto.getRandomValues(result);
				return result[0];
			} 
			else {
				return Math.floor(Math.random() * 256);
			}
		},
		
		generate : function(length) {
			return Array.apply(null, {'length': length}).map(function() {
				var result;
				while(true) {
					result = String.fromCharCode(this._getRandomByte());
					if(this._pattern.test(result)) {
						return result;
					}
				}
			}, this).join('');
		}
	};
	
	return Password.generate(5);
}
