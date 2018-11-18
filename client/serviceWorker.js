/*
	
	Debugging the service worker:
	url: chrome://inspect/#service-workers
	
	The browser will automatically activate a *new* service worker if something in this file changes!
	But it will only check for changes if more then 24 hours has passed !?
	
	When a new service worker is found, it will however not replace the current one right away,
	it will wait until the current one is stopped, which can take a while (until browser restart?).
	
	The service worker can only cummunicate via the outside world by recieving messages.
	It can Not access window or document, so it can not access localStorage or get cookies!
	
	The service worker turned out to be a lot of hassle, 
	but it allows starting the editor while Offline,
	and also speeds up the loading time as the editor is fetched from cache.
	
*/

//throw new Error("serviceWorker test error");
// A throw error in the service worker will get caught in the Promise to register the service worker. See register_service_worker.js

var devMode = false;
var version = 0;

console.log("serviceWorker started ...");


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
	console.log("serviceWorker (version=" + version + " devMode=" + devMode + ") Received Message: ", msg.data);
	var matchVersion = msg.data.match(/editorVersion=(\d+)/);
	if(msg.data == "devModeOff") {
		devMode = false;
	}
	else if(msg.data == "devModeOn") {
		devMode = true;
	}
	else if(matchVersion) {
		var editorVersion = parseInt(matchVersion[1]);
		
		// See if we have this version cached ...
		var cacheVersion = "jzedit_v" + editorVersion;
		var cacheVersionExist = false;
		
		caches.keys().then(function(keys) {
			return Promise.all(keys.map(function(key) {
				console.log("serviceWorker found cache key=" + key);
				if(key == cacheVersion) {
					cacheVersionExist = true;
					return true;
				}
				else {
					return false;
				}
			}));
		}).then(function(keyBools) {
			// var cacheVersionExist = keyBools.reduce( (acc, current) => acc+current );
			
			if(cacheVersionExist) return true; // No need to update cache
			
			console.log("serviceWorker Filling cacheVersion=" + cacheVersion + " (current cache version=" + version + ")");
			
			caches.open(cacheVersion).then(function(cache) {
				console.log("serviceWorker adding files to cacheVersion=" + cacheVersion + "");
				return Promise.all( ressourcesToSaveInCache.map(function(url){cache.add(url)}) );
			}).then(function() {
				
				// It would be optimal if we could tell the client to refresh, 
// insteading of having it wait before refreshing - hoping the serviceWorker has updated the cache
				notifyClientUpdate(version, editorVersion);
				
				version = editorVersion;
				console.log("serviceWorker successfully filled cache cacheVersionn=" + cacheVersion + "");
				
				// Delete old caches
				return caches.keys().then(function(keys) {
					return Promise.all(keys.map(function(key) {
						if(key != cacheVersion) {
							console.log("serviceWorker deleting old cache: " + key);
							return caches.delete(key);
						}
					})).then(function() {
						console.log("serviceWorker finished deleting old caches!");
						return true;
					});
				});
				
			}).catch(function(err) {
				console.log("serviceWorker having problems filling cacheVersion=" + cacheVersion + " (from version=" + version + ") See error below:");
				console.error(err);
			});
			
			
		});
	}
});

setTimeout(function() {
	sendToClients("Hello from service worker!");
}, 5000);

function notifyClientUpdate(fromVersion, toVersion) {
	console.log("serviceWorker sending cache update notification to clients ...");
	var msg = "serviceWorker cache version has been updated from version=" + fromVersion + " to " + toVersion + "";
	sendToClients(msg);
}

function sendToClients(msg) {
	// Why isn't this working !?!?
	
	console.log("serviceWorker sending message to clients: " + msg);
	
	try {
	var channel = new BroadcastChannel('sw-messages');
	channel.postMessage(msg);
	}
	catch(err) {
		console.log("Unable to send to clients: " + err.message);
	}
	
	/*
		.then(function() {
		console.log("serviceWorker successfully sent message to clients: " + msg);
		}).catch(function(err) {
		console.log("serviceWorker failed to send message to clients: " + msg);
		console.error(err);
		});
	*/
	
	/*
		self.clients.matchAll().then(clients => {
		clients.forEach(function(client) {
		return client.postMessage(msg);
		});
		});
	*/
}

/*
	The install event is called when the browser has installed a *new* service worker (this script)
	It will however not be active until the old service worker (a prior version of this script) has stopped,
	which can take some time (hours,years? :P).
*/
self.addEventListener('install', function serviceWorkerInstall(event) {
	console.log("serviceWorker install event!");
	
	caches.keys().then(function(keys) {
		return Promise.all(keys.map(function(key) {
			console.log("serviceWorker install event found cache key=" + key);
}));
	});

});



/*
	The activate event is called when the new service worker (this script) is in control.
	eg. the old service worker (old version of this script) has stopped.
*/
self.addEventListener('activate', function serviceWorkerActivate(event) {
	console.log("serviceWorker activate event!");
	
	caches.keys().then(function(keys) {
		return Promise.all(keys.map(function(key) {
			console.log("serviceWorker activate event found cache key=" + key);
		}));
	});
});


/*
	Without the fetch event listener (and some console.logs in it) Chrome will give:
	"Site cannot be installed: the page does not work offline" and thus we get no "add to desktop" option.
	
	The following rules do Not apply the first time the page is loaded! 
	Only when it's loaded After the service worked has been activated!
	
	caches.match() is a convenience method which checks all caches
*/
self.addEventListener('fetch', function serviceWorkerFetch(event) {
	console.log("serviceWorker fetch url=" + event.request.url + " * devMode=" + devMode + " cache version=" + version);
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
