
var NAME_OF_CACHE = "cacheName-v1";

self.addEventListener('push', function(event) {
	console.log("serviceWorker Push Received.");
	
	var text = event.data.text();
	
	console.log("serviceWorker Push had this text: " + text);
	
	var title = "Notification title";
	var options = {
		body: "This is the notification body. Text recived: " + text,
		icon: "icon_192.png", // Icon might be displayed next to the body
		badge: "icon_192.png.png" // Badge might show up as a tiny icon (on Android it shows up in the notifications bar)
	};
	// There are a lot of options, see more: https://developers.google.com/web/fundamentals/push-notifications/display-a-notification
	
	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
	console.log('serviceWorker Notification click Received.');
	
	event.notification.close();
	
	//event.waitUntil(clients.openWindow('https://developers.google.com/web/'));
});


self.addEventListener('activate', function serviceWorkerActivate(event) {
console.log("serviceWorker got activate event!");

	/*
		// Generate key: https://web-push-codelab.glitch.me/
		var applicationServerPublicKey = "BLMBbMVHVumgQO1YeY1g3hzq_rZZcMzBU8UqnT-7QwLXtDKx26UNvMWWNguFoIik4zPnRiESBos60OsL4TWrUwA";
		var applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
		
		var pushSubscriptionOptions = {
		userVisibleOnly: true,
		applicationServerKey: applicationServerKey
		};
		
		self.registration.pushManager.subscribe(pushSubscriptionOptions).then(function(subscription) {
		console.log("serviceWorker pushManager.subscribe: " + JSON.stringify(subscription));
		}).catch(function(err) {
		console.log('serviceWorker self.registration.pushManager.subscribe error: ', err)
		});
	*/
	
	event.waitUntil(caches.open(NAME_OF_CACHE).then(function(cache) {
return cache.addAll([
'./',
'./style.css',
'./main.js',
			'./manifest.webmanifest',
'./icon_192.png'
]);
}));

});




self.addEventListener('fetch', function serviceWorkerFetch(event) {
console.log("serviceWorker fetch url=" + event.request.url + "");

// Use cache only when offline to make sure user see new updates
	/*
		
		event.respondWith(f) wants a promise that returns a response! It then returns void
		
	*/
	
	
event.respondWith(caches.match(event.request).then(function(response) {
if (response && !navigator.onLine) {
console.log("serviceWorker Serving from cache: " + event.request.url);
return response;
}
else {
console.log("serviceWorker Serving from server: " + event.request.url);

return fetch(event.request).then(function(response) {

				// Update the cache
				caches.open(NAME_OF_CACHE).then(function(cache) {
					cache.put(event.request, response);
				});
				return response.clone();
				// return response;
});

}
}, function(err) {
console.log("serviceWorker fetch caches.match error: " + err.message);
return fetch(event.request);
}));

});


function urlB64ToUint8Array(base64String) {
	const padding = '='.repeat((4 - base64String.length % 4) % 4);
	const base64 = (base64String + padding)
	.replace(/\-/g, '+')
	.replace(/_/g, '/');
	
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}