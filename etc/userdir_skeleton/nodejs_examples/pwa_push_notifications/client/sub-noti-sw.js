self.addEventListener('activate', function serviceWorkerActivate(event) {
console.log("serviceWorker got activate event!");

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