window.onload = main;

function main() {
	
	 // Clear the body
	while(document.body.firstChild) document.body.removeChild(document.body.firstChild);
	
	// Create the user interface and add it to the body
	var app = createAppComponent();
	document.body.appendChild(app);
	
	app.info("App started!");
	
	var swRegistration;
	var notificationsPermission;
	
	app.info("Asking for notification permission ...");
	askForNotificationPermission(function gotNotificationPermission(err, status) {
		if(err) return app.info("Cannot request notification permission: " + err.message);
		
		app.info('Got notification permission status=' + status);
		
		notificationsPermission = status;
		
		askForPushSubscriptionMaybe();
	});
	
	app.info("Registering service worker ...");
	var swScript = 'sub-noti-sw.js';
	var swOptions = {scope: '.'};
	registerServiceWorker(swScript, swOptions, function serviceWorkerRegistered(err, reg) {
		if(err) return app.info("Unable to register service worker: " + err.message, "error");
		
		swRegistration = reg;
		
		//console.log("swRegistration: ", swRegistration);
		
		app.info("Service worker registered!");
		
		if(typeof swRegistration.update == "function") swRegistration.update();
		else app.info("Service worker registration has no update method!", "warning");
		
		askForPushSubscriptionMaybe();
	});
	
	function askForPushSubscriptionMaybe() {
		if(!notificationsPermission) app.info("Waiting for notification permission ...");
		else if(!swRegistration) app.info("Waiting for service worker registration ...");
		else if(notificationsPermission != "granted") app.info('Aborted because notification permission is ' + notificationsPermission, "warning");
		else {
			app.info("Asking for push subscription ...");
			askForPushSubScription(swRegistration, function(err, pushSubcription) {
				if(err) return app.info("Unable to get push subscription: " + err.message, "error");
				
				if(pushSubcription) {
gotPushSubscription(pushSubcription);
				}
				else {
					app.info("We had no push subscription! Subscribing for push ...");
					
					
					
					// Generate key: https://web-push-codelab.glitch.me/
					var applicationServerPublicKey = "BLMBbMVHVumgQO1YeY1g3hzq_rZZcMzBU8UqnT-7QwLXtDKx26UNvMWWNguFoIik4zPnRiESBos60OsL4TWrUwA";
					var applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
					
					var pushSubscriptionOptions = {
						userVisibleOnly: true,
						applicationServerKey: applicationServerKey
					};
					
					subscribeToPush(swRegistration, pushSubscriptionOptions, function(err, pushSubcription) {
						if(err) return app.info("Unable to subscribe to push: " + err.message, "error");
						
						if(!pushSubcription) return app.info("Did not get a push subscription!", "error");
						
						gotPushSubscription(pushSubcription);
						
					});
				}
			});
		}
	}
	
	function gotPushSubscription(pushSubcription) {
		if(!pushSubcription) throw new Error("pushSubcription=", pushSubcription);
		
		console.log("pushSubcription: ", pushSubcription);
		
		console.log('Push subscription endpoint URL: ', pushSubcription.endpoint);
		
		app.info("Got push subscription: " +JSON.stringify(pushSubcription), "success");
		
		sendToServer("pushSubscription", pushSubcription, function(err, resp) {
			if(err) app.info("Cannot send subscription to server! " + err.message, "error");
			
		})
		
		
	}
}

function askForPushSubScription(swRegistration, cb) {
	if(swRegistration == undefined) throw new Error("swRegistration=" + swRegistration)
	
	var getPushSubscription = relieve(swRegistration.pushManager.getSubscription, swRegistration.pushManager);
	
	getPushSubscription(cb);
}

function subscribeToPush(swRegistration, pushSubscriptionOptions, cb) {
	var subscribe = relieve(swRegistration.pushManager.subscribe, swRegistration.pushManager);
	subscribe(pushSubscriptionOptions, cb);
}

