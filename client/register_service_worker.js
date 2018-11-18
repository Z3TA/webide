
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/serviceWorker.js', {scope: '/'}).then(function(reg) {
// registration worked
console.log('ServiceWorker Registration succeeded. Scope is ' + reg.scope);
		return reg.update();
		
}).catch(function(error) {
// registration failed
		console.log('ServiceWorker Registration failed with ' + error);
});
}
