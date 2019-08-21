window.onload = main;

/*
	Everything with service workers is Promise based, 
	so we'll use async/await for abstraction 
	(even though we prefer using the callback convention)
*/ 

async function main() {
	
	while(document.body.firstChild) document.body.removeChild(document.body.firstChild); // Clear the body
	
	if(typeof navigator.serviceWorker == undefined) {
		const noServiceWorkerMsg = document.createElement("p");
		p.innerText = "Your browser do not support service worker!";
		return;
	}

const appComponent = createAppComponent();
	
	document.body.appendChild(appComponent);  // Add our app structure to the document body
	
	// Create service worker
const swOptions = {scope: '.'};
const swScript = 'clickme-sw.js';
	const swRegistration = await navigator.serviceWorker.register(swScript, swOptions);
	await swRegistration.update();
	
	// Subscribte to push messages
	const pushSubscription = await swRegistration.pushManager.getSubscription();
	
}



function createAppComponent() {

	var wrap = document.createElement("wrap");
	
	var topic = document.createElement("h1");
	topic.innerHTML = "Push & Notifications PWA example ";
	wrap.appendChild(topic);
	
	var info = document.createElement("p");
	info.innerText = "Push needs a service worker, while notifications is it's own thing.";
	wrap.appendChild(info);
	
	var subButton = document.createElement("button");
	subButton.innerText = "Subscribe to notifications";
	subButton.onclick = subscribeToNotifications;
	wrap.appendChild(subButton);
	
	return wrap;
}




function depromisify(promFunc) {
	// Make it possible to call a function that returns a Promise with callback convention
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
		
		promFunc.apply(null, args).then(success).catch(fail);
		
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