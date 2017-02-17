
console.log("background.js loaded");

console.log("chrome: ? " + (chrome ? "yep" : "nope"));
console.log("browser: ? " + (browser ? "yep" : "nope"));

console.log("browser.contextMenus: ? " + (browser.contextMenus ? "yep" : "nope"));
console.log("chrome.contextMenus: ? " + (chrome.contextMenus ? "yep" : "nope"));

createMenuItem();


function createMenuItem() {
	browser.contextMenus.onClicked.addListener(clickContextMenu);
	console.log("contextMenus.onClicked.addListener success!");
	
	function onCreated(n) {
		if (browser.runtime.lastError) {
			console.log("Error: " + browser.runtime.lastError);
		} else {
			console.log("contextMenus item created successfully");
		}
	}
	
	function clickContextMenu(info, tab) {
		console.log("info.menuItemId=" + info.menuItemId);
		
		console.log("info=" + JSON.stringify(info, null, 2));
		console.log("tab=" + JSON.stringify(tab, null, 2));
		
	}
	
	browser.contextMenus.create({
		id: "jzedit",
		title: "JZedit",
		contexts: ["all"]
	}, onCreated);
	console.log("browser.contextMenus.create success!");
}


