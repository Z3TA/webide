/*
	Add to Home Screen
	------------------
	
	https://developers.google.com/web/fundamentals/app-install-banners/
	
	
*/

(function() { 
	
	if(DISPLAY_MODE == "standalone") return console.log('Already running from "shelf" (DISPLAY_MODE=' + DISPLAY_MODE + '). Will not ask user to add to desktop/home screen"');
	
	var deferredPrompt;
	
	window.addEventListener('beforeinstallprompt', beforeinstallprompt);
	window.addEventListener('appinstalled', appinstalled);
	
	var askInterval = setInterval(ask, 10000);
	
	var installed = false;
	
	function appinstalled(evt) {
		console.log('a2hs installed!');
		
		if(installed) return console.warn("Already got appinstalled event!");
		
		var yes = "OK, I will click on the JZ icon";
		var no = "No, I'll keep using this"
		confrimBox('Do you want to re-open the editor via "home screen" ?', [yes, no], function(answer) {
			if(answer == yes) {
				window.onbeforeunload = null;
				window.close();
			}
		});
		
		installed = true;
	}
	
	function beforeinstallprompt(evt) {
		// Prevent Chrome 67 and earlier from automatically showing the prompt
		evt.preventDefault();
		// Stash the event so it can be triggered later.
		deferredPrompt = evt;
	}
	
	function ask() {
		if(deferredPrompt === undefined) return console.warn("Have not got beforeinstallprompt event from the browser!");
		else if(!deferredPrompt) throw new Error("deferredPrompt=" + deferredPrompt)
		
		var yes = "Yes, make it look like a native app!";
		var no = "No, I prefer the browser";
		
		confirmBox("Do you want add JZedit to your home screen/desktop ?\nIt will give the editor a more native feel.", [yes, no], function(answer) {
			if(answer == yes) {
				// Show the prompt
				deferredPrompt.prompt();
				// Wait for the user to respond to the prompt
				deferredPrompt.userChoice.then(function (choiceResult) {
					if (choiceResult.outcome === 'accepted') {
						console.log('User accepted the A2HS prompt');
					}
					else {
						console.log('User dismissed the A2HS prompt');
					}
					deferredPrompt = null;
					
				});
			}
		});
		
		clearInterval(askInterval);
		
	}
	
})();

