
// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
	if(details.reason == "install"){
		//console.log("This is a first install!");
		
		// Signup for an account !?
		
		var user = {
			editorServerUrl: "https://webide.se/jzedit",
			editorServerUser: "demo",
			editorServerPw: "demo"
		}
		
		// storage.local and storage.sync seems to be different! The editor uses storage.sync!
		
		chrome.storage.sync.set(user, function() {
			console.log("chrome.storage.sync.set: ", user);
		});
		
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
chrome.app.runtime.onLaunched.addListener(function() {
	//console.log("App launched!");
	chrome.app.window.create('index.htm', {
		id: 'main',
		bounds: { width: 620, height: 500 }
	});
});


