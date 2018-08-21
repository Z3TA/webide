/*
	
	Debugging the service worker:
	ur: chrome://inspect/#service-workers
	
	The browser will automatically activate a *new* service worker if something in this file changes!
	But it will only check for changes if more then 24 hours has passed !?
*/



var devMode = false;
var version = "dev"; // Will automatically update in new releases using ./release.sh

console.log("Running serviceWorker.js version=" + version + " devMode=" + devMode);

self.addEventListener('message', function(msg) {
	console.log("serviceWorker Received Message: ", msg.data);
	if(msg.data == "devModeOff") {
		devMode = false;
	}
	else if(msg.data == "devModeOn") {
		devMode = true;
	}
	console.log("serviceWorker devMode=" + devMode);
});

self.addEventListener('install', function(event) {
	console.log("serviceWorker install event");
	event.waitUntil(caches.open(version).then(function(cache) {
		console.log("serviceWorker adding files to cache");
		return cache.addAll([
			'/', // Root / is a bundle, while index.htm is a html file with script tags used for debugging
			// Asume the bundle is loaded, and don't cache each induvidual .js file!
			
			// Cache font
			'/gfx/font/DejaVuSansMono/DejaVuSansMono.css',
			'/gfx/font/DejaVuSansMono/ttf/DejaVuSansMono.ttf',
			'/gfx/font/DejaVuSansMono/ttf/DejaVuSansMono-Bold.ttf',
			
			// Dialog icons
			'/gfx/error.svg',
			'/gfx/warning.svg',
			
			// File icons
			'/gfx/icon/asp.svg',
			'/gfx/icon/css.svg',
			'/gfx/icon/doc.svg',
			'/gfx/icon/folder.svg',
			'/gfx/icon/html.svg',
			'/gfx/icon/js.svg',
			
			// Logo for A2HS
			'/gfx/jz192.png',
			
			'/manifest.webmanifest', // Loaded at every page load, needed for A2HS
			
			// About documentation etc
			'/about/about.htm',
			'/gfx/doc.css',
			'/gfx/clouds.js',
			'/gfx/clouds/0.png',
			'/gfx/clouds/1.png',
			'/gfx/clouds/2.png',
			'/gfx/clouds/3.png',
			'/gfx/clouds/4.png',
			'/gfx/clouds/5.png',
			'/gfx/clouds/6.png',
			
			// Signup
			'/signup/signup.htm',
			'/UTIL.js',
			'/global.js',
			'/sockjs-0.3.4.js',
			'/signup/signup.js',
			'/gfx/jz64.png'
			
			
			// Cache VNC
			
			// Cache other
			
		]);
	}));
});


self.addEventListener('activate', function(event) {
	console.log("serviceWorker activate event");
	// Called when the browser has created a *new* service worker
	// Delete old caches
	return event.waitUntil(caches.keys().then(function(keys) {
return Promise.all(keys.map(function(key) {
			console.log("serviceWorker cache key=" + key);
			if(key != version) {
				console.log("serviceWorker deleting old cache: " + key);
				return caches.delete(key);
			}
		})).then(function() {
			console.log("serviceWorker " + version + " now ready to handle fetches!");
		});
	}));
});


/*
	Without the fetch event listener (and some console.logs in it) Chrome will give:
	"Site cannot be installed: the page does not work offline" and thus we get no "add to desktop" option.
	
	The following rules do Not apply the first time the page is loaded! 
	Only when it's loaded After the service worked has been activated!
*/
self.addEventListener('fetch', function(event) {
	console.log("serviceWorker fetch url=" + event.request.url + " * devMode=" + devMode + " version=" + version);
	if(devMode) { // Skip cache
		event.respondWith(fetch(event.request));
	}
	else {
		// Check cache first
		event.respondWith(caches.match(event.request).then(function(response) {
			if (response) {
				return response;
			}
			else {
				console.warn("Cache miss url=" + event.request.url);
				return fetch(event.request);
			}
		}));
	}
});
