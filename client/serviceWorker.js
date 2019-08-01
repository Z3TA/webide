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
	
	
	Problem1: We might not get the editor version from the editor-client, and the user will be stuck with a bad editor-client forever.
	Sulution1: Update the cache version in every release, so when the user get his service worker replaced, it will also replace the editor-client
	
	Problem2: The editor-client might report an old version, and the user will be stuck with that version
	Solution2: Solution1
	
	Problem3: We can not wait for a new service worker to register, which can take forever
	Solution3: The editor-client passes the editor version from the server, and if it's newer then the current version, the cache is updated.
	
	Problem4: We always want to get the latest version of each file while in development
	Solution4: Have a DEV_MODE variable and override cache if it's set to true
	
	Problem 5: The service worker will update the cache using the *old* version of the service worker (old version of this script)
	So if there's something wrong with the service worker, the cache will not be updated until next editor release!
	
	Problem 6: Service worker thinks it has a new version ... It updated itself, but not the cache!
	Solution 6: Have it fetch version.txt and refresh the cache if it's lower
	
	Question: Will the service worker fetch version.txt from it's cache or from the server !?
	Answer: The server worker's fetch will always download from the server, not from the service-worker-cache!
	
	Problem 7: Service worker fetch directly from the server, and there seem to be no way to retrive a file from the cache from within the service-worker
	Solution 7: fetch version.txt outside the service worker in order to get it from the service-worker cache. Then send a FORCE cache reload request to the service worker!
	
	self.registration.unregister() !?
	
*/

"use strict";

//throw new Error("serviceWorker test error");
// A throw error in the service worker will get caught in the Promise to register the service worker. See register_service_worker.js

var DEV_MODE = false; // Default is false
var VERSION = 0; // The id of the cache version. Updated by the release script. And also by the editor-client. 

if(VERSION === 0) {
	// VERSION variable not populated means we are in development mode!
	DEV_MODE = true;
}

console.log("serviceWorker with cache VERSION=" + VERSION + " and DEV_MODE=" + DEV_MODE + " started ...");


var CACHE_FILES = [
	'/', // Root / is a bundle, while index.htm is a html file with script tags used for debugging
	// Assume the bundle is loaded, and don't cache each induvidual .js files!
	
	'/gfx/style.css',
	
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
	'/gfx/jz64.png',
	
	
	// Cache VNC
	
	// Cache other
	"version.txt"
	
]

self.addEventListener('message', function(msg) {
	console.log("serviceWorker (VERSION=" + VERSION + " DEV_MODE=" + DEV_MODE + ") Received Message: ", msg.data);
	var matchVersion = msg.data.match(/editorVersion=(\d+)/);
	var matchForce = msg.data.match(/forceRefresh=(\d+)/);
	if(msg.data == "devModeOff") {
		DEV_MODE = false;
	}
	else if(msg.data == "devModeOn") {
		DEV_MODE = true;
	}
	else if(matchVersion) {
		var editorVersion = parseInt(matchVersion[1]);
		updateCache(editorVersion);
	}
	else if(matchForce) {
		var editorVersion = parseInt(matchForce[1]);
		updateCache(editorVersion, true);
	}
});


function updateCache(latestVersionMaybe, forceRefresh) {
	console.log("serviceWorker updateCache: latestVersionMaybe=" + latestVersionMaybe);
	
	var latestVersion = latestVersionMaybe;
	var cacheVersion = "jzedit_v" + latestVersionMaybe;
	
	if(forceRefresh) return refreshCache(cacheVersion);
	
	return caches.keys().then(function(keys) {
		
		var versions = keys.map(versionNrFromKey);
		var highestVersion = Math.max.apply(null, versions);
		console.log("serviceWorker cache versions: " + JSON.stringify(versions) + " highestVersion=" + highestVersion + " latestVersionMaybe=" + latestVersionMaybe);
		
		if(keys.length > 1) {
			console.warn("serviceWorker has more then one cached version!");
			// Delete all caches besides the highest version
			var highestCacheVersion = "jzedit_v" + highestVersion;
			return caches.keys().then(function(keys) {
				return Promise.all(keys.map(function(key) {
					if(key != highestCacheVersion) {
						console.log("serviceWorker deleting old cache: " + key);
						return caches.delete(key);
					}
				}));
			}).then(function() {
				return highestVersion;
			});
		}
		else return highestVersion;
		
	}).then(function(highestVersion) {
		
		if(typeof highestVersion != "number") throw new Error("highestVersion=" + highestVersion + " is not a number!");
		
		if(highestVersion >= latestVersionMaybe) {
			console.log("serviceWorker has highestVersion=" + highestVersion + " in cache. No need to update!");
			VERSION = highestVersion;
			// We can not double check by fetching version.txt from here, because service worker always fetch from the server, not the cache.
			return false;
		}
		else {
		VERSION = latestVersionMaybe;
		
		console.log("serviceWorker Filling cacheVersion=" + cacheVersion + " because it's newer then highestVersion=" + highestVersion + "");
			return refreshCache(cacheVersion);
		}
	});
	
	function refreshCache(cacheVersion) {
		// Delete all caches before filling the new cache to prevent the new cache being filled from the old cache
		return caches.keys().then(function(keys) {
			return Promise.all(keys.map(function(key) {
				console.log("serviceWorker deleting cache key=" + key);
				return caches.delete(key);
			}));
		}).then(function() {
			console.log("serviceWorker finished deleting *all* caches!");
			return caches.open(cacheVersion).then(function(cache) {
				console.log("serviceWorker adding files to cacheVersion=" + cacheVersion + "");
				return Promise.all( CACHE_FILES.map(function(url){
					
					// Maybe it's adding ?v=### that makes the offline fetch fail !?
					//console.log("serviceWorker adding to cache (version " + latestVersionMaybe + ") url=" + url+"?v=" + latestVersionMaybe);
					//return cache.add(url+"?v=" + latestVersionMaybe);
					// Yes, appending the ?v=### is what was causing the cache bailout
					
					console.log("serviceWorker adding to cache (version " + latestVersionMaybe + ") url=" + url);
					return cache.add(url);
					
				}) );
			}).then(function() {
				console.log("serviceWorker successfully filled the cache for " + cacheVersion + "");
				
				// It would be optimal if we could tell the client to refresh,
				// insteading of having it wait before refreshing - hoping the serviceWorker has updated the cache
				return notifyClientUpdate(highestVersion, latestVersionMaybe);
				
			}).catch(function(err) {
				console.warn("serviceWorker failed to fetch one or more files. Totally useless error message: " + err.message);
			});
		});
	}
}



