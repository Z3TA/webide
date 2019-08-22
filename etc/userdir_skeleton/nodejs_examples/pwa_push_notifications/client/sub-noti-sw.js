self.addEventListener('push', function(event) {
	console.log('serviceWorker Push Received.');
	console.log(`serviceWorker Push had this data: "${event.data.text()}"`);
	
	const title = 'Push Codelab';
	const options = {
		body: 'Yay it works.',
		icon: 'images/icon.png',
		badge: 'images/badge.png'
	};
	
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
	
event.waitUntil(caches.open('v1').then(function(cache) {
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

event.respondWith(caches.match(event.request).then(function(response) {
if (response && !navigator.onLine) {
console.log("serviceWorker Serving from cache: " + event.request.url);
return response;
}
else {
console.log("serviceWorker Serving from server: " + event.request.url);

return fetch(event.request).then(function(response) {
return response;
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