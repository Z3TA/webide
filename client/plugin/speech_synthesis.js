(function() {
	"use strict";
	
	/*
		Deprecated ? in favor for voice.js
	*/
	
	EDITOR.plugin({
		desc: "Will speak whats on the line",
		load: load,
		unload: unload,
	});
	
	function load() {
		// Called when the module is loaded
		if('speechSynthesis' in window){
			var speech = new SpeechSynthesisUtterance('hello baby');
			speech.lang = 'en-US';
			window.speechSynthesis.speak(speech);
			alert("You should here a sound!");
		}
		else alert("speechSynthesis not available!");
		
	}
	
	function unload() {
		
	}
	
	
})();


