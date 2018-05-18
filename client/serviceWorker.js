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
			'/signup/signup.html',
			'/UTIL.js',
			'/global.js',
			'/sockjs-0.3.4.js',
			'/signup/signup.js',
			'/gfx/jz64.png'
			
			
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

