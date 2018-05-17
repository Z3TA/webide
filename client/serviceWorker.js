self.addEventListener('install', function(event) {
	event.waitUntil(
	caches.open('v1').then(function(cache) {
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
