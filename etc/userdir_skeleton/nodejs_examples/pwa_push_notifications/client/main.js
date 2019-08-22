window.onload = main;

function main() {
	
	while(document.body.firstChild) document.body.removeChild(document.body.firstChild); // Clear the body
	
	var app = createAppComponent();
	document.body.appendChild(app);  // Add our app structure to the document body
	
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
				if(err) return app.info("Unable to get push subscription: " + err.message);
				
				if(pushSubcription) {
gotPushSubscription(pushSubcription);
				}
				else {
					app.info("Did not find push subscription! Subscribing for push ...");
					subscribeToPush(swRegistration, function(err, pushSubcription) {
						if(err) return app.info("Unable to subscribe to push: " + err.message);
						
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
	}
	
}

function askForPushSubScription(swRegistration, cb) {
	/*
		
		note: The service worker also need to subscribe!
		
	*/
	
	// Generate key: https://web-push-codelab.glitch.me/
	var applicationServerPublicKey = "BLMBbMVHVumgQO1YeY1g3hzq_rZZcMzBU8UqnT-7QwLXtDKx26UNvMWWNguFoIik4zPnRiESBos60OsL4TWrUwA";
	var applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
	var pushSubscriptionOptions = {
		userVisibleOnly: true,
		applicationServerKey: applicationServerKey
	};
	
	if(swRegistration == undefined) throw new Error("First argument swRegistration=" + swRegistration)
	
	var getPushSubscription = depromisify(swRegistration.pushManager.getSubscription, swRegistration.pushManager);
	
	getPushSubscription(function(err, pushSubcription) {
		if(err) cb(err);
		else cb(null, pushSubcription);
	});
}

function subscribeToPush(swRegistration) {
	// Generate key: https://web-push-codelab.glitch.me/
	var applicationServerPublicKey = "BLMBbMVHVumgQO1YeY1g3hzq_rZZcMzBU8UqnT-7QwLXtDKx26UNvMWWNguFoIik4zPnRiESBos60OsL4TWrUwA";
	var applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
	
	var pushSubscriptionOptions = {
		userVisibleOnly: true,
		applicationServerKey: applicationServerKey
	};
	
	var subscribe = depromisify(swRegistration.pushManager.subscribe, swRegistration.pushManager);
	
	subscribe(pushSubscriptionOptions, cb);
}


function registerServiceWorker(swScript, swOptions, cb) {
	if(typeof navigator.serviceWorker == undefined) {
		return cb(new Error("Browser do not support service worker!"));
	}
	
	var reg = depromisify(navigator.serviceWorker.register, navigator.serviceWorker);
	reg(swScript, swOptions, cb);
}


function askForNotificationPermission(cb) {
	if(typeof Notification == "undefined") {
		return cb(new Error("Browser does not support notifications!"))
	}
	
	if(Notification.permission == "granted") return cb(null, "granted");
	
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
	
	/*
		Object.defineProperty(app, "info", {
		get: function() {
		return info.innerText;
		},
		set: function(str, isErrorMessage) {
		info.innerText = str;
		
		if(isErrorMessage) info.classList.add("error");
		else if(info.classList.contains("error")) info.classList.remove("error");
		
		}
		});
	*/
	
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

function depromisify(promFunc, thisObject) {
	/*
		Make it possible to call a function that returns a Promise with callback convention.
		
		Functions that make use of the "this" keyword will need the thisObject set explicityly,
		For example foo.bar the thisObject should be foo: depromisify(foo.bar, foo)
	*/
	
	if(typeof promFunc != "function") {
		throw new Error("First parameter in depromisify (" + (typeof promFunc) + ") need to be a function!")
	}
	
	return function callbackConvention() {
		var args = Array.prototype.slice.call(arguments);
		if(args.length > 0) {
			var cb = args.pop();
		}
		
		if(typeof cb != "function") {
			var fName = promFunc.name || functionName(promFunc);
			console.warn("No callback given when calling depromised " + fName + "! args=", args);
			cb = undefined;
		}
		
		if(thisObject === undefined) thisObject = window;
		
		var promiseMaybe = promFunc.apply(thisObject, args);
		
		if(promiseMaybe && typeof promiseMaybe.then == "function") {
			promiseMaybe.then(success).catch(fail);
		}
		else {
			var fName = promFunc.name || functionName(promFunc);
			var error = new Error("Expected " + fName + " to return a promise, but it returned (" + (typeof promiseMaybe) + "): ", promiseMaybe);
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
