/*
	
	Debugging the service worker:
	ur: chrome://inspect/#service-workers
	
	The browser will automatically activate a *new* service worker if something in this file changes!
	But it will only check for changes if more then 24 hours has passed !?
*/



var devMode = false;
var version = 0; // Will automatically update in new releases using ./release.sh

console.log("Running serviceWorker.js version=" + version + " devMode=" + devMode);

if(version === 0) devMode = true;

var ressourcesToSaveInCache = [
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
	
	// Logos for A2HS and other stuff
	'/gfx/jz64.png',
	'/gfx/jz192.png',
	'/gfx/jz512.png',
	
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
	
]


self.addEventListener('message', function(msg) {
	console.log("serviceWorker Received Message: ", msg.data);
	var matchVersion = msg.data.match(/editorVersion=(\d+)/);
	if(msg.data == "devModeOff") {
		devMode = false;
	}
	else if(msg.data == "devModeOn") {
		devMode = true;
	}
	else if(matchVersion) {
		var editorVersion = parseInt(matchVersion[1]);
		if(editorVersion != version) console.warn("serviceWorker version=" + version + " editorVersion=" + editorVersion);
	}
	
	console.log("serviceWorker devMode=" + devMode + " version=" + version);
});

self.addEventListener('install', function(event) {
	console.log("serviceWorker install event (version=" + version + ")");
	var currentCacheVersion = "jzedit_v" + version;
	event.waitUntil(caches.open(currentCacheVersion).then(function(cache) {
		console.log("serviceWorker adding files to cache " + currentCacheVersion + "");
		//return cache.addAll(ressourcesToSaveInCache);
		return Promise.all( ressourcesToSaveInCache.map(function(url){cache.add(url)}) );
	}));
});


self.addEventListener('activate', function(event) {
	console.log("serviceWorker activate event (version=" + version + ")");
	// Called when the browser has created a *new* service worker
	// Delete old caches
	var currentCacheVersion = "jzedit_v" + version;
	return event.waitUntil(caches.keys().then(function(keys) {
return Promise.all(keys.map(function(key) {
			console.log("serviceWorker cache key=" + key);
			if(key != currentCacheVersion) {
				console.log("serviceWorker deleting old cache: " + key);
				return caches.delete(key);
			}
		})).then(function() {
			console.log("serviceWorker version=" + version + " now ready to handle fetches!");
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
