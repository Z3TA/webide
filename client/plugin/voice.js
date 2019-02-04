(function() {
	/*
		
		Chromium will have issues. You could try:
		
		sudo apt-get install espeak
		chromium-browser http://127.0.0.1:8080 --enable-speech-dispatcher
		
		or use Firefox.
		
	*/
	"use strict";
	
	if(!QUERY_STRING["voice"]) console.warn("Voice aid not enabled because no voice in query-string!");
	
	
	if (!('speechSynthesis' in window)) {
		console.warn("Speech Synthesis not possible in your browser!");
		return;
	}
	
	var lastRow = 0;
	var lastCol = 0;
	var lastTime = new Date();
	var lastFile = EDITOR.currentFile;
	var aboutToSay;
	
	EDITOR.plugin({
		desc: "Speech Synthesis",
		load: function loadVoicePlugin() {
			
			console.log("Loading " + this.desc + " ...");
			
			var key_M = 77;
			
			EDITOR.bindKey({desc: "Say something", charCode: key_M, combo: ALT, fun: test}); // Alt + M
			
			EDITOR.on("moveCaret", speakMoveCaret);
			
		},
		unload: function unloadVoicePlugin() {
			
			EDITOR.unbindKey(test);
			
		}
	});
	
	function changeFile() {
		var file = UTIL.getFilenameFromPath();
		
	}
	
	function speakMoveCaret(file, caret) {
		
		var msg = "";
		var time = new Date();
		
		clearTimeout(aboutToSay); // Preventing speaking last message
		
		aboutToSay = setTimeout(function() {
			
		if(caret.row != lastRow) add("line " + (parseInt(caret.row) +1) + ", ");
		
		
			// Say char or word
			var char = file.text.charAt(caret.index).toString("utf-8");
			var charToTheLeft = file.text.charAt(caret.index-1);
			
			console.log("char=" + char + " is a non-letter-character ? " + (char.match(/W/)) );
			
			if(char == " ") add("space");
			else if(char.match(/W/)) {
				console.log("Non word character: " + char);
				//add("spec.");
				if(char == "_") add("underscore");
				else if(char == "(") add("left parenthesis");
				else if(char == ")") add("right parenthesis");
				else if(char == "{") add("left bird-wing");
				else if(char == "}") add("right bird-wing");
				else if(char == "[") add("left clammer");
				else if(char == "]") add("right clammer");
				else if(char == "/") add("slash");
				else if(char == "\\") add("back-slash");
				else if(char == "!") add("bang");
				else if(char == "?") add("questionmark");
				else if(char == ".") add("dot");
				else if(char == "=") add("equal");
				else if(char == "+") add("plus");
				else if(char == "-") add("minus");
				else if(char == "&") add("and");
				else if(char == "|") add("or");
				else if(char == ">") add("right arrow");
				else if(char == "<") add("left arrow");
				else if(char == "'") add("single quote");
				else if(char == '"') add("double quote");
				else if(char == "@") add("at");
				else if(char == "#") add("hashtag");
				else throw new Error("Unknown character: char=" + char);
			}
		else if(charToTheLeft.match(/\W/) || caret.col == 0) {
			console.log("get word caret.index=" + caret.index + " char=" + char + " ...");
			var word = "";
			for (var i=caret.index, char; i<file.text.length; i++) {
				char = file.text.charAt(i)
				if(char.match(/\s/)) {
					console.log("Space at index=" + i);
					break;
				}
				console.log("char=" + char + " at index=" + i);
				word += char;
			}
			add(word);
		}
			else add(char);
			
		
		if(caret.eol) add("End of line");
		if(caret.eof) add("End of file!");
		
		
			speak(msg);
		
		}, 3); // To Preventing speak when moving fast
		
		lastRow = caret.row;
		lastCol = caret.col;
		
		return true;
		
		function add(str) {
			if(msg.length != 0) msg += " ";
			msg += str;
			console.log("say:add:" + str);
		}
		
	}
	
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
	
	function speak(text, rate) {
		
		console.log("speak: text=" + text);
		
		window.speechSynthesis.cancel(); // Stop ongoing speach
		
		// Prevent current text from canceling
		setTimeout(function() {
			
			if(text == undefined) throw new Error("No text! text=" + text);
			
			if(rate !== undefined) {
				if(rate < 0.1) throw new Error("Lowest rate is 0.1");
				if(rate > 10) throw new Error("Highest rate is 10");
			}
			
			console.log("Speaking: text=" + text);
			
			var msg = new SpeechSynthesisUtterance(text);
			
			msg.volume = 1; // 0 to 1
			msg.rate = rate || 1; // 0.1 to 10
			msg.pitch = 2; //0 to 2
			msg.text = text;
			msg.lang = 'en-US';
			
			msg.onend = function(e) {
				console.log('Finished speak in ' + e.elapsedTime + ' seconds.');
			};
			
			window.speechSynthesis.speak(msg);
			
		}, 1);
		
	}
	
	
})();
