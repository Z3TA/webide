(function() {
	
	EDITOR.on("start", registerServiceWorkerLater);
	
	function registerServiceWorkerLater() {
		/*
			problem: The service worker downloads the bundle and other files the client *already* downloaded!
			it does not seem to fetch files from the browser cache (it only fetch some files from the browser cache)
			soulition: Wait at least 5 minutes before activating the service worker

			reasoning: The service worker is only good for repeating visitors,
			most will however only try the editor for 10 seconds and then leave,
			so downloading the files and extra time is extra unnecessary

		*/

		setTimeout(registerServiceWorker, 1000 * 60 * 5);
	}

	function registerServiceWorker() {
		
		//console.log("Hello from register_service_worker.js");
		
if ('serviceWorker' in navigator) {
			var url = '/serviceWorker.js';
			if(window.location.search) url = url + window.location.search;
			navigator.serviceWorker.register(url, {scope: '/'}).then(function(reg) {
				// registration worked
				//console.log('ServiceWorker Registration succeeded. Scope is ' + reg.scope);
				return reg.update();
		
			}).catch(function(error) {
// registration failed
		console.log('ServiceWorker Registration failed with ' + error);
});

			var windowMenuUnregisterServiceWorker = EDITOR.windowMenu.add(S("unregister_service_worker"), [S("Editor"), 90], unregisterServiceWorker);
		}
		else console.warn("Service worker not supported by " + (typeof BROWSER != "undefined" ? BROWSER : "browser"))
		
	}
	
	function unregisterServiceWorker() {
		navigator.serviceWorker.getRegistrations().then(function(registrations) {
			
			for(var registration in registrations) {
				registrations[registration].unregister()
			}
			
		}).catch(function(err) {
			alertBox("Failed to get registerd service workers: " + err.message)
		}).then(function() {
			EDITOR.windowMenu.hide();
			EDITOR.reload();
		});
	}
	
})();