function deleteAllCachesExcept(currentCacheVersion) {
	// Delete old caches
	console.log("serviceWorker deleteAllCachesExcept: currentCacheVersion=" + currentCacheVersion);
	return caches.keys().then(function(keys) {
		return Promise.all(keys.map(function(key) {
			if(key != currentCacheVersion) {
				console.log("serviceWorker deleteAllCachesExcept: Deleting old cache: " + key);
					return caches.delete(key);
				}
			else {
				console.log("serviceWorker deleteAllCachesExcept: Keeping key=" + key + " because currentCacheVersion=" + currentCacheVersion);
			}
		}));
	});
}



setTimeout(function() {
	sendToClients("Hello from service worker!");
}, 5000);

function notifyClientUpdate(fromVersion, toVersion) {
	console.log("serviceWorker sending cache update notification to clients ...");
	var msg = "serviceWorker cache version has been updated from version=" + fromVersion + " to " + toVersion + "";
	sendToClients(msg);
	return true;
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
	
	return true;
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
	
	caches are global! So updating the cache will also affect the currently running service worker!
	Only problem is that the files will be fetched by the currently running service worker,
	meaning the files will probably be fetches from an *old* cache.
	So there is no point in filling the cache on the install event. We have to wait for the activate event!
*/
self.addEventListener('install', function serviceWorkerInstall(event) {
	console.log("serviceWorker with current cache VERSION=" + VERSION + " got install event!");
	
});



/*
	The activate event is called when the new service worker (this script) is in control.
	eg. the old service worker (old version of this script) has stopped.
*/
self.addEventListener('activate', function serviceWorkerActivate(event) {
	console.log("serviceWorker with current cache VERSION=" + VERSION + " got activate event!");
	
	event.waitUntil(updateCache(VERSION));
	
});


/*
	Without the fetch event listener (and some console.logs in it) Chrome will give:
	"Site cannot be installed: the page does not work offline" and thus we get no "add to desktop" option.
	
	The following rules do Not apply the first time the page is loaded! 
	Only when it's loaded After the service worked has been activated!
	
	caches.match() is a convenience method which checks all caches
*/
self.addEventListener('fetch', function serviceWorkerFetch(event) {
	console.log("serviceWorker fetch url=" + event.request.url + " * v=" + VERSION + " dev=" + DEV_MODE);
	
	
	if(DEV_MODE) { // Skip cache
		event.respondWith(fetch(event.request).catch(fetchError));
	}
	else {
		// Check cache first
		// event.respondWith returns undefined!
		event.respondWith(caches.match(event.request).then(function(response) {
			if (response) {
				console.log("serviceWorker Serving from cache: " + event.request.url);
				return response;
			}
			else {
				console.warn("serviceWorker Cache miss: " + event.request.url);
				return fetch(event.request).catch(fetchError);
			}
		}, function(err) {
			console.log("serviceWorker fetch caches.match error: " + err.message);
			return fetch(event.request).catch(fetchError);
		}));
	}
	
	function fetchError(err) {
		console.log("serviceWorker fetchError:" + err.message);
		
		var body = "<!DOCTYPE HTML>" +
		"<h1>Service Worker Error</h1>" +
		"<p>The service worker was unable to fetch the page. " + 
		'<a href="JavaScript: location.reload();">Refresh</a> to try again.</p>' +
		"<p>Send the following error message to your server administrator:</p>" + 
		"<p>" +
		"date: " + (new Date()) + "<br>" +
		"url: " + event.request.url + "<br>" +
		"editor cache/client version: " + VERSION + "<br>" +
		"editor developer mode: " + DEV_MODE + "<br>" +
		"fetch error message: " + err.message + "<br>" +
		"navigator.onLine: " + (typeof navigator == "object" && navigator.onLine) + "<br>" + 
		"navigator.userAgent: " + (typeof navigator == "object" && navigator.userAgent) + "<br>" +
		"</p>";
		
		var response = new Response(body, {
			status: 503,
			statusText: "Service worker error",
			headers: {'Content-Type': 'text/html'}
		});
		
		return response;
	}
});


function versionNrFromKey(key) {
	var prefix = "jzedit_v";
	var nr = key.replace(prefix, "");
	if(key == nr) throw new Error("Not a cache key=" + key);
	return parseInt(nr);
}
