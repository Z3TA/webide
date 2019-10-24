(function() {
	
	EDITOR.on("start", registerServiceWorker);
	
	function registerServiceWorker() {
		
		console.log("Hello from register_service_worker.js");
		
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/serviceWorker.js', {scope: '/'}).then(function(reg) {
// registration worked
console.log('ServiceWorker Registration succeeded. Scope is ' + reg.scope);
		return reg.update();
		
}).catch(function(error) {
// registration failed
		console.log('ServiceWorker Registration failed with ' + error);
});

			var windowMenuUnregisterServiceWorker = EDITOR.windowMenu.add(S("unregister_service_worker"), [S("Editor"), 90], unregisterServiceWorker);
		}
		console.warn("Service worker not supported by " + (typeof BROWSER != "undefined" ? BROWSER : "browser"))
		
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