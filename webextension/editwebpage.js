
console.log("editwebpage.js loaded");

console.log("browser.extension.sendMessage : ? " + (browser.extension.sendMessage  ? "yep" : "nope"));
console.log("chrome.extension.sendMessage : ? " + (chrome.extension.sendMessage  ? "yep" : "nope"));

console.log("browser.extension.sendRequest : ? " + (browser.extension.sendRequest  ? "yep" : "nope"));
console.log("chrome.extension.sendRequest : ? " + (chrome.extension.sendRequest  ? "yep" : "nope"));

document.body.style.border = "5px solid orange";
console.log("document.body.style.border success!");
/*
	
	var requestData = {"action": "createContextMenuItem"};
	//send request to background script
	chrome.extension.sendMessage (requestData);
	console.log("chrome.extension.sendMessage  success!");
	
	//subscribe on request from content.js:
	chrome.extension.onMessage.addListener(onMessage);
	console.log("chrome.extension.onMessage.addListener success!");
	
	document.body.style.border = "5px solid orange";
	console.log("document.body.style.border success!");
	
	
	function onMessage(request, sender, callback) {
	if(request.action == 'createContextMenuItem') {
	var contextItemProperties = {};
	contextItemProperties.title = 'context menu item';
	chrome.contextMenus.create(contextItemProperties);
	}
	}
	
*/