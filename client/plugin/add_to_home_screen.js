/*
	Add to Home Screen
	------------------
	
	https://developers.google.com/web/fundamentals/app-install-banners/
	
	
	Dilemma:
	When should we show the A2HS message ?
	Should we wait until the user has logged in or signed up !?
	
*/

(function() {
	
	console.log("A2HS: Loading ...");
	
	if(DISPLAY_MODE == "standalone") {
console.log('A2HS: Already running from "shelf" (DISPLAY_MODE=' + DISPLAY_MODE + '). Will not ask user to add to desktop/home screen"');
	return;
	}
	
	var loc = window.location.href;
	var localhost = false;
	if( loc.match(/127\.0\.\d{1,3}\.\d{1,3}/) ) localhost = true;
	if( loc.match(/10\.\d{1,3}\.\d{1,3}\.\d{1,3}/) ) localhost = true;
	if( loc.match(/176\.16\.\d{1,3}\.\d{1,3}/) ) localhost = true;
	if( loc.match(/192\.168\.\d{1,3}\.\d{1,3}/) ) localhost = true;
	if( loc.match(/3\.webide\.se/) ) localhost = true;
	if( loc.match(/localhost\.webide\.se/) ) localhost = true;
	
	if(localhost) {
		
		console.warn("A2HS: Not asking to install because we are running on localhost!");
		return;
		
		// Chrome added a huge white top bar when launching from desktop and http: (no SSL)
		// Instead start the editor using ./start.js
	}
	
	var deferredPrompt;
	
	window.addEventListener('beforeinstallprompt', beforeinstallprompt);
	window.addEventListener('appinstalled', appinstalled);
	
	var askInterval;
	askInterval = setInterval(ask, 10000);
	
	var installed = false;
	var windowMenuAdd2HS;
	
	
	
	
	function addToHomeScreen() {
		if(deferredPrompt) deferredPrompt.prompt();
		else alertBox("You need to interact with the editor before your browser will let you add it to your home screen!");
	}
	
	
	function appinstalled(evt) {
		console.log('A2HS: Got appinstalled event!');
		
		if(installed) {
console.warn("A2HS: Already got appinstalled event!");
		return;
		}
		
		EDITOR.windowMenu.remove(windowMenuAdd2HS);
		
		var yes = "OK, I will click on the JZ icon";
		var no = "No, I'll keep using this"
		confirmBox('Do you want to re-open the editor via "home screen" ?', [yes, no], function(answer) {
			if(answer == yes) {
				window.onbeforeunload = null;
				window.close();
			}
		});
		
		installed = true;
	}
	
	function beforeinstallprompt(evt) {
		//console.log("A2HS: Got beforeinstallprompt event!");
		// Prevent Chrome 67 and earlier from automatically showing the prompt
		evt.preventDefault();
		// Stash the event so it can be triggered later.
		deferredPrompt = evt;
		
		windowMenuAdd2HS = EDITOR.windowMenu.add("Add to home screen", ["Editor", 10], addToHomeScreen);
	}
	
	function ask() {
		if(deferredPrompt === undefined) {
			//console.warn("A2HS: Have not got beforeinstallprompt event from the browser!");
			return;
		}
		else if(!deferredPrompt) throw new Error("deferredPrompt=" + deferredPrompt)
		
		var yes = "Yes, make it look like a native app!";
		var no = "No, I prefer the browser";
		
		confirmBox("Do you want add WebIDE to your home screen/desktop ?\nIt will give the editor a more native feel.", [yes, no], function(answer) {
			if(answer == yes) {
				// Show the prompt
				deferredPrompt.prompt();
				// Wait for the user to respond to the prompt
				deferredPrompt.userChoice.then(function (choiceResult) {
					if (choiceResult.outcome === 'accepted') {
						console.log('A2HS: User accepted the A2HS prompt');
					}
					else {
						console.log('A2HS: User dismissed the A2HS prompt');
					}
					deferredPrompt = null;
					});
			}
		});
		
		clearInterval(askInterval);
		
	}
	
})();