function sendToServer(type, obj, cb) {
var options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(obj)
	}
	
	var send = relieve(fetch);
	send('/api/' + type, options, function(err, resp) {
		if(err) return cb(err);
		
		var getText = relieve(response.text, response);
		getText(function(err, text) {
			if(err) throw new Error("Unable to get text! " + err.message);
			
			if (response.status == 200) {
				cb(null, text);
			}
			else {
				cb(new Error(text));
			}
		});
	});
}

function registerServiceWorker(swScript, swOptions, cb) {
	if(typeof navigator.serviceWorker == undefined) {
		return cb(new Error("Browser do not support service worker!"));
	}
	
	var reg = relieve(navigator.serviceWorker.register, navigator.serviceWorker);
	reg(swScript, swOptions, cb);
}

function askForNotificationPermission(cb) {
	if(typeof Notification == "undefined") {
		return cb(new Error("Browser does not support notifications!"))
	}
	
	if(Notification.permission == "granted") {
		// Notifications are already granted
		return cb(null, "granted");
	}
	
	Notification.requestPermission(function(status) {
		cb(null, status);
	});
}

function createAppComponent() {
	
	var app = document.createElement("div");
	app.classList.add("appWrap");
	
	var topic = document.createElement("h1");
	topic.innerHTML = "Push & Notifications PWA example ";
	app.appendChild(topic);
	
	var info = document.createElement("div");
	info.classList.add("infoWrap");
	app.appendChild(info);
	
	/*
		var subButton = document.createElement("button");
		subButton.innerText = "Subscribe to notifications";
		subButton.onclick = subscribeToNotifications;
		app.appendChild(subButton);
	*/
	
	// Give an interface for the outside world (outside this function) to add info
	app.info = function(str, msgType) {
		var msg = document.createElement("div");
		msg.classList.add("info");
		msg.innerText = str;
		
		if(msgType) msg.classList.add(msgType);
		
		info.appendChild(msg);
	}
	
	return app;
}

function urlB64ToUint8Array(base64String) {
	const padding = '='.repeat((4 - base64String.length % 4) % 4);
	const base64 = (base64String + padding)
	.replace(/\-/g, '+')
	.replace(/_/g, '/');
	
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

function relieve(promFunc, thisObject) {
	/*
		Make it possible to call a function that returns a Promise with callback convention.
		eg. relieve the function from the promise :P
		
		Functions that make use of the "this" keyword will need the thisObject set explicitly.
		For foo.bar.baz the thisObject should probably be foo.bar Example: relieve(foo.bar.baz, foo.bar)
	*/
	
	if(typeof promFunc != "function") {
		throw new Error("First parameter in relieve (" + (typeof promFunc) + ") need to be a function!")
	}
	
	return function callbackConvention() {
		var args = Array.prototype.slice.call(arguments);
		if(args.length > 0) {
			var cb = args.pop();
		}
		
		if(typeof cb != "function") {
			var fName = promFunc.name || functionName(promFunc);
			console.warn("No callback given when calling relieved " + fName + "! args=", args);
			cb = undefined;
		}
		
		if(thisObject === undefined) thisObject = window;
		
		var promiseMaybe = promFunc.apply(thisObject, args);
		
		if(promiseMaybe && typeof promiseMaybe.then == "function") {
			promiseMaybe.then(success).catch(fail);
		}
		else {
			var fName = promFunc.name || functionName(promFunc);
			var error = new Error("Expected " + fName + " to return a Promise, but it returned (" + (typeof promiseMaybe) + "): ", promiseMaybe);
			if(cb) cb(error);
			else throw error;
		}
		
		function success() {
			var resp = Array.prototype.slice.call(arguments);
			resp.unshift(null);
			if(cb) cb.apply(null, resp);
		}
		
		function fail(err) {
			if(cb) cb(err);
		}
	}
	
	function functionName(fun) {
		var ret = fun.toString();
		ret = ret.substr('function '.length);
		ret = ret.substr(0, ret.indexOf('('));
		return ret;
	}
}
