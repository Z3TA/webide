window.onload = main;

var pwaInstallPrompt;
window.onbeforeinstallprompt = saveInstallPrompt;


function saveInstallPrompt(installPrompt) {
	pwaInstallPrompt = installPrompt;
}


function showPwaInstallPrompt() {
	if(!pwaInstallPrompt) {
		console.log("We have not yet got a pwa install prompt from the browser");
		return;
	}
	
	pwaInstallPrompt.prompt();
	// Wait for the user to respond to the prompt
	pwaInstallPrompt.userChoice.then(userDid);
	
	function userDid(choiceResult) {
		if (choiceResult.outcome === 'accepted') {
			console.log('User accepted the A2HS prompt');
		} else {
			console.log('User dismissed the A2HS prompt');
		}
		pwaInstallPrompt = null;
	}
	
}



function main() {
	
	document.body.removeChild(document.body.firstChild); // Clear the body
	
	var buttonComponent = createMagicButton();
	
	document.body.appendChild(buttonComponent); // Add our component to the body
	
	registerServiceWorker();
	
}

function createMagicButton() {
	
	var wrap = document.createElement("div");
	wrap.classList.add("wrap");
	
	var button = document.createElement("button");
	button.classList.add("magicButton");
	
	button.innerText = "Click me";
	
	var clickCounter = 0;
	button.onclick = buttonClicked;
	
	wrap.appendChild(button);
	
	return wrap;
	
	function buttonClicked() {
		clickCounter++;
		
		if(clickCounter == 1) {
			button.innerText = "Button has been clicked!";
		}
		else {
			button.innerText = "Button has been clicked " + clickCounter + " times!";
		}
		
		// Only ask the user to install if he/she has clicked 3 times
		if(clickCounter == 3) showPwaInstallPrompt();
	}
	
}

function registerServiceWorker() {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('clickme-sw.js', {scope: '.'}).then(function(reg) {
			// registration worked
			console.log('ServiceWorker Registration succeeded. Scope is ' + reg.scope);
			return reg.update();
			
		}).catch(function(error) {
			// registration failed
			console.log('ServiceWorker Registration failed with ' + error);
		});
	}
}