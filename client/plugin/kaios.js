(function() {
/*

Support for KaiOS

Simulator:
https://developer.kaiostech.com/simulator

*/

	EDITOR.plugin({
		desc: "Support for KaiOS",
		load: loadKaiOsSupport,
		unload: unloadKaiOsSupport
	});
	
	function loadKaiOsSupport() {
		EDITOR.bindKey({desc: "Focus next element", key: "SoftRight", fun: focusNextElement});
	}
	
	function unloadKaiOsSupport() {
		
	}
	
	function focusNextElement() {
		alertBox("KaiOS");
		//add all elements we want to include in our selection
var focussableElements = 'a:not([disabled]), button:not([disabled]), input[type=text]:not([disabled]), [tabindex]:not([disabled]):not([tabindex="-1"])';
if (document.activeElement && document.activeElement.form) {
var focussable = Array.prototype.filter.call(document.activeElement.form.querySelectorAll(focussableElements), function (element) {
//check for visibility while always include the current activeElement
return element.offsetWidth > 0 || element.offsetHeight > 0 || element === document.activeElement
});
var index = focussable.indexOf(document.activeElement);
if(index > -1) {
var nextElement = focussable[index + 1] || focussable[0];
nextElement.focus();
}
}
		
		return PREVENT_DEFAULT;
}

	/*
		
		
	var allowedTags = {input: true, textarea: true, button: true};
	
	var walker = document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT, {acceptNode: acceptNode}, false);
	
	walker.currentNode = currentElement;
	if (!walker.nextNode()) {
		// Restart search from the start of the document
		walker.currentNode = walker.root;
		walker.nextNode();
	}
	if (walker.currentNode && walker.currentNode != walker.root) walker.currentNode.focus();
	

	function acceptNode(node) {
		if (node.localName in allowedTags)
			return NodeFilter.FILTER_ACCEPT;
		else
			NodeFilter.FILTER_SKIP;
	}
	*/

	

})();