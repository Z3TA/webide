/*
	
	Debugging the service worker:
	ur: chrome://inspect/#service-workers
	
*/

console.log("Running serviceWorker.js");

self.addEventListener('install', function(event) {
	console.log("serviceWorker install event");
	event.waitUntil(
	caches.open('v1').then(function(cache) {
		console.log("serviceWorker adding files to cache");
		return cache.addAll([
			'/', // Root / is a bundle, while index.htm is a html file with script tags used for debugging
			
			// Cache font
			'/gfx/font/DejaVuSansMono/DejaVuSansMono.css',
			'/gfx/font/DejaVuSansMono/ttf/DejaVuSansMono.ttf',
			'/gfx/font/DejaVuSansMono/ttf/DejaVuSansMono-Bold.ttf'
			
			// Cache VNC
			
			// Cache other
			
		]);
	})
	);
});

/*
	Without the fetch event listener (and some console.logs in it) Chrome will give:
	"Site cannot be installed: the page does not work offline" and thus we get no "add to desktop" option.
*/
self.addEventListener('fetch', function(event) {
	console.log("serviceWorker fetch url=" + event.request.url);
	event.respondWith(caches.match(event.request).then(function(response) {
		// Cache hit - return response
		if (response) {
			return response;
		}
		else {
			console.warn("Cache miss url=" + event.request.url);
			return fetch(event.request);
		}
	}));
});

