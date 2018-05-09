// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
	if(details.reason == "install"){
		//console.log("This is a first install!");
		
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


