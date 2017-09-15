(function() {
	
	"use strict";
	
	if (!('speechSynthesis' in window)) {
		console.warn("Speech Synthesis not possible in your browser!");
		return;
	}
	
	EDITOR.plugin({
		desc: "Speech Synthesis",
		load: function loadVoicePlugin() {
			
			var key_M = 77;
			
			EDITOR.bindKey({desc: "Say something", charCode: key_M, combo: CTRL, fun: test}); // Ctrl + M
			
		},
		unload: function unloadVoicePlugin() {
			
			EDITOR.unbindKey(test);
			
		}
	});
	
	function test() {
		
		console.log("Testing Speech Synthesis ...");
		//var msg = new SpeechSynthesisUtterance('Hello World');
		//window.speechSynthesis.speak(msg);
		
		
		var msg = new SpeechSynthesisUtterance("Test!");
		var voices = window.speechSynthesis.getVoices();
		msg.voice = voices[10]; // Note: some voices don't support altering params
		msg.voiceURI = 'native';
		msg.volume = 1; // 0 to 1
		msg.rate = 1; // 0.1 to 10
		msg.pitch = 2; //0 to 2
		msg.text = 'Hello World';
		msg.lang = 'en-US';
		
		msg.onend = function(e) {
			console.log('Finished in ' + e.elapsedTime + ' seconds.');
		};
		
		window.speechSynthesis.speak(msg);
		
		
		
		return false;
	}
	
})();
	